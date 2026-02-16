"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { getCustomMonthRangeForMonth } from "@/lib/date-helpers";

export async function createExpense(data: {
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  jarType?: string;
  paymentMethod?: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  tags?: string[];
  notes?: string;
  location?: string;
  isRecurring?: boolean;
  recurrenceRule?: Prisma.InputJsonValue;
}) {
  const user = await requireAuth();

  await prisma.expense.create({
    data: {
      userId: user.id,
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      date: new Date(data.date),
      jarType: data.jarType || null,
      paymentMethod: data.paymentMethod || "pix",
      installmentCurrent: data.installmentCurrent || null,
      installmentTotal: data.installmentTotal || null,
      tags: data.tags || [],
      notes: data.notes || null,
      location: data.location || null,
      isRecurring: data.isRecurring || false,
      recurrenceRule: data.recurrenceRule ?? undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function createIncome(data: {
  amount: number;
  description: string;
  sourceId: string;
  date: string;
  tags?: string[];
  notes?: string;
  isRecurring?: boolean;
}) {
  const user = await requireAuth();

  await prisma.income.create({
    data: {
      userId: user.id,
      amount: data.amount,
      description: data.description,
      sourceId: data.sourceId,
      date: new Date(data.date),
      tags: data.tags || [],
      notes: data.notes || null,
      isRecurring: data.isRecurring || false,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateExpense(
  id: string,
  data: {
    amount: number;
    description: string;
    categoryId: string;
    date: string;
    jarType?: string;
    paymentMethod?: string;
    installmentCurrent?: number;
    installmentTotal?: number;
    tags?: string[];
    notes?: string;
    location?: string;
    isRecurring?: boolean;
    recurrenceRule?: Prisma.InputJsonValue;
  }
) {
  const user = await requireAuth();

  await prisma.expense.update({
    where: { id, userId: user.id },
    data: {
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      date: new Date(data.date),
      jarType: data.jarType || null,
      paymentMethod: data.paymentMethod || "pix",
      installmentCurrent: data.installmentCurrent || null,
      installmentTotal: data.installmentTotal || null,
      tags: data.tags || [],
      notes: data.notes || null,
      location: data.location || null,
      isRecurring: data.isRecurring || false,
      recurrenceRule: data.recurrenceRule ?? undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateIncome(
  id: string,
  data: {
    amount: number;
    description: string;
    sourceId: string;
    date: string;
    tags?: string[];
    notes?: string;
    isRecurring?: boolean;
  }
) {
  const user = await requireAuth();

  await prisma.income.update({
    where: { id, userId: user.id },
    data: {
      amount: data.amount,
      description: data.description,
      sourceId: data.sourceId,
      date: new Date(data.date),
      tags: data.tags || [],
      notes: data.notes || null,
      isRecurring: data.isRecurring || false,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const user = await requireAuth();

  await prisma.expense.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteIncome(id: string) {
  const user = await requireAuth();

  await prisma.income.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export async function getTransactions(params: {
  month?: number;
  year?: number;
  categoryId?: string;
  search?: string;
  type?: "all" | "income" | "expense";
  paymentMethod?: string;
  page?: number;
  limit?: number;
}) {
  const user = await requireAuth();
  const {
    month,
    year,
    categoryId,
    search,
    type = "all",
    paymentMethod,
    page = 1,
    limit = 50,
  } = params;

  const now = new Date();
  const targetMonth = month ?? now.getMonth() + 1;
  const targetYear = year ?? now.getFullYear();

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    select: { monthStartDay: true },
  });
  const monthStartDay = settings?.monthStartDay ?? 1;
  const { start: monthStart, end: monthEnd } = getCustomMonthRangeForMonth(targetMonth, targetYear, monthStartDay);

  const [expenses, incomes, categories, sources] = await Promise.all([
    type !== "income"
      ? prisma.expense.findMany({
          where: {
            userId: user.id,
            isPaid: true,
            date: { gte: monthStart, lte: monthEnd },
            ...(categoryId ? { categoryId } : {}),
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(search
              ? {
                  description: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                }
              : {}),
          },
          include: { category: true },
          orderBy: { date: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
      : Promise.resolve([]),
    type !== "expense"
      ? prisma.income.findMany({
          where: {
            userId: user.id,
            date: { gte: monthStart, lte: monthEnd },
            ...(search
              ? {
                  description: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                }
              : {}),
          },
          include: { source: true },
          orderBy: { date: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
      : Promise.resolve([]),
    prisma.expenseCategory.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    expenses: expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      amount: Number(e.amount),
      description: e.description,
      date: e.date.toISOString(),
      categoryId: e.categoryId,
      categoryName: e.category.name,
      categoryColor: e.category.color,
      categoryIcon: e.category.icon,
      isFixed: e.isFixed,
      jarType: e.jarType,
      paymentMethod: e.paymentMethod,
      installmentCurrent: e.installmentCurrent,
      installmentTotal: e.installmentTotal,
      tags: e.tags,
      notes: e.notes,
      isRecurring: e.isRecurring,
    })),
    incomes: incomes.map((i) => ({
      id: i.id,
      type: "income" as const,
      amount: Number(i.amount),
      description: i.description,
      date: i.date.toISOString(),
      sourceId: i.sourceId,
      sourceName: i.source.name,
      tags: i.tags,
      notes: i.notes,
      isRecurring: i.isRecurring,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    })),
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
    })),
  };
}
