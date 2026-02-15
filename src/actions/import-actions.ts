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

  if (categories.length === 0 && transactions.some((t) => t.type === "expense")) {
    return { success: false, error: "Nenhuma categoria cadastrada. Crie pelo menos uma categoria antes de importar despesas." };
  }

  if (sources.length === 0 && transactions.some((t) => t.type === "income")) {
    return { success: false, error: "Nenhuma fonte de renda cadastrada. Crie pelo menos uma fonte antes de importar receitas." };
  }

  let imported = 0;

  for (const tx of transactions) {
    try {
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
            amount: tx.amount,
            description: tx.description,
            categoryId,
            date: new Date(tx.date),
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
            amount: tx.amount,
            description: tx.description,
            sourceId,
            date: new Date(tx.date),
          },
        });

        imported++;
      }
    } catch (error) {
      console.error("Erro ao importar transacao:", error);
      // Continue importing the rest
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true, imported };
}
