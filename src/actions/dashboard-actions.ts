"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { startOfDay, endOfDay, subMonths, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";
import { getCustomMonthRange, getCustomPreviousMonthRange } from "@/lib/date-helpers";

export async function getDashboardData() {
  const user = await requireAuth();
  const now = new Date();

  // Step 1: Fetch settings first to get monthStartDay
  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });
  const monthStartDay = settings?.monthStartDay ?? 1;

  // Step 2: Compute date ranges respecting monthStartDay
  const { start: monthStart, end: monthEnd } = getCustomMonthRange(now, monthStartDay);
  const { start: prevMonthStart, end: prevMonthEnd } = getCustomPreviousMonthRange(now, monthStartDay);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Step 3: Run main queries
  const [
    monthExpenses,
    monthIncomes,
    todayExpenses,
    todayIncomes,
    goals,
    recentMonths,
    fixedTemplates,
    prevMonthIncomeAgg,
    prevMonthExpenseAgg,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
      include: { source: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: todayStart, lte: todayEnd } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: todayStart, lte: todayEnd } },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, isCompleted: false },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.monthSnapshot.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: subMonths(now, 6) },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.fixedExpenseTemplate.findMany({
      where: { userId: user.id, isActive: true },
    }),
    // P2 fix: only aggregate PAID expenses for previous month trends
    prisma.income.aggregate({
      where: { userId: user.id, date: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId: user.id, date: { gte: prevMonthStart, lte: prevMonthEnd }, isPaid: true },
      _sum: { amount: true },
    }),
  ]);

  const initialBalance = Number(settings?.initialBalance || 0);

  // P2 fix: separate paid vs pending expenses
  const paidExpenses = monthExpenses.filter((e) => e.isPaid);
  const pendingExpenses = monthExpenses.filter((e) => !e.isPaid);

  const totalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  // Only count PAID expenses in the main balance
  const totalExpenses = paidExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const totalPending = pendingExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Monthly-based saldo geral: initialBalance + month income - month paid expenses
  const cumulativeBalance = initialBalance + totalIncome - totalExpenses;

  // Previous month data for trends
  const prevIncome = Number(prevMonthIncomeAgg._sum.amount || 0);
  const prevExpenses = Number(prevMonthExpenseAgg._sum.amount || 0);

  const trends = {
    incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null,
    expenseChange: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : null,
  };

  // Expense breakdown by category (only paid)
  const expenseByCategoryMap: Record<string, { name: string; amount: number; color: string | null }> = {};
  for (const expense of paidExpenses) {
    const catName = expense.category.name;
    if (!expenseByCategoryMap[catName]) {
      expenseByCategoryMap[catName] = { name: catName, amount: 0, color: expense.category.color };
    }
    expenseByCategoryMap[catName].amount += Number(expense.amount);
  }
  const expenseByCategory = Object.values(expenseByCategoryMap)
    .sort((a, b) => b.amount - a.amount);

  // Income breakdown by source
  const incomeBySourceMap: Record<string, { name: string; amount: number }> = {};
  for (const income of monthIncomes) {
    const srcName = income.source.name;
    if (!incomeBySourceMap[srcName]) {
      incomeBySourceMap[srcName] = { name: srcName, amount: 0 };
    }
    incomeBySourceMap[srcName].amount += Number(income.amount);
  }
  const incomeBreakdown = Object.values(incomeBySourceMap)
    .sort((a, b) => b.amount - a.amount);

  // Jar balances (only paid expenses)
  const jarBalances: Record<string, number> = {};
  let allocatedToJars = 0;
  for (const expense of paidExpenses) {
    if (expense.jarType) {
      jarBalances[expense.jarType] =
        (jarBalances[expense.jarType] || 0) + Number(expense.amount);
      allocatedToJars += Number(expense.amount);
    }
  }
  // P5: Track unallocated expenses (paid expenses without jarType)
  const unallocatedExpenses = totalExpenses - allocatedToJars;

  // Daily expenses for month pulse chart (only paid)
  const dailyExpenses: Record<number, number> = {};
  for (const expense of paidExpenses) {
    const day = expense.date.getDate();
    dailyExpenses[day] = (dailyExpenses[day] || 0) + Number(expense.amount);
  }

  // Fixed expenses due this month (check which are already paid)
  const fixedExpensesDue = fixedTemplates.map((template) => {
    const isPaid = monthExpenses.some(
      (e) =>
        e.isFixed &&
        e.description === template.name &&
        e.categoryId === template.categoryId &&
        e.isPaid
    );
    return {
      name: template.name,
      amount: Number(template.amount),
      dueDay: template.dueDay,
      isPaid,
    };
  });

  // Cashflow: prefer MonthSnapshots, fallback to computed from transactions
  let cashflow = recentMonths.map((s) => ({
    month: s.month,
    year: s.year,
    income: Number(s.totalIncome),
    expenses: Number(s.totalExpenses),
  }));

  if (cashflow.length === 0) {
    const sixMonthsAgo = subMonths(now, 5);
    const fallbackStart = startOfMonth(sixMonthsAgo);

    const [fallbackIncomes, fallbackExpenses] = await Promise.all([
      prisma.income.findMany({
        where: { userId: user.id, date: { gte: fallbackStart, lte: monthEnd } },
        select: { amount: true, date: true },
      }),
      prisma.expense.findMany({
        where: { userId: user.id, date: { gte: fallbackStart, lte: monthEnd }, isPaid: true },
        select: { amount: true, date: true },
      }),
    ]);

    const monthMap: Record<string, { month: number; year: number; income: number; expenses: number }> = {};
    for (const inc of fallbackIncomes) {
      const key = `${inc.date.getFullYear()}-${inc.date.getMonth() + 1}`;
      if (!monthMap[key]) monthMap[key] = { month: inc.date.getMonth() + 1, year: inc.date.getFullYear(), income: 0, expenses: 0 };
      monthMap[key].income += Number(inc.amount);
    }
    for (const exp of fallbackExpenses) {
      const key = `${exp.date.getFullYear()}-${exp.date.getMonth() + 1}`;
      if (!monthMap[key]) monthMap[key] = { month: exp.date.getMonth() + 1, year: exp.date.getFullYear(), income: 0, expenses: 0 };
      monthMap[key].expenses += Number(exp.amount);
    }
    cashflow = Object.values(monthMap).sort((a, b) => a.year - b.year || a.month - b.month);
  }

  return {
    totalIncome,
    totalExpenses,
    totalPending,
    balance,
    savingsRate,
    cumulativeBalance,
    initialBalance,
    trends,
    balanceExplainer: {
      initialBalance,
      monthIncome: totalIncome,
      monthExpenses: totalExpenses,
    },
    expenseByCategory,
    incomeBreakdown,
    jarRules: (settings?.jarRulesJson || {}) as Record<string, number>,
    jarBalances,
    unallocatedExpenses,
    todayExpenses: todayExpenses
      .filter((e) => e.isPaid)
      .map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        description: e.description,
        category: e.category.name,
        categoryColor: e.category.color,
        type: "expense" as const,
        time: e.createdAt,
      })),
    todayIncomes: todayIncomes.map((i) => ({
      id: i.id,
      amount: Number(i.amount),
      description: i.description,
      source: i.source.name,
      type: "income" as const,
      time: i.createdAt,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      color: g.color,
      icon: g.icon,
    })),
    dailyExpenses,
    cashflow,
    fixedExpensesDue,
    daysInMonth: getDaysInMonth(now),
    currentDay: now.getDate(),
  };
}
