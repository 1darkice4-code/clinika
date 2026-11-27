import { slotQuerySchema } from "@/domain/schedule/schedule.schemas";
import { getSlotGrid } from "@/domain/schedule/schedule.service";
import { nextDateInTimezone } from "@/lib/date-time";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = slotQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const settings = await prisma.clinicSettings.findFirst({ select: { timezone: true } });
    if (!settings) throw new NotFoundError("Настройки клиники не найдены");
    const bookingDate = nextDateInTimezone(new Date(), settings.timezone);
    if (input.dateFrom < bookingDate || input.dateTo < bookingDate || input.dateTo < input.dateFrom) {
      throw new ValidationError("Свободное время доступно начиная с завтрашнего дня");
    }
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
