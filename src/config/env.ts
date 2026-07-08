import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  CLINIC_TIMEZONE: z.string().default("Asia/Chita"),
  NOTIFICATION_MODE: z.enum(["local", "provider"]).default("local"),
  EMAIL_PROVIDER: z.string().default("local"),
  EMAIL_FROM: z.string().email().optional().or(z.literal("")),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMS_PROVIDER: z.string().default("local"),
  SMS_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_CHAT_ID: z.string().optional(),
  WHATSAPP_PROVIDER: z.string().default("local"),
  WHATSAPP_API_KEY: z.string().optional(),
  FILE_STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  FILE_STORAGE_BUCKET: z.string().optional(),
  ANALYTICS_PROVIDER: z.string().default("disabled"),
  CAPTCHA_PROVIDER: z.string().default("disabled"),
  CAPTCHA_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
