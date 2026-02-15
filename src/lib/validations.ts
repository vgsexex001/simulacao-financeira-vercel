import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Mínimo 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const expenseSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição obrigatória"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  date: z.date(),
  jarType: z.string().optional(),
});

export const incomeSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição obrigatória"),
  sourceId: z.string().min(1, "Selecione uma fonte"),
  date: z.date(),
});

export const goalSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  targetAmount: z.number().positive("Valor deve ser positivo"),
  deadline: z.date().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const fixedExpenseSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  amount: z.number().positive("Valor deve ser positivo"),
  dueDay: z.number().min(1).max(31),
  categoryId: z.string().min(1, "Selecione uma categoria"),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Mínimo 6 caracteres"),
    newPassword: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
