import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { encryptSecret } from "@/lib/crypto";
import { ValidationError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  clinicName: z.string().min(2).max(160),
  legalName: z.string().min(2).max(240),
  taxId: z.string().max(32).optional().or(z.literal("")),
  address: z.string().min(2).max(300),
  phone: z.string().min(5).max(40),
  email: z.string().email(),
  timezone: z.string().min(2).max(80),
  mapEmbedUrl: z.string().url().optional().or(z.literal("")),
  bookingMinLeadMinutes: z.number().int().min(0).max(43200),
  bookingMaxHorizonDays: z.number().int().min(1).max(365),
  telegramNotificationsEnabled: z.boolean(),
  telegramAdminChatId: z.string().trim().max(64).optional().or(z.literal("")),
  telegramBotToken: z.string().trim().max(256).optional().or(z.literal(""))
});

function publicSettings<T extends { telegramBotTokenEncrypted?: string | null }>(settings: T) {
  const { telegramBotTokenEncrypted, ...safe } = settings;
  return {
    ...safe,
    telegramBotTokenConfigured: Boolean(telegramBotTokenEncrypted)
  };
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.settingsWrite);
    const input = schema.parse(await request.json());

    const settings = await prisma.$transaction(async (tx) => {
      const before = await tx.clinicSettings.findFirst();
      if (input.telegramNotificationsEnabled && !input.telegramAdminChatId) {
        throw new ValidationError("Укажите Chat ID администратора");
      }
      if (
        input.telegramNotificationsEnabled &&
        !input.telegramBotToken &&
        !before?.telegramBotTokenEncrypted
      ) {
        throw new ValidationError("Укажите токен Telegram-бота");
      }
      const data = {
        clinicName: input.clinicName,
        legalName: input.legalName,
        taxId: input.taxId || null,
        address: input.address,
        phone: input.phone,
        email: input.email,
        timezone: input.timezone,
        mapEmbedUrl: input.mapEmbedUrl || null,
        bookingMinLeadMinutes: input.bookingMinLeadMinutes,
        bookingMaxHorizonDays: input.bookingMaxHorizonDays,
        telegramNotificationsEnabled: input.telegramNotificationsEnabled,
        telegramAdminChatId: input.telegramAdminChatId || null,
        telegramBotTokenEncrypted: input.telegramBotToken
          ? encryptSecret(input.telegramBotToken)
          : undefined
      };
      const updated = before
        ? await tx.clinicSettings.update({ where: { id: before.id }, data })
        : await tx.clinicSettings.create({ data });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "settings.update",
        entityType: "ClinicSettings",
        entityId: updated.id,
        description: "Настройки клиники обновлены",
        beforeJson: before ? JSON.parse(JSON.stringify(publicSettings(before))) : undefined,
        afterJson: JSON.parse(JSON.stringify(publicSettings(updated)))
      });
      return updated;
    });

    return jsonOk({ settings: publicSettings(settings) });
  } catch (error) {
    return jsonError(error);
  }
}
