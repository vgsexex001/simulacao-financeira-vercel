"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { getCustomMonthRange } from "@/lib/date-helpers";

export async function getFixedExpenses() {
  const user = await requireAuth();

  const templates = await prisma.fixedExpenseTemplate.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { dueDay: "asc" },
  });

  const categories = await prisma.expenseCategory.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return {
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      amount: Number(t.amount),
      dueDay: t.dueDay,
      isActive: t.isActive,
      categoryId: t.categoryId,
      categoryName: t.category.name,
      categoryColor: t.category.color,
      categoryIcon: t.category.icon,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    })),
  };
}

export async function createFixedTemplate(data: {
  name: string;
  amount: number;
  dueDay: number;
  categoryId: string;
}) {
  const user = await requireAuth();

  await prisma.fixedExpenseTemplate.create({
    data: {
      userId: user.id,
      name: data.name,
      amount: data.amount,
      dueDay: data.dueDay,
      categoryId: data.categoryId,
    },
  });

  revalidatePath("/fixed-expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateFixedTemplate(
  id: string,
  data: {
    name?: string;
    amount?: number;
    dueDay?: number;
    categoryId?: string;
    isActive?: boolean;
  }
) {
  const user = await requireAuth();

  await prisma.fixedExpenseTemplate.update({
    where: { id, userId: user.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.dueDay !== undefined && { dueDay: data.dueDay }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  revalidatePath("/fixed-expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteFixedTemplate(id: string) {
  const user = await requireAuth();

  await prisma.fixedExpenseTemplate.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/fixed-expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getFixedExpenseHistory(templateName: string, categoryId: string) {
  const user = await requireAuth();

  // Get last 12 months of payments for this fixed expense
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const payments = await prisma.expense.findMany({
    where: {
      userId: user.id,
      isFixed: true,
      description: templateName,
      categoryId,
      date: { gte: twelveMonthsAgo },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      amount: true,
      date: true,
      isPaid: true,
    },
  });

  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    date: p.date.toISOString(),
    isPaid: p.isPaid,
    month: p.date.getMonth() + 1,
    year: p.date.getFullYear(),
  }));
}

export async function autoRegisterFixedExpenses() {
  const user = await requireAuth();

  const now = new Date();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  const monthStartDay = settings?.monthStartDay ?? 1;
  const { start: monthStart, end: monthEnd } = getCustomMonthRange(now, monthStartDay);

  const activeTemplates = await prisma.fixedExpenseTemplate.findMany({
    where: { userId: user.id, isActive: true },
  });

  // Find expenses already created from fixed templates this month
  const existingFixed = await prisma.expense.findMany({
    where: {
      userId: user.id,
      isFixed: true,
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { description: true, categoryId: true },
  });

  const existingKeys = new Set(
    existingFixed.map((e) => `${e.description.toLowerCase()}::${e.categoryId}`)
  );

  let created = 0;

  for (const template of activeTemplates) {
    const key = `${template.name.toLowerCase()}::${template.categoryId}`;
    if (existingKeys.has(key)) continue;

    const dueDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      Math.min(template.dueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
    );

    await prisma.expense.create({
      data: {
        userId: user.id,
        categoryId: template.categoryId,
        amount: template.amount,
        description: template.name,
        date: dueDate,
        isFixed: true,
        isPaid: false,
      },
    });

    created++;
  }

  revalidatePath("/fixed-expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true, created };
}
