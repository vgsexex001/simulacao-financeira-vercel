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

  const [
    settings,
    monthExpenses,
    monthIncomes,
    todayExpenses,
    todayIncomes,
    goals,
    recentMonths,
    fixedTemplates,
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
  ]);

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

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    initialBalance: Number(settings?.initialBalance || 0),
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
    cashflow: recentMonths.map((s) => ({
      month: s.month,
      year: s.year,
      income: Number(s.totalIncome),
      expenses: Number(s.totalExpenses),
    })),
    // SmartAlerts data
    fixedExpensesDue,
    daysInMonth: getDaysInMonth(now),
    currentDay: now.getDate(),
  };
}
