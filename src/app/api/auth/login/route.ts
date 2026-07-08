import { headers } from "next/headers";
import { loginSchema } from "@/domain/auth/auth.schemas";
import { signIn } from "@/domain/auth/auth.service";
import { assertRateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for") ?? "local";
    assertRateLimit(`login:${ip}:${body.email}`, 5, 15 * 60_000);
    await signIn(body.email, body.password, {
      ip,
      userAgent: headerStore.get("user-agent")
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
