"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getMonthlyReport(month: number, year: number) {
  const user = await requireAuth();
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const [expenses, incomes, settings] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { source: true },
      orderBy: { date: "desc" },
    }),
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Group expenses by category
  const byCategory: Record<
    string,
    { name: string; color: string | null; total: number; count: number }
  > = {};
  for (const expense of expenses) {
    const cat = expense.category;
    if (!byCategory[cat.id]) {
      byCategory[cat.id] = {
        name: cat.name,
        color: cat.color,
        total: 0,
        count: 0,
      };
    }
    byCategory[cat.id].total += Number(expense.amount);
    byCategory[cat.id].count += 1;
  }

  // Group expenses by jar
  const byJar: Record<string, { total: number; count: number }> = {};
  for (const expense of expenses) {
    const jar = expense.jarType || "sem_jarra";
    if (!byJar[jar]) {
      byJar[jar] = { total: 0, count: 0 };
    }
    byJar[jar].total += Number(expense.amount);
    byJar[jar].count += 1;
  }

  return {
    month,
    year,
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    jarRules: (settings?.jarRulesJson || {}) as Record<string, number>,
    byCategory: Object.entries(byCategory)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        categoryColor: data.color,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total),
    byJar: Object.entries(byJar)
      .map(([jar, data]) => ({
        jar,
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total),
    expenses: expenses.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      description: e.description,
      date: e.date.toISOString(),
      categoryName: e.category.name,
      jarType: e.jarType,
    })),
    incomes: incomes.map((i) => ({
      id: i.id,
      amount: Number(i.amount),
      description: i.description,
      date: i.date.toISOString(),
      sourceName: i.source.name,
    })),
  };
}

export async function getAnnualReport(year: number) {
  const user = await requireAuth();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [expenses, incomes, snapshots] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: yearStart, lte: yearEnd },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: yearStart, lte: yearEnd },
      },
      include: { source: true },
      orderBy: { date: "desc" },
    }),
    prisma.monthSnapshot.findMany({
      where: {
        userId: user.id,
        year,
      },
      orderBy: { month: "asc" },
    }),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

  // Monthly breakdown
  const monthlyData: Array<{
    month: number;
    income: number;
    expenses: number;
    balance: number;
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const snapshot = snapshots.find((s) => s.month === m);
    if (snapshot) {
      monthlyData.push({
        month: m,
        income: Number(snapshot.totalIncome),
        expenses: Number(snapshot.totalExpenses),
        balance: Number(snapshot.balance),
      });
    } else {
      // Compute from raw data
      const mIncome = incomes
        .filter((i) => i.date.getMonth() + 1 === m)
        .reduce((s, i) => s + Number(i.amount), 0);
      const mExpenses = expenses
        .filter((e) => e.date.getMonth() + 1 === m)
        .reduce((s, e) => s + Number(e.amount), 0);
      monthlyData.push({
        month: m,
        income: mIncome,
        expenses: mExpenses,
        balance: mIncome - mExpenses,
      });
    }
  }

  // By category for year
  const byCategory: Record<
    string,
    { name: string; color: string | null; total: number; count: number }
  > = {};
  for (const expense of expenses) {
    const cat = expense.category;
    if (!byCategory[cat.id]) {
      byCategory[cat.id] = {
        name: cat.name,
        color: cat.color,
        total: 0,
        count: 0,
      };
    }
    byCategory[cat.id].total += Number(expense.amount);
    byCategory[cat.id].count += 1;
  }

  return {
    year,
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    monthlyData,
    byCategory: Object.entries(byCategory)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        categoryColor: data.color,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total),
  };
}
