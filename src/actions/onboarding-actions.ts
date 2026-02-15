"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

interface OnboardingData {
  name: string;
  incomeSources: Array<{ name: string; amount: number }>;
  fixedExpenses: Array<{
    name: string;
    amount: number;
    dueDay: number;
    category: string;
  }>;
  categories: Array<{ name: string; icon: string; color: string }>;
  initialBalance: number;
  jarRules: Record<string, number>;
  goals: Array<{
    name: string;
    targetAmount: number;
    icon: string;
    color: string;
  }>;
}

export async function completeOnboarding(data: OnboardingData) {
  const user = await requireAuth();

  await prisma.$transaction(async (tx) => {
    // Update user name and mark as onboarded
    await tx.user.update({
      where: { id: user.id },
      data: { name: data.name, onboarded: true },
    });

    // Create user settings
    await tx.userSettings.create({
      data: {
        userId: user.id,
        initialBalance: data.initialBalance,
        jarRulesJson: data.jarRules,
      },
    });

    // Create income sources
    const incomeSources = await Promise.all(
      data.incomeSources
        .filter((s) => s.name.trim())
        .map((source) =>
          tx.incomeSource.create({
            data: {
              userId: user.id,
              name: source.name,
            },
          })
        )
    );

    // Create expense categories
    const categories = await Promise.all(
      data.categories.map((cat) =>
        tx.expenseCategory.create({
          data: {
            userId: user.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
          },
        })
      )
    );

    // Create fixed expense templates
    const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

    for (const expense of data.fixedExpenses) {
      const categoryId =
        categoryMap.get(expense.category) || categories[0]?.id;
      if (categoryId) {
        await tx.fixedExpenseTemplate.create({
          data: {
            userId: user.id,
            categoryId,
            name: expense.name,
            amount: expense.amount,
            dueDay: expense.dueDay,
          },
        });
      }
    }

    // Create goals
    for (const goal of data.goals) {
      await tx.goal.create({
        data: {
          userId: user.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          icon: goal.icon,
          color: goal.color,
        },
      });
    }

    // Register initial income if sources have amounts
    const firstSource = incomeSources[0];
    if (firstSource) {
      for (const source of data.incomeSources) {
        if (source.amount > 0) {
          const dbSource = incomeSources.find((s) => s.name === source.name);
          if (dbSource) {
            await tx.income.create({
              data: {
                userId: user.id,
                sourceId: dbSource.id,
                amount: source.amount,
                description: `Renda mensal - ${source.name}`,
                date: new Date(),
              },
            });
          }
        }
      }
    }
  });

  return { success: true };
}
