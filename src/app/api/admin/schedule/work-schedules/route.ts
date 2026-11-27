import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { assertResourceExists, assertSpecialistExists } from "@/app/api/admin/resources/validate";
import { ValidationError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const scheduleSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startsAtLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
  endsAtLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
  breaksJson: z.array(
    z.object({
      startsAtLocalTime: z.string().regex(/^\d{2}:\d{2}$/),
      endsAtLocalTime: z.string().regex(/^\d{2}:\d{2}$/)
    })
  ).default([])
});

// Владелец расписания — специалист или общий ресурс (аппарат). Ровно один из двух.
const schema = z.object({
  specialistId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  schedules: z.array(scheduleSchema).min(1)
});

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.scheduleWrite);
    const input = schema.parse(await request.json());
    if (Boolean(input.specialistId) === Boolean(input.resourceId)) {
      throw new ValidationError("Укажите либо специалиста, либо ресурс");
    }
    await assertResourceExists(input.resourceId);
    await assertSpecialistExists(input.specialistId);

    await prisma.$transaction(async (tx) => {
      if (input.resourceId) {
        const resourceId = input.resourceId;
        await tx.resourceWorkSchedule.deleteMany({ where: { resourceId } });
        await tx.resourceWorkSchedule.createMany({
          data: input.schedules.map((schedule) => ({
            resourceId,
            weekday: schedule.weekday,
            startsAtLocalTime: schedule.startsAtLocalTime,
            endsAtLocalTime: schedule.endsAtLocalTime,
            breaksJson: schedule.breaksJson
          }))
        });
        await writeAudit({
          tx,
          userId: user?.id,
          action: "schedule.work_schedule.replace",
          entityType: "Resource",
          entityId: resourceId,
          description: "Рабочее расписание аппарата обновлено"
        });
        return;
      }

      const specialistId = input.specialistId!;
      await tx.workSchedule.deleteMany({ where: { specialistId } });
      await tx.workSchedule.createMany({
        data: input.schedules.map((schedule) => ({
          specialistId,
          weekday: schedule.weekday,
          startsAtLocalTime: schedule.startsAtLocalTime,
          endsAtLocalTime: schedule.endsAtLocalTime,
          breaksJson: schedule.breaksJson
        }))
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "schedule.work_schedule.replace",
        entityType: "Specialist",
        entityId: specialistId,
        description: "Рабочее расписание специалиста обновлено"
      });
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
