import { z } from "zod";
import { Prisma } from "@prisma/client/index";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  // Пустое значение / null снимает назначение оператора.
  specialistId: z.string().min(1).nullable().optional()
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
    const specialistId = input.specialistId || null;

    const updated = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id } });
      if (!appointment) throw new NotFoundError("Запись не найдена");
      if (!appointment.resourceId) {
        throw new ConflictError("Назначение оператора доступно только для записей на аппарат");
      }

      if (specialistId) {
        const operator = await tx.resourceOperator.findFirst({
          where: { resourceId: appointment.resourceId, specialistId, isActive: true }
        });
        if (!operator) throw new ConflictError("Этот специалист не оператор данного аппарата");

        // Оператор может параллельно вести и обычные приёмы: убеждаемся, что он
        // не занят другой активной записью в это же время (иначе БД-гард отклонит).
        const clash = await tx.appointment.findFirst({
          where: {
            id: { not: id },
            specialistId,
            deletedAt: null,
            status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "ARRIVED"] },
            startsAtUtc: { lt: appointment.endsAtUtc },
            endsAtUtc: { gt: appointment.startsAtUtc }
          },
          select: { publicNumber: true }
        });
        if (clash) {
          throw new ConflictError(`Мастер занят в это время (запись ${clash.publicNumber})`);
        }
      }

      const result = await tx.appointment.update({ where: { id }, data: { specialistId } });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "appointment.assign_operator",
        entityType: "Appointment",
        entityId: id,
        description: specialistId ? "Назначен оператор записи" : "Оператор записи снят"
      });
      return result;
    });

    return jsonOk({ appointment: updated });
  } catch (error) {
    // Гонка: мастера успели занять параллельной записью между проверкой и записью.
    if (isOverlapViolation(error)) {
      return jsonError(new ConflictError("Мастер занят в это время другой записью"));
    }
    return jsonError(error);
  }
}
