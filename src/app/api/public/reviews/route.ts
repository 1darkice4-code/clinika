import { createPublicReview, submitReviewSchema } from "@/domain/review/public-reviews";
import { jsonError, jsonOk } from "@/lib/http";
import { assertRateLimit, createRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRateLimit(createRateLimitKey(request, "public:review"), 3, 10 * 60_000);
    const body = (await request.json()) as Record<string, unknown>;
    // Скрытое поле для ботов: делаем вид, что всё прошло успешно, и ничего не сохраняем.
    if (typeof body.honeypot === "string" && body.honeypot.length > 0) return jsonOk({ status: "PENDING" });
    const input = submitReviewSchema.parse(body);
    const review = await createPublicReview(input);
    return jsonOk({ status: review.status });
  } catch (error) {
    return jsonError(error);
  }
}
