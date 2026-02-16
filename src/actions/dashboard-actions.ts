"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
  getDaysInMonth,
} from "date-fns";

export async function getDashboardData() {
  const user = await requireAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    settings,
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
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
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
    prisma.income.aggregate({
      where: { userId: user.id, date: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { userId: user.id, date: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const initialBalance = Number(settings?.initialBalance || 0);
  const totalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const totalExpenses = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Monthly-based saldo geral: initialBalance + month income - month expenses
  const cumulativeBalance = initialBalance + totalIncome - totalExpenses;

  // Previous month data for trends
  const prevIncome = Number(prevMonthIncomeAgg._sum.amount || 0);
  const prevExpenses = Number(prevMonthExpenseAgg._sum.amount || 0);

  const trends = {
    incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null,
    expenseChange: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : null,
  };

  // Expense breakdown by category
  const expenseByCategoryMap: Record<string, { name: string; amount: number; color: string | null }> = {};
  for (const expense of monthExpenses) {
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

  // Jar balances
  const jarBalances: Record<string, number> = {};
  for (const expense of monthExpenses) {
    if (expense.jarType) {
      jarBalances[expense.jarType] =
        (jarBalances[expense.jarType] || 0) + Number(expense.amount);
    }
  }

  // Daily expenses for month pulse chart
  const dailyExpenses: Record<number, number> = {};
  for (const expense of monthExpenses) {
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
    // Compute fallback from last 6 months of transactions
    const sixMonthsAgo = subMonths(now, 5);
    const fallbackStart = startOfMonth(sixMonthsAgo);

    const [fallbackIncomes, fallbackExpenses] = await Promise.all([
      prisma.income.findMany({
        where: { userId: user.id, date: { gte: fallbackStart, lte: monthEnd } },
        select: { amount: true, date: true },
      }),
      prisma.expense.findMany({
        where: { userId: user.id, date: { gte: fallbackStart, lte: monthEnd } },
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
    todayExpenses: todayExpenses.map((e) => ({
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
    // SmartAlerts data
    fixedExpensesDue,
    daysInMonth: getDaysInMonth(now),
    currentDay: now.getDate(),
  };
}
