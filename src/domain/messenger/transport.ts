import { rootCertificates } from "node:tls";
import { Agent, request } from "undici";
import { z } from "zod";
import { getTelegramProxyAgent } from "@/domain/notification/telegram.service";
import { AppError, ValidationError } from "@/lib/errors";
import { maxRootCertificate } from "./max-trust";
import { messengerLabels, type BotEvent, type BotReply, type MessengerPlatform } from "./platform";

const maxApi = "https://platform-api2.max.ru";
const maxDispatcher = new Agent({ connect: { ca: [...rootCertificates, maxRootCertificate] } });
const privateChat = z.object({ id: z.number().int(), type: z.literal("private") });
const telegramUpdate = z.object({
  update_id: z.number().int(),
  message: z.object({ chat: privateChat, text: z.string().optional() }).optional(),
  callback_query: z
    .object({
      id: z.string(),
      data: z.string().optional(),
      message: z.object({ chat: privateChat }).optional()
    })
    .optional()
});

const maxUser = z.object({ user_id: z.number().int(), is_bot: z.boolean().optional() });
const maxUpdate = z.object({
  update_type: z.string(),
  timestamp: z.number().int().optional(),
  user: maxUser.optional(),
  message: z
    .object({
      recipient: z.object({ chat_type: z.string() }),
      sender: maxUser.optional(),
      body: z.object({ mid: z.string(), text: z.string().nullish() })
    })
    .nullish(),
  callback: z
    .object({ callback_id: z.string(), user: maxUser, payload: z.string().nullish() })
    .optional()
});

export function parseBotEvent(platform: MessengerPlatform, data: unknown): BotEvent | undefined {
  if (platform === "telegram") {
    const parsed = telegramUpdate.safeParse(data);
    if (!parsed.success) return;
    const { update_id, message, callback_query: callback } = parsed.data;
    const userId = message?.chat.id ?? callback?.message?.chat.id;
    if (userId === undefined || (!message?.text && !callback?.data)) return;
    return {
      id: String(update_id),
      userId: String(userId),
      text: message?.text,
      action: callback?.data,
      callbackId: callback?.id
    };
  }
  const parsed = maxUpdate.safeParse(data);
  if (!parsed.success) return;
  const { update_type: type, timestamp, user, message, callback } = parsed.data;
  if (type === "bot_started" && user && !user.is_bot && timestamp !== undefined) {
    return { id: "start:" + timestamp, userId: String(user.user_id), text: "/start" };
  }
  if (message?.recipient.chat_type !== "dialog") return;
  if (type === "message_created" && message.sender && !message.sender.is_bot && message.body.text) {
    return {
      id: message.body.mid,
      userId: String(message.sender.user_id),
      text: message.body.text
    };
  }
  if (type === "message_callback" && callback?.payload && !callback.user.is_bot) {
    return {
      id: "callback:" + callback.callback_id,
      userId: String(callback.user.user_id),
      action: callback.payload,
      callbackId: callback.callback_id
    };
  }
}

function apiError(platform: MessengerPlatform, status?: number) {
  const label = messengerLabels[platform];
  if (status === 401 || status === 403 || status === 404) {
    return new ValidationError(label + " отклонил токен или действие. Проверьте настройки бота.");
  }
  return new AppError(label + " API недоступен или отклонил запрос.", 502, "MESSENGER_API");
}

async function callApi(platform: MessengerPlatform, token: string, path: string, body?: object) {
  const telegram = platform === "telegram";
  const url = telegram ? "https://api.telegram.org/bot" + token + "/" + path : maxApi + "/" + path;
  try {
    const response = await request(url, {
      method: body ? "POST" : "GET",
      headers: {
        ...(telegram ? {} : { Authorization: token }),
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      dispatcher: telegram ? (getTelegramProxyAgent() ?? undefined) : maxDispatcher,
      signal: AbortSignal.timeout(6_000)
    });
    const result = z.record(z.string(), z.unknown()).parse(await response.body.json());
    if (
      response.statusCode >= 400 ||
      (telegram && result.ok !== true) ||
      result.success === false
    ) {
      throw apiError(platform, response.statusCode);
    }
    return telegram ? result.result : result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw apiError(platform);
  }
}

export function validateBotToken(platform: MessengerPlatform, token: string) {
  const pattern = platform === "telegram" ? /^\d{4,20}:[\w-]{20,150}$/ : /^[\w.:-]{15,256}$/;
  if (!pattern.test(token)) throw new ValidationError("Проверьте формат токена бота.");
}

export async function getBotUsername(platform: MessengerPlatform, token: string) {
  const result = await callApi(platform, token, platform === "telegram" ? "getMe" : "me");
  const bot = z.object({ username: z.string().regex(/^[a-zA-Z0-9_]{4,64}$/) }).safeParse(result);
  if (!bot.success) throw new ValidationError("У бота нет публичного имени.");
  return bot.data.username;
}

export async function registerBotWebhook(
  platform: MessengerPlatform,
  token: string,
  url: string,
  secret: string
) {
  if (platform === "telegram") {
    const current = z
      .object({ url: z.string() })
      .parse(await callApi(platform, token, "getWebhookInfo"));
    if (current.url && current.url !== url) {
      throw new ValidationError(
        "У Telegram-бота уже подключен другой вебхук. Используйте отдельного бота."
      );
    }
    await callApi(platform, token, "setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"]
    });
    return;
  }
  const current = z
    .object({ subscriptions: z.array(z.object({ url: z.string() })) })
    .parse(await callApi(platform, token, "subscriptions"));
  if (current.subscriptions.some((subscription) => subscription.url !== url)) {
    throw new ValidationError(
      "У MAX-бота уже подключен другой вебхук. Используйте отдельного бота."
    );
  }
  await callApi(platform, token, "subscriptions", {
    url,
    secret,
    update_types: ["bot_started", "message_created", "message_callback"]
  });
}

export async function acknowledgeTelegramButton(token: string, id: string) {
  await callApi("telegram", token, "answerCallbackQuery", { callback_query_id: id });
}

export async function sendBotReply(
  platform: MessengerPlatform,
  token: string,
  userId: string,
  reply: BotReply,
  callbackId?: string
) {
  if (platform === "telegram") {
    const keyboard = reply.buttons?.map((row) =>
      row.map((button) =>
        "url" in button ? button : { text: button.text, callback_data: button.action }
      )
    );
    await callApi(platform, token, "sendMessage", {
      chat_id: userId,
      text: reply.text,
      link_preview_options: { is_disabled: true },
      ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {})
    });
    return;
  }
  const buttons = reply.buttons?.map((row) =>
    row.map((button) =>
      "url" in button
        ? { ...button, type: "link" }
        : { type: "callback", text: button.text, payload: button.action }
    )
  );
  const message = {
    text: reply.text,
    attachments: buttons ? [{ type: "inline_keyboard", payload: { buttons } }] : []
  };
  if (callbackId) {
    try {
      await callApi(
        platform,
        token,
        "answers?callback_id=" + encodeURIComponent(callbackId) + "&disable_link_preview=true",
        { message }
      );
      return;
    } catch {
      // An expired callback can still receive a new message in the same dialog.
    }
  }
  await callApi(
    platform,
    token,
    "messages?user_id=" + encodeURIComponent(userId) + "&disable_link_preview=true",
    message
  );
}
