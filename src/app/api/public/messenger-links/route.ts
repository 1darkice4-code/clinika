import { getMessengerLinks } from "@/domain/messenger/bots";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    return jsonOk(await getMessengerLinks(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
