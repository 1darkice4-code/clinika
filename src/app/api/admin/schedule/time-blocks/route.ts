import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  specialistId: z.string().min(1),
  startsAtUtc: z.string().datetime(),
  endsAtUtc: z.string().datetime(),
  reason: z.string().min(2).max(300)
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.scheduleWrite);
    const input = schema.parse(await request.json());

    const block = await prisma.$transaction(async (tx) => {
      const created = await tx.timeBlock.create({
        data: {
          specialistId: input.specialistId,
          startsAtUtc: new Date(input.startsAtUtc),
          endsAtUtc: new Date(input.endsAtUtc),
          reason: input.reason,
          createdByUserId: user?.id
        }
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "schedule.time_block.create",
        entityType: "TimeBlock",
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
