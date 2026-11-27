import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { sendTelegramMessage } from "@/domain/notification/telegram.service";
import { decryptSecret } from "@/lib/crypto";
import { ValidationError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.settingsWrite);
    const settings = await prisma.clinicSettings.findFirst({
      select: {
        clinicName: true,
        telegramBotTokenEncrypted: true,
        telegramAdminChatId: true
      }
    });
    if (!settings?.telegramBotTokenEncrypted || !settings.telegramAdminChatId) {
      throw new ValidationError("Сначала сохраните токен бота и Chat ID администратора");
    }

    await sendTelegramMessage({
      token: decryptSecret(settings.telegramBotTokenEncrypted),
      chatId: settings.telegramAdminChatId,
      text: `Тестовое сообщение от ${settings.clinicName}. Telegram-уведомления настроены.`
    });
    return jsonOk({ sent: true });
  } catch (error) {
    return jsonError(error);
  }
}
