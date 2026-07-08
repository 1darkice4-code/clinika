import { z } from "zod";
import { permissions } from "@/config/permissions";
import { assertAppointmentTransition } from "@/domain/appointment/appointment-status";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { jsonError, jsonOk } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum([
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "ARRIVED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED_BY_CLIENT",
    "CANCELLED_BY_CLINIC",
    "RESCHEDULED"
  ]),
  reason: z.string().max(500).optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.appointmentsWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError("Запись не найдена");
    assertAppointmentTransition(appointment.status, input.status);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          status: input.status,
          cancelledAt: input.status.startsWith("CANCELLED") ? new Date() : undefined,
          cancelReason: input.status.startsWith("CANCELLED") ? input.reason : undefined
        }
      });
      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: input.status,
          changedByUserId: user?.id,
          reason: input.reason
        }
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "appointment.status.change",
        entityType: "Appointment",
        entityId: id,
        description: `Статус записи изменен: ${appointment.status} -> ${input.status}`
      });
      return result;
    });

    return jsonOk({ appointment: updated });
  } catch (error) {
    return jsonError(error);
  }
}
