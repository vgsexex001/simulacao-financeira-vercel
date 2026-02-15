"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";

export async function updateUserCurrency(currency: string) {
  const user = await requireAuth();

  const isValid = SUPPORTED_CURRENCIES.some((c) => c.code === currency);
  if (!isValid) {
    return { error: "Moeda não suportada" };
  }

  await prisma.userSettings.update({
    where: { userId: user.id },
    data: { currency },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return { success: true };
}

export async function getUserCurrency(): Promise<string> {
  const user = await requireAuth();

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    select: { currency: true },
  });

  return settings?.currency ?? DEFAULT_CURRENCY;
}
