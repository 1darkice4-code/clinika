import { z } from "zod";
import { permissions } from "@/config/permissions";
import { assertLeadTransition } from "@/domain/appointment/appointment-status";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";

const schema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "NO_CONTACT", "WAITING_FOR_CLIENT", "BOOKED", "DECLINED", "SPAM", "CLOSED"]),
  reason: z.string().max(500).optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.leadsWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError("Заявка не найдена");
    assertLeadTransition(lead.status, input.status);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: { status: input.status, closedAt: input.status === "CLOSED" ? new Date() : undefined }
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: lead.status,
          toStatus: input.status,
          changedByUserId: user?.id,
          reason: input.reason
        }
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "lead.status.change",
        entityType: "Lead",
        entityId: id,
        description: `Статус заявки изменен: ${lead.status} -> ${input.status}`
      });
      return result;
    });

    return jsonOk({ lead: updated });
  } catch (error) {
    return jsonError(error);
  }
}
