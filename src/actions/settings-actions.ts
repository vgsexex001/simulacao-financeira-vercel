"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  const user = await requireAuth();

  const [dbUser, settings, categories, incomeSources] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.userSettings.findUnique({
      where: { userId: user.id },
    }),
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
    profile: dbUser
      ? {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          createdAt: dbUser.createdAt.toISOString(),
        }
      : null,
    settings: settings
      ? {
          locale: settings.locale,
          monthStartDay: settings.monthStartDay,
          currency: settings.currency,
          initialBalance: Number(settings.initialBalance),
          jarRules: settings.jarRulesJson as Record<string, number>,
        }
      : null,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: c.isDefault,
    })),
    incomeSources: incomeSources.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
    })),
  };
}

export async function updateProfile(data: { name: string; email: string }) {
  const user = await requireAuth();

  const existing = await prisma.user.findFirst({
    where: { email: data.email, NOT: { id: user.id } },
  });

  if (existing) {
    return { error: "Este email já está em uso por outra conta" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      email: data.email,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updatePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await requireAuth();

  if (data.newPassword !== data.confirmPassword) {
    return { error: "As senhas não coincidem" };
  }

  if (data.newPassword.length < 6) {
    return { error: "A nova senha deve ter pelo menos 6 caracteres" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hashedPassword: true },
  });

  if (!dbUser) {
    return { error: "Usuário não encontrado" };
  }

  const isValid = await bcrypt.compare(
    data.currentPassword,
    dbUser.hashedPassword
  );

  if (!isValid) {
    return { error: "Senha atual incorreta" };
  }

  const hashedPassword = await bcrypt.hash(data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  });

  return { success: true };
}

export async function updatePreferences(data: {
  locale?: string;
  monthStartDay?: number;
  currency?: string;
  initialBalance?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();

    const updateData = {
      ...(data.locale !== undefined && { locale: data.locale }),
      ...(data.monthStartDay !== undefined && {
        monthStartDay: data.monthStartDay,
      }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.initialBalance !== undefined && {
        initialBalance: data.initialBalance,
      }),
    };

    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: updateData,
      create: { userId: user.id, ...updateData },
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    return { success: true };
  } catch (error) {
    console.error("updatePreferences error:", error);
    return { success: false, error: "Erro ao salvar preferências. Tente novamente." };
  }
}

export async function createCategory(data: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.expenseCategory.create({
    data: {
      userId: user.id,
      name: data.name,
      icon: data.icon || null,
      color: data.color || null,
      isDefault: false,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { success: true };
}

export async function updateCategory(
  id: string,
  data: { name?: string; icon?: string; color?: string }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.expenseCategory.update({
    where: { id, userId: user.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.expenseCategory.update({
    where: { id, userId: user.id },
    data: { isActive: false },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { success: true };
}

export async function createIncomeSource(data: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.incomeSource.create({
    data: {
      userId: user.id,
      name: data.name,
      icon: data.icon || null,
      color: data.color || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteIncomeSource(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.incomeSource.update({
    where: { id, userId: user.id },
    data: { isActive: false },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  return { success: true };
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  await prisma.user.delete({
    where: { id: user.id },
  });

  revalidatePath("/");
  return { success: true };
}
