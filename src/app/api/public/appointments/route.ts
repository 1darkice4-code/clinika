import { createAppointmentSchema } from "@/domain/booking/booking.schemas";
import { createAppointment } from "@/domain/booking/booking.service";
import { jsonError, jsonOk } from "@/lib/http";
import { assertRateLimit, createRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertRateLimit(createRateLimitKey(request, "public:appointment"), 10, 60_000);
    const input = createAppointmentSchema.parse(await request.json());
    const appointment = await createAppointment(input);
    return jsonOk({
      appointmentId: appointment.id,
      publicNumber: appointment.publicNumber,
      status: appointment.status,
      startsAtUtc: appointment.startsAtUtc.toISOString(),
      endsAtUtc: appointment.endsAtUtc.toISOString()
    });
  } catch (error) {
    return jsonError(error);
  }
}
