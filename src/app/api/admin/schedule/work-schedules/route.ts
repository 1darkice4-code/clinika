import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
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

const schema = z.object({
  specialistId: z.string().min(1),
  schedules: z.array(scheduleSchema).min(1)
});

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.scheduleWrite);
    const input = schema.parse(await request.json());

    await prisma.$transaction(async (tx) => {
      await tx.workSchedule.deleteMany({ where: { specialistId: input.specialistId } });
      await tx.workSchedule.createMany({
        data: input.schedules.map((schedule) => ({
          specialistId: input.specialistId,
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
        entityId: input.specialistId,
        description: "Рабочее расписание специалиста обновлено"
      });
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
