"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
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
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[LOGIN ERROR]", error);
    return { error: "Email ou senha inválidos" };
  }
}

export async function logoutUser() {
  await signOut({ redirectTo: "/login" });
}
