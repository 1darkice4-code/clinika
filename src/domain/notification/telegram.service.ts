import { decryptSecret } from "@/lib/crypto";
import { formatClinicDateTime } from "@/lib/date-time";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ProxyAgent, request } from "undici";

const TELEGRAM_TIMEOUT_MS = 8_000;
let telegramProxyAgent: ProxyAgent | null | undefined;

export function getTelegramProxyAgent() {
  if (telegramProxyAgent !== undefined) return telegramProxyAgent;
  const proxyUrl = process.env.TELEGRAM_PROXY_URL?.trim();
  telegramProxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
  return telegramProxyAgent;
}

type AppointmentMessageInput = {
  publicNumber: string;
  clientName: string;
  phone: string;
  email?: string | null;
  serviceName: string;
  performer: string;
  startsAtUtc: Date;
  timezone: string;
  comment?: string | null;
};

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
  result?: { message_id?: number };
};

export function buildTelegramAppointmentMessage(input: AppointmentMessageInput): string {
  const lines = [
    "Новая запись с сайта",
    "",
    `Номер: ${input.publicNumber}`,
    `Дата и время: ${formatClinicDateTime(input.startsAtUtc, input.timezone)}`,
    `Услуга: ${input.serviceName}`,
    `Исполнитель: ${input.performer}`,
    "",
    `Клиент: ${input.clientName}`,
    `Телефон: ${input.phone}`
  ];

  if (input.email) lines.push(`Email: ${input.email}`);
  if (input.comment) lines.push("", `Комментарий: ${input.comment}`);
  return lines.join("\n");
}

export async function sendTelegramMessage(input: {
  token: string;
  chatId: string;
  text: string;
}): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    let response: Awaited<ReturnType<typeof request>>;
    try {
      response = await request(`https://api.telegram.org/bot${input.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: input.chatId,
          text: input.text,
          disable_web_page_preview: true
        }),
        signal: controller.signal,
        dispatcher: getTelegramProxyAgent() ?? undefined
      });
    } catch {
      throw new Error("Telegram API недоступен");
    }

    const data = (await response.body.json().catch(() => ({}))) as TelegramApiResponse;
    if (response.statusCode < 200 || response.statusCode >= 300 || !data.ok) {
      throw new Error(data.description || "Telegram отклонил сообщение");
    }
    return data.result?.message_id ? String(data.result.message_id) : null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverAppointmentTelegramNotification(appointmentId: string) {
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, service: true, specialist: true, resource: true }
    }),
    prisma.clinicSettings.findFirst({
      select: {
        telegramNotificationsEnabled: true,
        telegramBotTokenEncrypted: true,
        telegramAdminChatId: true
      }
    })
  ]);

  if (!appointment || !settings?.telegramNotificationsEnabled) return null;

  const performer = appointment.specialist
    ? `${appointment.specialist.firstName} ${appointment.specialist.lastName}`
    : appointment.resource
      ? `${appointment.resource.name}, специалист будет назначен`
      : "будет назначен";
  const clientName = [appointment.client.firstName, appointment.client.lastName]
    .filter(Boolean)
    .join(" ");
  const text = buildTelegramAppointmentMessage({
    publicNumber: appointment.publicNumber,
    clientName,
    phone: appointment.client.phone,
    email: appointment.client.email,
    serviceName: appointment.service.name,
    performer,
    startsAtUtc: appointment.startsAtUtc,
    timezone: appointment.clinicTimezone,
    comment: appointment.clientComment
  });

  const notification = await prisma.notification.create({
    data: {
      channel: "TELEGRAM",
      recipient: settings.telegramAdminChatId,
      clientId: appointment.clientId,
      appointmentId: appointment.id,
      eventType: "appointment.created",
      payloadJson: { body: text },
      status: "PENDING"
    }
  });

  try {
    if (!settings.telegramBotTokenEncrypted || !settings.telegramAdminChatId) {
      throw new Error("Telegram-бот настроен не полностью");
    }
    const providerMessageId = await sendTelegramMessage({
      token: decryptSecret(settings.telegramBotTokenEncrypted),
      chatId: settings.telegramAdminChatId,
      text
    });
    return await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        providerMessageId,
        sentAt: new Date(),
        lastError: null
      }
    });
  } catch (error) {
    const lastError = error instanceof Error ? error.message.slice(0, 500) : "Ошибка Telegram";
    log("error", "Telegram appointment notification failed", {
      appointmentId,
      notificationId: notification.id,
      error: lastError
    });
    return await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError
      }
    });
  }
}

/** Короткое уведомление администратору (например, о новом отзыве). Ошибки только логируются. */
export async function notifyAdminTelegram(text: string) {
  const settings = await prisma.clinicSettings.findFirst({
    select: { telegramNotificationsEnabled: true, telegramBotTokenEncrypted: true, telegramAdminChatId: true }
  });
  if (!settings?.telegramNotificationsEnabled || !settings.telegramBotTokenEncrypted || !settings.telegramAdminChatId) {
    return false;
  }
  try {
    await sendTelegramMessage({
      token: decryptSecret(settings.telegramBotTokenEncrypted),
      chatId: settings.telegramAdminChatId,
      text
    });
    return true;
  } catch (error) {
    log("error", "Telegram admin notification failed", {
      error: error instanceof Error ? error.message.slice(0, 300) : "Ошибка Telegram"
    });
    return false;
  }
}
