"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
} from "date-fns";

// ---------- Monthly Analytics ----------

export async function getMonthlyAnalytics(month: number, year: number) {
  const user = await requireAuth();

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
      orderBy: { amount: "desc" },
    }),
    prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { source: true },
    }),
  ]);

  // Category breakdown for donut chart
  const categoryMap: Record<
    string,
    { name: string; color: string; total: number }
  > = {};
  for (const expense of expenses) {
    const key = expense.categoryId;
    if (!categoryMap[key]) {
      categoryMap[key] = {
        name: expense.category.name,
        color: expense.category.color || "#64748b",
        total: 0,
      };
    }
    categoryMap[key].total += Number(expense.amount);
  }

  const categoryBreakdown = Object.values(categoryMap)
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      name: c.name,
      value: c.total,
      color: c.color,
    }));

  // Daily spending
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dailyMap: Record<string, number> = {};
  for (const day of days) {
    dailyMap[format(day, "dd")] = 0;
  }
  for (const expense of expenses) {
    const dayKey = format(expense.date, "dd");
    dailyMap[dayKey] = (dailyMap[dayKey] || 0) + Number(expense.amount);
  }
  const dailySpending = Object.entries(dailyMap).map(([day, total]) => ({
    day,
    total,
  }));

  // Top expenses
  const topExpenses = expenses.slice(0, 10).map((e) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    category: e.category.name,
    categoryColor: e.category.color || "#64748b",
    date: e.date.toISOString(),
  }));

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);

  // Daily expenses map for heatmap
  const dailyExpensesMap: Record<number, number> = {};
  for (const expense of expenses) {
    const day = expense.date.getDate();
    dailyExpensesMap[day] = (dailyExpensesMap[day] || 0) + Number(expense.amount);
  }

  return {
    categoryBreakdown,
    dailySpending,
    topExpenses,
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    dailyExpensesMap,
  };
}

// ---------- Annual Analytics ----------

export async function getAnnualAnalytics(year: number) {
  const user = await requireAuth();

  const yearStart = startOfYear(new Date(year, 0));
  const yearEnd = endOfYear(new Date(year, 11));

  const [expenses, incomes, snapshots] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: yearStart, lte: yearEnd },
      },
      include: { category: true },
    }),
    prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: yearStart, lte: yearEnd },
      },
    }),
    prisma.monthSnapshot.findMany({
      where: { userId: user.id, year },
      orderBy: [{ month: "asc" }],
    }),
  ]);

  // Build month-by-month data (1-12)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const snapshot = snapshots.find((s) => s.month === month);

    if (snapshot) {
      return {
        month,
        income: Number(snapshot.totalIncome),
        expenses: Number(snapshot.totalExpenses),
        balance: Number(snapshot.balance),
      };
    }

    // Calculate from raw data if no snapshot
    const monthIncome = incomes
      .filter((inc) => inc.date.getMonth() + 1 === month)
      .reduce((sum, inc) => sum + Number(inc.amount), 0);

    const monthExpenses = expenses
      .filter((exp) => exp.date.getMonth() + 1 === month)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    return {
      month,
      income: monthIncome,
      expenses: monthExpenses,
      balance: monthIncome - monthExpenses,
    };
  });

  // Category trends - how each category performed per month
  const categoryTrendMap: Record<
    string,
    { name: string; color: string; months: number[] }
  > = {};

  for (const expense of expenses) {
    const catName = expense.category.name;
    if (!categoryTrendMap[catName]) {
      categoryTrendMap[catName] = {
        name: catName,
        color: expense.category.color || "#64748b",
        months: new Array(12).fill(0),
      };
    }
    const monthIdx = expense.date.getMonth();
    categoryTrendMap[catName].months[monthIdx] += Number(expense.amount);
  }

  const categoryTrends = Object.values(categoryTrendMap).sort(
    (a, b) =>
      b.months.reduce((s, v) => s + v, 0) -
      a.months.reduce((s, v) => s + v, 0)
  );

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);

  return {
    monthlyData,
    categoryTrends,
    totalIncome,
    totalExpenses,
    annualBalance: totalIncome - totalExpenses,
  };
}

// ---------- Auto-categorization ----------

export async function suggestCategory(description: string) {
  const user = await requireAuth();

  if (!description || description.length < 2) return null;

  // Find past expenses with similar descriptions
  const pastExpenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      description: { contains: description, mode: "insensitive" },
    },
    select: { categoryId: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (pastExpenses.length === 0) return null;

  // Count category occurrences and pick the most common
  const counts: Record<string, number> = {};
  for (const e of pastExpenses) {
    counts[e.categoryId] = (counts[e.categoryId] || 0) + 1;
  }

  const topCategoryId = Object.entries(counts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  return topCategoryId;
}

// ---------- What-If Scenarios ----------

export async function getWhatIfData() {
  const user = await requireAuth();
  const now = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [expenses, incomes, settings, goals] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: threeMonthsAgo, lte: now } },
      include: { category: true },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: threeMonthsAgo, lte: now } },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.goal.findMany({
      where: { userId: user.id, isCompleted: false },
    }),
  ]);

  // Calculate monthly averages
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const avgMonthlyIncome = totalIncome / 3;
  const avgMonthlyExpenses = totalExpenses / 3;

  // Category averages
  const categoryAvgs: Record<string, { name: string; color: string; avgMonthly: number }> = {};
  for (const e of expenses) {
    const key = e.categoryId;
    if (!categoryAvgs[key]) {
      categoryAvgs[key] = {
        name: e.category.name,
        color: e.category.color || "#64748b",
        avgMonthly: 0,
      };
    }
    categoryAvgs[key].avgMonthly += Number(e.amount) / 3;
  }

  return {
    avgMonthlyIncome,
    avgMonthlyExpenses,
    monthlySavings: avgMonthlyIncome - avgMonthlyExpenses,
    categories: Object.entries(categoryAvgs)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.avgMonthly - a.avgMonthly),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      remaining: Number(g.targetAmount) - Number(g.currentAmount),
    })),
    initialBalance: Number(settings?.initialBalance || 0),
  };
}

// ---------- Comparison Data ----------

export async function getComparisonData(month: number, year: number) {
  const user = await requireAuth();

  // Current month
  const currentStart = startOfMonth(new Date(year, month - 1));
  const currentEnd = endOfMonth(new Date(year, month - 1));

  // Previous month
  const prevDate = new Date(year, month - 2);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();
  const prevStart = startOfMonth(prevDate);
  const prevEnd = endOfMonth(prevDate);

  // Last 6 months for trends
  const sixMonthsAgo = new Date(year, month - 7);
  const trendStart = startOfMonth(sixMonthsAgo);

  const [currentExpenses, prevExpenses, trendExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: currentStart, lte: currentEnd } },
      include: { category: true },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: prevStart, lte: prevEnd } },
      include: { category: true },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: trendStart, lte: currentEnd } },
      include: { category: true },
    }),
  ]);

  function aggregateByCategory(expenses: typeof currentExpenses) {
    const map: Record<string, { name: string; color: string; total: number }> = {};
    for (const e of expenses) {
      const key = e.category.name;
      if (!map[key]) {
        map[key] = { name: key, color: e.category.color || "#64748b", total: 0 };
      }
      map[key].total += Number(e.amount);
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  // Category trends (6 months)
  const trendMap: Record<string, { name: string; color: string; months: Array<{ month: number; value: number }> }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const mStart = startOfMonth(d);
    const mEnd = endOfMonth(d);

    for (const e of trendExpenses) {
      if (e.date >= mStart && e.date <= mEnd) {
        const catName = e.category.name;
        if (!trendMap[catName]) {
          trendMap[catName] = {
            name: catName,
            color: e.category.color || "#64748b",
            months: [],
          };
        }
        const existing = trendMap[catName].months.find((x) => x.month === m);
        if (existing) {
          existing.value += Number(e.amount);
        } else {
          trendMap[catName].months.push({ month: m, value: Number(e.amount) });
        }
      }
    }

    // Ensure all categories have all 6 months
    for (const cat of Object.values(trendMap)) {
      if (!cat.months.find((x) => x.month === m)) {
        cat.months.push({ month: m, value: 0 });
      }
    }
  }

  // Sort each category's months chronologically
  for (const cat of Object.values(trendMap)) {
    cat.months.sort((a, b) => a.month - b.month);
  }

  return {
    currentMonth: {
      month,
      year,
      categories: aggregateByCategory(currentExpenses),
    },
    previousMonth: {
      month: prevMonth,
      year: prevYear,
      categories: aggregateByCategory(prevExpenses),
    },
    categoryTrends: Object.values(trendMap)
      .sort((a, b) => {
        const totalA = a.months.reduce((s, m) => s + m.value, 0);
        const totalB = b.months.reduce((s, m) => s + m.value, 0);
        return totalB - totalA;
      })
      .slice(0, 8),
  };
}

// ---------- Anomaly Detection ----------

export async function detectAnomalies() {
  const user = await requireAuth();
  const now = new Date();

  // Current month
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);

  // Last 3 months (before current)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const historicalStart = startOfMonth(threeMonthsAgo);
  const historicalEnd = startOfMonth(now); // Exclusive of current month

  const [currentExpenses, historicalExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: currentStart, lte: currentEnd } },
      include: { category: true },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: historicalStart, lt: historicalEnd } },
      include: { category: true },
    }),
  ]);

  // Calculate 3-month average per category
  const historicalAvg: Record<string, { name: string; color: string; avg: number }> = {};
  for (const e of historicalExpenses) {
    const catName = e.category.name;
    if (!historicalAvg[catName]) {
      historicalAvg[catName] = { name: catName, color: e.category.color || "#64748b", avg: 0 };
    }
    historicalAvg[catName].avg += Number(e.amount) / 3;
  }

  // Current month per category
  const currentByCategory: Record<string, number> = {};
  for (const e of currentExpenses) {
    const catName = e.category.name;
    currentByCategory[catName] = (currentByCategory[catName] || 0) + Number(e.amount);
  }

  // Detect anomalies: current > 2x average
  const anomalies: Array<{
    category: string;
    color: string;
    currentAmount: number;
    averageAmount: number;
    ratio: number;
  }> = [];

  for (const [catName, data] of Object.entries(historicalAvg)) {
    const current = currentByCategory[catName] || 0;
    if (data.avg > 0 && current > data.avg * 2) {
      anomalies.push({
        category: catName,
        color: data.color,
        currentAmount: current,
        averageAmount: data.avg,
        ratio: current / data.avg,
      });
    }
  }

  return anomalies.sort((a, b) => b.ratio - a.ratio);
}

// ---------- Projection Data ----------

export async function getProjectionData() {
  const user = await requireAuth();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [settings, fixedTemplates, recentIncomes] = await Promise.all([
    prisma.userSettings.findUnique({
      where: { userId: user.id },
    }),
    prisma.fixedExpenseTemplate.findMany({
      where: { userId: user.id, isActive: true },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: threeMonthsAgo } },
    }),
  ]);

  const totalFixed = fixedTemplates.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const totalRecentIncome = recentIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const monthsCount = recentIncomes.length > 0 ? 3 : 1;
  const averageIncome = Math.round(totalRecentIncome / monthsCount);

  return {
    initialBalance: Number(settings?.initialBalance || 0),
    fixedExpensesFromDB: totalFixed,
    fixedTemplates: fixedTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      amount: Number(t.amount),
    })),
    averageIncome,
  };
}
