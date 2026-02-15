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

  // Update user name and mark as onboarded
  await prisma.user.update({
    where: { id: user.id },
    data: { name: data.name, onboarded: true },
  });

  // Create or update user settings (upsert to avoid duplicate)
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {
      initialBalance: data.initialBalance,
      jarRulesJson: data.jarRules,
    },
    create: {
      userId: user.id,
      initialBalance: data.initialBalance,
      jarRulesJson: data.jarRules,
    },
  });

  // Create income sources
  const incomeSources = [];
  for (const source of data.incomeSources.filter((s) => s.name.trim())) {
    const created = await prisma.incomeSource.create({
      data: {
        userId: user.id,
        name: source.name,
      },
    });
    incomeSources.push(created);
  }

  // Create expense categories
  const categories = [];
  for (const cat of data.categories) {
    const created = await prisma.expenseCategory.create({
      data: {
        userId: user.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      },
    });
    categories.push(created);
  }

  // Create fixed expense templates
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  for (const expense of data.fixedExpenses) {
    const categoryId =
      categoryMap.get(expense.category) || categories[0]?.id;
    if (categoryId) {
      await prisma.fixedExpenseTemplate.create({
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
    await prisma.goal.create({
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
  for (const source of data.incomeSources) {
    if (source.amount > 0) {
      const dbSource = incomeSources.find((s) => s.name === source.name);
      if (dbSource) {
        await prisma.income.create({
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

  return { success: true };
}
