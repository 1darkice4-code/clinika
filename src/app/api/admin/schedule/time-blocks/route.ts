import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { assertResourceExists, assertSpecialistExists } from "@/app/api/admin/resources/validate";
import { ValidationError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

// Владелец блокировки — специалист или общий ресурс (аппарат). Ровно один из двух.
const schema = z.object({
  specialistId: z.string().min(1).optional(),
  resourceId: z.string().min(1).optional(),
  startsAtUtc: z.string().datetime(),
  endsAtUtc: z.string().datetime(),
  reason: z.string().min(2).max(300)
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.scheduleWrite);
    const input = schema.parse(await request.json());
    if (Boolean(input.specialistId) === Boolean(input.resourceId)) {
      throw new ValidationError("Укажите либо специалиста, либо ресурс");
    }
    await assertResourceExists(input.resourceId);
    await assertSpecialistExists(input.specialistId);

    const block = await prisma.$transaction(async (tx) => {
      const common = {
        startsAtUtc: new Date(input.startsAtUtc),
        endsAtUtc: new Date(input.endsAtUtc),
        reason: input.reason,
        createdByUserId: user?.id
      };
      const created = input.resourceId
        ? await tx.resourceTimeBlock.create({ data: { resourceId: input.resourceId, ...common } })
        : await tx.timeBlock.create({ data: { specialistId: input.specialistId!, ...common } });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "schedule.time_block.create",
        entityType: input.resourceId ? "ResourceTimeBlock" : "TimeBlock",
        entityId: created.id,
        description: "Создана ручная блокировка времени"
      });
      return created;
    });

    return jsonOk({ block });
  } catch (error) {
    return jsonError(error);
  }
}
