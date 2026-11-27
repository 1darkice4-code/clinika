import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import {
  connectMessengerBot,
  getBotSettings,
  setMessengerVisibility
} from "@/domain/messenger/bots";
import { platformSchema } from "@/domain/messenger/platform";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("connect"),
    platform: platformSchema,
    token: z.string().trim().max(256)
  }),
  z.object({ action: z.literal("visibility"), platform: platformSchema, showOnSite: z.boolean() })
]);

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.settingsWrite);
    const input = schema.parse(await request.json());
    if (input.action === "connect") await connectMessengerBot(input.platform, input.token);
    else await setMessengerVisibility(input.platform, input.showOnSite);
    return jsonOk(await getBotSettings());
  } catch (error) {
    return jsonError(error);
  }
}
