import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { assertOperatorsExist } from "@/app/api/admin/resources/validate";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).max(160).optional(),
  slug: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  operatorIds: z.array(z.string().min(1)).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { operatorIds, ...data } = input;
    if (data.slug) {
      const existing = await prisma.resource.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) throw new ConflictError("Ресурс с таким slug уже существует");
    }
    if (operatorIds) await assertOperatorsExist(operatorIds);

    const resource = await prisma.$transaction(async (tx) => {
      const before = await tx.resource.findUnique({ where: { id }, include: { operators: true } });
      if (!before) throw new NotFoundError("Ресурс не найден");
      const updated = await tx.resource.update({ where: { id }, data });
      if (operatorIds) {
        await tx.resourceOperator.deleteMany({ where: { resourceId: id } });
        if (operatorIds.length > 0) {
          await tx.resourceOperator.createMany({
            data: operatorIds.map((specialistId) => ({ resourceId: id, specialistId, isActive: true })),
            skipDuplicates: true
          });
        }
      }
      await writeAudit({
        tx,
        userId: user?.id,
        action: "resource.update",
        entityType: "Resource",
        entityId: id,
        description: "Ресурс обновлен",
        beforeJson: JSON.parse(JSON.stringify(before)),
        afterJson: JSON.parse(JSON.stringify(updated))
      });
      return updated;
    });

    return jsonOk({ resource });
  } catch (error) {
    return jsonError(error);
  }
}
