import { z } from "zod";
import { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { assertAppointmentReschedulable } from "@/domain/appointment/appointment-status";
import { writeAudit } from "@/domain/audit/audit.service";
import { getAvailableSlotOrThrow } from "@/domain/schedule/schedule.service";
import { formatDateInTimezone } from "@/lib/date-time";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  startsAtUtc: z.string().datetime(),
  reason: z.string().max(500).optional()
});

/** Postgres exclusion-constraint violation (GiST no-overlap guard). */
function isOverlapViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2010" || error.code === "P2002") &&
    JSON.stringify(error.meta ?? {}).includes("no_overlap")
  );
}

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
      // Владелец очереди: аппарат (лазер, единая очередь) или конкретный специалист.
      const lockOwnerId = appointment.resourceId ?? appointment.specialistId;
      if (!lockOwnerId) throw new ConflictError("У записи нет ни специалиста, ни аппарата");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockOwnerId}), hashtext(${lockDate}))`;

      const slot = await getAvailableSlotOrThrow(
        {
          serviceId: appointment.serviceId,
          specialistId: appointment.resourceId ? undefined : appointment.specialistId ?? undefined,
          startsAtUtc: input.startsAtUtc,
          excludeAppointmentId: id
        },
        { tx }
      );

      // Лазер-запись с назначенным оператором: очередь аппарата проверена по ресурсу,
      // но оператор может параллельно вести обычные приёмы — проверяем его занятость,
      // иначе specialist-гард БД отклонит запись сырой ошибкой.
      if (appointment.resourceId && appointment.specialistId) {
        const clash = await tx.appointment.findFirst({
          where: {
            id: { not: id },
            specialistId: appointment.specialistId,
            deletedAt: null,
            status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "ARRIVED"] },
            startsAtUtc: { lt: slot.endsAtUtc },
            endsAtUtc: { gt: slot.startsAtUtc }
          },
          select: { publicNumber: true }
        });
        if (clash) throw new ConflictError(`Мастер занят в это время (запись ${clash.publicNumber})`);
      }

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
    // Гонка: слот/мастера заняли между проверкой и записью — отдаём внятный конфликт.
    if (isOverlapViolation(error)) {
      return jsonError(new ConflictError("Выбранное время уже занято. Обновите свободные окна."));
    }
    return jsonError(error);
  }
}
