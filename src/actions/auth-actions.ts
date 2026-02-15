"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginUser(formData: {
  email: string;
  password: string;
}) {
  const validated = loginSchema.safeParse(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Email ou senha inválidos" };
    }
    throw error;
  }
}

export async function logoutUser() {
  await signOut({ redirect: false });
}
