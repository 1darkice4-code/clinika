import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Укажите email").toLowerCase(),
  password: z.string().min(8, "Укажите пароль")
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Укажите email").toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(12, "Пароль должен быть не короче 12 символов")
});

export type LoginInput = z.infer<typeof loginSchema>;
