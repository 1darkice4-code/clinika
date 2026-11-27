import { authenticateBotWebhook, handleBotEvent } from "@/domain/messenger/bots";
import { platformSchema } from "@/domain/messenger/platform";
import { parseBotEvent } from "@/domain/messenger/transport";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const platform = platformSchema.safeParse((await params).platform);
  if (!platform.success) return new Response(null, { status: 404 });
  try {
    const auth = await authenticateBotWebhook(
      platform.data,
      request.headers.get(
        platform.data === "telegram" ? "X-Telegram-Bot-Api-Secret-Token" : "X-Max-Bot-Api-Secret"
      )
    );
    if (!auth) return new Response(null, { status: 403 });
    const event = parseBotEvent(platform.data, await request.json().catch(() => undefined));
    if (event) await handleBotEvent(platform.data, auth, event);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
