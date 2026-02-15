"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function getGoals() {
  const user = await requireAuth();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { contributions: true },
      },
    },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
  });

  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    deadline: g.deadline ? g.deadline.toISOString() : null,
    icon: g.icon,
    color: g.color,
    isCompleted: g.isCompleted,
    createdAt: g.createdAt.toISOString(),
    contributionsCount: g._count.contributions,
  }));
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  deadline?: string;
  color?: string;
}) {
  const user = await requireAuth();

  await prisma.goal.create({
    data: {
      userId: user.id,
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: data.deadline ? new Date(data.deadline) : null,
      color: data.color || null,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateGoal(
  id: string,
  data: {
    name: string;
    targetAmount: number;
    deadline?: string;
    color?: string;
  }
) {
  const user = await requireAuth();

  const goal = await prisma.goal.update({
    where: { id, userId: user.id },
    data: {
      name: data.name,
      targetAmount: data.targetAmount,
      deadline: data.deadline ? new Date(data.deadline) : null,
      color: data.color || null,
    },
  });

  // Recheck completion status
  const isCompleted = Number(goal.currentAmount) >= data.targetAmount;
  if (goal.isCompleted !== isCompleted) {
    await prisma.goal.update({
      where: { id },
      data: { isCompleted },
    });
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteGoal(id: string) {
  const user = await requireAuth();

  await prisma.goal.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function contributeToGoal(data: {
  goalId: string;
  amount: number;
  note?: string;
}) {
  const user = await requireAuth();

  const goal = await prisma.goal.findFirst({
    where: { id: data.goalId, userId: user.id },
  });

  if (!goal) {
    throw new Error("Meta não encontrada");
  }

  const newAmount = Number(goal.currentAmount) + data.amount;
  const isCompleted = newAmount >= Number(goal.targetAmount);

  await prisma.$transaction([
    prisma.goalContribution.create({
      data: {
        userId: user.id,
        goalId: data.goalId,
        amount: data.amount,
        note: data.note || null,
        date: new Date(),
      },
    }),
    prisma.goal.update({
      where: { id: data.goalId },
      data: {
        currentAmount: newAmount,
        isCompleted,
      },
    }),
  ]);

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true, isCompleted };
}

export async function getGoalContributions(goalId: string) {
  const user = await requireAuth();

  const contributions = await prisma.goalContribution.findMany({
    where: { goalId, userId: user.id },
    orderBy: { date: "desc" },
  });

  return contributions.map((c) => ({
    id: c.id,
    amount: Number(c.amount),
    note: c.note,
    date: c.date.toISOString(),
  }));
}
