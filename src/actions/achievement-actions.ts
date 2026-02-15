"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth } from "date-fns";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number;
  target: number;
}

export async function checkAchievements(): Promise<Achievement[]> {
  const user = await requireAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    monthSnapshots,
    expenseCount,
    incomeCount,
    monthExpenses,
    monthIncomes,
    emergencyGoals,
    firstExpense,
    firstIncome,
  ] = await Promise.all([
    prisma.monthSnapshot.findMany({
      where: { userId: user.id },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.expense.count({
      where: { userId: user.id },
    }),
    prisma.income.count({
      where: { userId: user.id },
    }),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    }),
    prisma.income.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd } },
      select: { amount: true },
    }),
    prisma.goal.findMany({
      where: {
        userId: user.id,
        OR: [
          { type: "emergency_fund" },
          { name: { contains: "emerg", mode: "insensitive" } },
          { name: { contains: "reserva", mode: "insensitive" } },
        ],
      },
      select: { targetAmount: true, currentAmount: true },
    }),
    prisma.expense.findFirst({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.income.findFirst({
      where: { userId: user.id },
      select: { id: true },
    }),
  ]);

  // --- first_positive_month ---
  const hasPositiveMonth = monthSnapshots.some(
    (s) => Number(s.balance) > 0
  );

  // --- three_months_positive ---
  let maxConsecutivePositive = 0;
  let currentStreak = 0;
  for (const snapshot of monthSnapshots) {
    if (Number(snapshot.balance) > 0) {
      currentStreak++;
      if (currentStreak > maxConsecutivePositive) {
        maxConsecutivePositive = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // --- 100_transactions ---
  const totalTransactions = expenseCount + incomeCount;

  // --- savings_20 ---
  const currentMonthIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const currentMonthExpenses = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const currentSavingsRate =
    currentMonthIncome > 0
      ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100
      : 0;

  // --- emergency fund progress ---
  let emergencyProgress = 0;
  let emergencyTarget = 0;
  for (const goal of emergencyGoals) {
    emergencyTarget += Number(goal.targetAmount);
    emergencyProgress += Number(goal.currentAmount);
  }
  const emergencyPercent =
    emergencyTarget > 0
      ? Math.min((emergencyProgress / emergencyTarget) * 100, 100)
      : 0;

  const achievements: Achievement[] = [
    {
      id: "first_expense",
      title: "Primeira Despesa",
      description: "Registrou sua primeira despesa no FinPulse",
      icon: "\uD83D\uDCB8",
      isUnlocked: !!firstExpense,
      progress: firstExpense ? 1 : 0,
      target: 1,
    },
    {
      id: "first_income",
      title: "Primeira Receita",
      description: "Registrou sua primeira receita no FinPulse",
      icon: "\uD83D\uDCB0",
      isUnlocked: !!firstIncome,
      progress: firstIncome ? 1 : 0,
      target: 1,
    },
    {
      id: "first_positive_month",
      title: "No Azul",
      description: "Fechou o primeiro m\u00EAs com saldo positivo",
      icon: "\uD83D\uDCC8",
      isUnlocked: hasPositiveMonth,
      progress: hasPositiveMonth ? 1 : 0,
      target: 1,
    },
    {
      id: "three_months_positive",
      title: "Consist\u00EAncia",
      description: "3 meses consecutivos com saldo positivo",
      icon: "\uD83D\uDD25",
      isUnlocked: maxConsecutivePositive >= 3,
      progress: Math.min(maxConsecutivePositive, 3),
      target: 3,
    },
    {
      id: "100_transactions",
      title: "Centuri\u00E3o",
      description: "Registrou 100 transa\u00E7\u00F5es no total",
      icon: "\uD83D\uDCDA",
      isUnlocked: totalTransactions >= 100,
      progress: Math.min(totalTransactions, 100),
      target: 100,
    },
    {
      id: "savings_20",
      title: "Poupador",
      description: "Taxa de poupan\u00E7a acima de 20% no m\u00EAs atual",
      icon: "\uD83D\uDC37",
      isUnlocked: currentSavingsRate > 20,
      progress: Math.min(Math.round(currentSavingsRate), 100),
      target: 20,
    },
    {
      id: "emergency_25",
      title: "Reserva 25%",
      description: "Alcan\u00E7ou 25% da meta de reserva de emerg\u00EAncia",
      icon: "\uD83D\uDEE1\uFE0F",
      isUnlocked: emergencyPercent >= 25,
      progress: Math.min(Math.round(emergencyPercent), 25),
      target: 25,
    },
    {
      id: "emergency_50",
      title: "Reserva 50%",
      description: "Alcan\u00E7ou 50% da meta de reserva de emerg\u00EAncia",
      icon: "\u26A1",
      isUnlocked: emergencyPercent >= 50,
      progress: Math.min(Math.round(emergencyPercent), 50),
      target: 50,
    },
    {
      id: "emergency_75",
      title: "Reserva 75%",
      description: "Alcan\u00E7ou 75% da meta de reserva de emerg\u00EAncia",
      icon: "\uD83D\uDCAA",
      isUnlocked: emergencyPercent >= 75,
      progress: Math.min(Math.round(emergencyPercent), 75),
      target: 75,
    },
    {
      id: "emergency_100",
      title: "Reserva Completa",
      description: "Completou 100% da reserva de emerg\u00EAncia",
      icon: "\uD83C\uDFC6",
      isUnlocked: emergencyPercent >= 100,
      progress: Math.min(Math.round(emergencyPercent), 100),
      target: 100,
    },
  ];

  return achievements;
}
