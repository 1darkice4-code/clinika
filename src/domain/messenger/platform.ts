import { z } from "zod";

export const platformSchema = z.enum(["telegram", "max"]);
export type MessengerPlatform = z.infer<typeof platformSchema>;

export const messengerLabels: Record<MessengerPlatform, string> = {
  telegram: "Telegram",
  max: "MAX"
};

export function messengerLink(platform: MessengerPlatform, username: string) {
  return "https://" + (platform === "telegram" ? "t.me/" : "max.ru/") + username;
}

export type MessengerLinks = Partial<Record<MessengerPlatform, string>>;

export type BotButton = { text: string } & ({ action: string } | { url: string });
export type BotReply = { text: string; buttons?: BotButton[][] };
export type BotEvent = {
  id: string;
  userId: string;
  text?: string;
  action?: string;
  callbackId?: string;
};
