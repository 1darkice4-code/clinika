import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(2).max(160).optional(),
  slug: z.string().min(2).max(120).optional(),
  shortDescription: z.string().min(2).max(500).optional(),
  fullDescription: z.string().min(2).max(5000).optional(),
  priceFrom: z.number().int().nonnegative().nullable().optional(),
  priceExact: z.number().int().nonnegative().nullable().optional(),
  bufferBeforeMinutes: z.number().int().nonnegative().optional(),
  bufferAfterMinutes: z.number().int().nonnegative().optional(),
  contraindications: z.string().max(2000).nullable().optional(),
  disclaimer: z.string().max(2000).nullable().optional(),
  durationMinutes: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    if (input.slug) {
      const existing = await prisma.service.findUnique({ where: { slug: input.slug } });
      if (existing && existing.id !== id) throw new ConflictError("Услуга с таким slug уже существует");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.service.findUnique({ where: { id } });
      if (!before) throw new NotFoundError("Услуга не найдена");
      const service = await tx.service.update({ where: { id }, data: input });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "service.update",
        entityType: "Service",
        entityId: id,
        description: "Услуга изменена",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(service))
      });
      return service;
    });

    return jsonOk({ service: updated });
  } catch (error) {
    return jsonError(error);
  }
}
