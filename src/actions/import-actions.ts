"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

interface TransactionInput {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  category?: string;
  source?: string;
  paymentMethod?: string;
  jarType?: string;
  isFixed?: boolean;
}

export async function importTransactions(data: {
  transactions: TransactionInput[];
}) {
  const user = await requireAuth();

  const { transactions } = data;

  if (!transactions || transactions.length === 0) {
    return { success: false, error: "Nenhuma transacao fornecida" };
  }

  // Fetch all user categories and sources upfront
  const [categories, sources] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.incomeSource.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Auto-create missing categories from imported data
  const hasExpenses = transactions.some((t) => t.type === "expense");
  if (hasExpenses) {
    const existingNames = new Set(categories.map((c) => c.name.toLowerCase()));
    const neededNames = new Set(
      transactions
        .filter((t) => t.type === "expense" && t.category)
        .map((t) => t.category!.trim())
        .filter((name) => name && !existingNames.has(name.toLowerCase()))
    );

    // If no categories exist at all, also ensure a fallback "Outros" exists
    if (categories.length === 0 && neededNames.size === 0) {
      neededNames.add("Outros");
    }

    for (const name of neededNames) {
      const created = await prisma.expenseCategory.create({
        data: { userId: user.id, name, icon: "MoreHorizontal", color: "#64748b" },
      });
      categories.push(created);
    }
  }

  // Auto-create missing income sources from imported data
  const hasIncomes = transactions.some((t) => t.type === "income");
  if (hasIncomes) {
    const existingNames = new Set(sources.map((s) => s.name.toLowerCase()));
    const neededNames = new Set(
      transactions
        .filter((t) => t.type === "income" && t.source)
        .map((t) => t.source!.trim())
        .filter((name) => name && !existingNames.has(name.toLowerCase()))
    );

    // If no sources exist at all, ensure a fallback "Outros" exists
    if (sources.length === 0 && neededNames.size === 0) {
      neededNames.add("Outros");
    }

    for (const name of neededNames) {
      const created = await prisma.incomeSource.create({
        data: { userId: user.id, name },
      });
      sources.push(created);
    }
  }

  // Auto-create FixedExpenseTemplates from imported fixed expenses
  const fixedExpenses = transactions.filter((t) => t.type === "expense" && t.isFixed);
  if (fixedExpenses.length > 0) {
    const existingTemplates = await prisma.fixedExpenseTemplate.findMany({
      where: { userId: user.id },
      select: { name: true, categoryId: true },
    });
    const existingTemplateKeys = new Set(
      existingTemplates.map((t) => `${t.name.toLowerCase()}::${t.categoryId}`)
    );

    // Deduplicate by name+category, keeping the most recent month's amount
    const templateMap = new Map<
      string,
      { name: string; amount: number; dueDay: number; categoryId: string }
    >();

    for (const tx of fixedExpenses) {
      const matchedCategory = tx.category
        ? categories.find(
            (c) => c.name.toLowerCase() === tx.category!.toLowerCase()
          )
        : null;
      const categoryId = matchedCategory?.id ?? categories[0].id;
      const key = `${tx.description.toLowerCase()}::${categoryId}`;

      if (existingTemplateKeys.has(key)) continue;

      const dueDay = parseInt(tx.date.split("-")[2]) || 1;
      const amount = Math.round(tx.amount * 100) / 100;

      templateMap.set(key, {
        name: tx.description,
        amount,
        dueDay: Math.min(Math.max(dueDay, 1), 28),
        categoryId,
      });
    }

    for (const template of templateMap.values()) {
      await prisma.fixedExpenseTemplate.create({
        data: {
          userId: user.id,
          name: template.name,
          amount: template.amount,
          dueDay: template.dueDay,
          categoryId: template.categoryId,
        },
      });
    }
  }

  let imported = 0;
  let failed = 0;

  for (const tx of transactions) {
    try {
      // Round amount to 2 decimal places for Decimal(12,2) compatibility
      const amount = Math.round(tx.amount * 100) / 100;

      if (tx.type === "expense") {
        // Try to match category by name (case insensitive), fall back to first category
        const matchedCategory = tx.category
          ? categories.find(
              (c) => c.name.toLowerCase() === tx.category!.toLowerCase()
            )
          : null;
        const categoryId = matchedCategory?.id ?? categories[0].id;

        await prisma.expense.create({
          data: {
            userId: user.id,
            amount,
            description: tx.description,
            categoryId,
            date: new Date(tx.date),
            ...(tx.isFixed != null && { isFixed: tx.isFixed }),
            ...(tx.paymentMethod && { paymentMethod: tx.paymentMethod }),
            ...(tx.jarType && { jarType: tx.jarType }),
          },
        });

        imported++;
      } else if (tx.type === "income") {
        // Try to match source by name (case insensitive), fall back to first source
        const matchedSource = tx.source
          ? sources.find(
              (s) => s.name.toLowerCase() === tx.source!.toLowerCase()
            )
          : null;
        const sourceId = matchedSource?.id ?? sources[0].id;

        await prisma.income.create({
          data: {
            userId: user.id,
            amount,
            description: tx.description,
            sourceId,
            date: new Date(tx.date),
          },
        });

        imported++;
      }
    } catch (error) {
      console.error("Erro ao importar transacao:", error);
      failed++;
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/fixed-expenses");

  return { success: true, imported, failed };
}
