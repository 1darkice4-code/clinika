import { slotQuerySchema } from "@/domain/schedule/schedule.schemas";
import { getSlotGrid } from "@/domain/schedule/schedule.service";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = slotQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const { timezone, slots } = await getSlotGrid(input);
    const formatter = new Intl.DateTimeFormat("ru-RU", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit"
    });
    return jsonOk({
      timezone,
      slots: slots.map((slot) => ({
        startsAtUtc: slot.startsAtUtc.toISOString(),
        endsAtUtc: slot.endsAtUtc.toISOString(),
        available: slot.available,
        label: formatter.format(slot.startsAtUtc)
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}
