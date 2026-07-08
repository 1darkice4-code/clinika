import { signOut } from "@/domain/auth/auth.service";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST() {
  try {
    await signOut();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
