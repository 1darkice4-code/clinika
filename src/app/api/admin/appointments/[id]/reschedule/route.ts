import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { assertAppointmentReschedulable } from "@/domain/appointment/appointment-status";
import { writeAudit } from "@/domain/audit/audit.service";
import { getAvailableSlotOrThrow } from "@/domain/schedule/schedule.service";
import { formatDateInTimezone } from "@/lib/date-time";
import { NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  startsAtUtc: z.string().datetime(),
  reason: z.string().max(500).optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.appointmentsWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const updated = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id }
      });
      if (!appointment) throw new NotFoundError("Запись не найдена");
      assertAppointmentReschedulable(appointment.status);

      const startsAtUtc = new Date(input.startsAtUtc);
      const settings = await tx.clinicSettings.findFirst();
      if (!settings) throw new NotFoundError("Настройки клиники не найдены");
      // Ключ лока — дата в часовом поясе клиники (согласовано с зоной расчёта слотов).
      const lockDate = formatDateInTimezone(startsAtUtc, settings.timezone);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${appointment.specialistId}), hashtext(${lockDate}))`;

      const slot = await getAvailableSlotOrThrow(
        {
          serviceId: appointment.serviceId,
          specialistId: appointment.specialistId,
          startsAtUtc: input.startsAtUtc,
          excludeAppointmentId: id
        },
        { tx }
      );

      const result = await tx.appointment.update({
        where: { id },
        data: {
          startsAtUtc: slot.startsAtUtc,
          endsAtUtc: slot.endsAtUtc,
          clinicTimezone: slot.clinicTimezone,
          status: "CONFIRMED"
        }
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: "CONFIRMED",
          changedByUserId: user?.id,
          reason: input.reason ?? "Перенос записи"
        }
      });

      await writeAudit({
        tx,
        userId: user?.id,
        action: "appointment.reschedule",
        entityType: "Appointment",
        entityId: id,
        description: "Запись перенесена"
      });

      return result;
    });

    return jsonOk({ appointment: updated });
  } catch (error) {
    return jsonError(error);
  }
}
