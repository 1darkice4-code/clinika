import { timingSafeEqual } from "node:crypto";
import { createOpaqueToken, decryptSecret, encryptSecret, sha256 } from "@/lib/crypto";
import { AppError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { advanceBotBooking, type BookingDraft } from "./booking";
import {
  messengerLink,
  platformSchema,
  type BotEvent,
  type BotReply,
  type MessengerLinks,
  type MessengerPlatform
} from "./platform";
import {
  acknowledgeTelegramButton,
  getBotUsername,
  registerBotWebhook,
  sendBotReply,
  validateBotToken
} from "./transport";

export function appOrigin() {
  return new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
}

export async function getMessengerLinks(): Promise<MessengerLinks> {
  const bots = await prisma.messengerBot.findMany({
    where: { connectedAt: { not: null }, showOnSite: true },
    select: { platform: true, username: true }
  });
  const links: MessengerLinks = {};
  for (const bot of bots) {
    const platform = platformSchema.safeParse(bot.platform);
    if (platform.success) links[platform.data] = messengerLink(platform.data, bot.username);
  }
  return links;
}

export async function getBotSettings() {
  return prisma.messengerBot.findMany({
    select: { platform: true, username: true, connectedAt: true, showOnSite: true }
  });
}

export async function connectMessengerBot(platform: MessengerPlatform, token: string) {
  validateBotToken(platform, token);
  const origin = appOrigin();
  if (!origin.startsWith("https://"))
    throw new ValidationError(
      "Для подключения бота задайте публичный HTTPS-адрес сайта в APP_URL."
    );

  const username = await getBotUsername(platform, token);
  const secret = createOpaqueToken();
  const hash = sha256(secret);
  const tokenEncrypted = encryptSecret(token);
  // Preserve the active connection until the platform accepts the new webhook.
  await registerBotWebhook(platform, token, origin + "/api/webhooks/messenger/" + platform, secret);
  const values = {
    username,
    tokenEncrypted,
    webhookSecretHash: hash,
    connectedAt: new Date(),
    showOnSite: false
  };
  await prisma.messengerBot.upsert({
    where: { platform },
    create: { platform, ...values },
    update: values
  });
}

export async function setMessengerVisibility(platform: MessengerPlatform, showOnSite: boolean) {
  const { count } = await prisma.messengerBot.updateMany({
    where: { platform, connectedAt: { not: null } },
    data: { showOnSite }
  });
  if (!count) throw new ValidationError("Сначала подключите бота.");
}

export async function authenticateBotWebhook(
  platform: MessengerPlatform,
  presented: string | null
) {
  if (!presented || !/^[a-zA-Z0-9_-]{5,256}$/.test(presented)) return;
  const bot = await prisma.messengerBot.findUnique({ where: { platform } });
  if (!bot?.connectedAt) return;
  const actual = Buffer.from(sha256(presented));
  const expected = Buffer.from(bot.webhookSecretHash);
  if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
    return { token: decryptSecret(bot.tokenEncrypted), connection: bot.webhookSecretHash };
  }
}

type PendingReply = { eventId: string; reply: BotReply };
const sessionLifetimeMs = 30 * 60_000;

export async function handleBotEvent(
  platform: MessengerPlatform,
  authenticated: { token: string; connection: string },
  event: BotEvent
) {
  const id = sha256(platform + ":" + authenticated.connection + ":" + event.userId);
  const now = new Date();
  const lease = new Date(now.getTime() + 45_000);
  await prisma.messengerBookingSession.createMany({ data: [{ id }], skipDuplicates: true });
  const acquired = await prisma.messengerBookingSession.updateMany({
    where: { id, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
    data: { leaseUntil: lease }
  });
  if (!acquired.count) throw new AppError("Диалог обрабатывается.", 503, "BOT_SESSION_BUSY");

  const guard = { id, leaseUntil: lease };
  try {
    const session = await prisma.messengerBookingSession.findUniqueOrThrow({ where: { id } });
    if (session.processedEvents.includes(event.id)) return;
    if (platform === "telegram" && event.callbackId) {
      // A stale callback may fail independently of sending the next message.
      void acknowledgeTelegramButton(authenticated.token, event.callbackId).catch(() => {});
    }
    let pending: PendingReply | undefined = session.pendingEncrypted
      ? (JSON.parse(decryptSecret(session.pendingEncrypted)) as PendingReply)
      : undefined;
    if (pending?.eventId !== event.id) {
      const previous = session.stateEncrypted
        ? (JSON.parse(decryptSecret(session.stateEncrypted)) as {
            expiresAt: number;
            draft: BookingDraft;
          })
        : undefined;
      const { draft, reply } = await advanceBotBooking(
        platform,
        previous && previous.expiresAt > now.getTime() ? previous.draft : undefined,
        event,
        appOrigin()
      );
      pending = { eventId: event.id, reply };
      const saved = await prisma.messengerBookingSession.updateMany({
        where: guard,
        data: {
          stateEncrypted:
            draft.step === "home"
              ? null
              : encryptSecret(
                  JSON.stringify({ draft, expiresAt: now.getTime() + sessionLifetimeMs })
                ),
          pendingEncrypted: encryptSecret(JSON.stringify(pending))
        }
      });
      if (!saved.count) throw new AppError("Диалог обрабатывается.", 503, "BOT_SESSION_BUSY");
    }
    await sendBotReply(
      platform,
      authenticated.token,
      event.userId,
      pending.reply,
      event.callbackId
    );
    await prisma.messengerBookingSession.updateMany({
      where: guard,
      data: {
        pendingEncrypted: null,
        processedEvents: [...session.processedEvents.slice(-31), event.id]
      }
    });
  } finally {
    await prisma.messengerBookingSession.updateMany({ where: guard, data: { leaseUntil: null } });
  }
}
