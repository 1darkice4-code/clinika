import { createLeadSchema } from "@/domain/booking/booking.schemas";
import { createLead } from "@/domain/booking/booking.service";
import { jsonError, jsonOk } from "@/lib/http";
import { assertRateLimit, createRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRateLimit(createRateLimitKey(request, "public:lead"), 10, 60_000);
    const input = createLeadSchema.parse(await request.json());
    const lead = await createLead(input);
    return jsonOk({
      leadId: lead.id,
      publicNumber: lead.publicNumber,
      status: lead.status
    });
  } catch (error) {
    return jsonError(error);
  }
}
