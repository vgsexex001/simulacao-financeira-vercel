"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getJarData(params?: { month?: number; year?: number }) {
  const user = await requireAuth();

  const now = new Date();
  const targetMonth = params?.month ?? now.getMonth() + 1;
  const targetYear = params?.year ?? now.getFullYear();
  const monthStart = startOfMonth(new Date(targetYear, targetMonth - 1));
  const monthEnd = endOfMonth(new Date(targetYear, targetMonth - 1));

  const [settings, monthExpenses, monthIncomes] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: user.id } }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
    }),
    prisma.income.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
    }),
  ]);

  const jarRules = (settings?.jarRulesJson || {
    necessities: 55,
    education: 10,
    savings: 10,
    play: 10,
    investment: 10,
    giving: 5,
  }) as Record<string, number>;

  const totalIncome = monthIncomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );

  // Aggregate expenses by jarType
  const jarBalances: Record<string, number> = {};
  for (const expense of monthExpenses) {
    if (expense.jarType) {
      jarBalances[expense.jarType] =
        (jarBalances[expense.jarType] || 0) + Number(expense.amount);
    }
  }

  return {
    jarRules,
    jarBalances,
    totalIncome,
    month: targetMonth,
    year: targetYear,
  };
}

export async function getJarDetail(jarType: string) {
  const user = await requireAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Current month transactions for this jar
  const transactions = await prisma.expense.findMany({
    where: {
      userId: user.id,
      jarType,
      date: { gte: monthStart, lte: monthEnd },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  // Last 6 months history for this jar
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyStart = startOfMonth(sixMonthsAgo);

  const historicalExpenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      jarType,
      date: { gte: monthlyStart, lte: monthEnd },
    },
    select: { amount: true, date: true },
  });

  // Aggregate by month
  const monthlyHistory: Array<{ month: number; year: number; spent: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const spent = historicalExpenses
      .filter((e) => e.date.getMonth() + 1 === m && e.date.getFullYear() === y)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    monthlyHistory.push({ month: m, year: y, spent });
  }

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      description: t.description,
      date: t.date.toISOString(),
      categoryName: t.category.name,
      categoryColor: t.category.color,
    })),
    monthlyHistory,
  };
}

export async function allocateIncome(data: {
  amount: number;
  allocations: Record<string, number>;
  date?: string;
}) {
  const user = await requireAuth();

  // Get a default category for jar allocation records
  const defaultCategory = await prisma.expenseCategory.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!defaultCategory) {
    return { success: false, error: "Nenhuma categoria encontrada" };
  }

  const targetDate = data.date ? new Date(data.date) : new Date();

  // Create an expense entry for each jar allocation
  await prisma.$transaction(
    Object.entries(data.allocations)
      .filter(([, amount]) => amount > 0)
      .map(([jarType, amount]) =>
        prisma.expense.create({
          data: {
            userId: user.id,
            categoryId: defaultCategory.id,
            amount,
            description: `Alocação de receita`,
            date: targetDate,
            jarType,
          },
        })
      )
  );

  revalidatePath("/jars");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function transferBetweenJars(data: {
  sourceJar: string;
  targetJar: string;
  amount: number;
}) {
  const user = await requireAuth();

  if (data.amount <= 0) {
    return { success: false, error: "Valor deve ser positivo" };
  }

  if (data.sourceJar === data.targetJar) {
    return { success: false, error: "Jarros de origem e destino devem ser diferentes" };
  }

  const defaultCategory = await prisma.expenseCategory.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!defaultCategory) {
    return { success: false, error: "Nenhuma categoria encontrada" };
  }

  const now = new Date();

  // Negative expense on source (reduces spending on that jar = frees budget)
  // Positive expense on target (adds spending to that jar = consumes budget)
  await prisma.$transaction([
    prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: defaultCategory.id,
        amount: -data.amount,
        description: `Transferência para outro jarro`,
        date: now,
        jarType: data.sourceJar,
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: defaultCategory.id,
        amount: data.amount,
        description: `Transferência de outro jarro`,
        date: now,
        jarType: data.targetJar,
      },
    }),
  ]);

  revalidatePath("/jars");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateJarRules(rules: Record<string, number>) {
  const user = await requireAuth();

  const total = Object.values(rules).reduce((a, b) => a + b, 0);
  if (total !== 100) {
    return { success: false, error: `A soma das porcentagens deve ser 100% (atual: ${total}%)` };
  }

  await prisma.userSettings.update({
    where: { userId: user.id },
    data: { jarRulesJson: rules },
  });

  revalidatePath("/jars");
  revalidatePath("/dashboard");
  return { success: true };
}
