import { z } from "zod";

export const clientNameSchema = z.string().trim().min(2, "Укажите имя").max(80);

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Укажите телефон")
  .max(32, "Телефон слишком длинный");

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Укажите корректный email")
  .optional()
  .or(z.literal(""));
