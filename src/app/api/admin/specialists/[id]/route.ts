import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  firstName: z.string().min(2).max(80).optional(),
  lastName: z.string().min(2).max(80).optional(),
  slug: z.string().min(2).max(120).optional(),
  position: z.string().min(2).max(160).optional(),
  specialization: z.string().min(2).max(200).optional(),
  experienceYears: z.number().int().min(0).max(80).optional(),
  education: z.string().min(2).max(1000).optional(),
  certificates: z.string().max(2000).nullable().optional(),
  description: z.string().min(2).max(2000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  userId: z.string().min(1).nullable().optional(),
  serviceIds: z.array(z.string().min(1)).optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const { serviceIds, ...data } = input;
    if (data.slug) {
      const existing = await prisma.specialist.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== id) throw new ConflictError("Специалист с таким slug уже существует");
    }

    const specialist = await prisma.$transaction(async (tx) => {
      const before = await tx.specialist.findUnique({
        where: { id },
        include: { services: true }
      });
      if (!before) throw new NotFoundError("Специалист не найден");
      const updated = await tx.specialist.update({
        where: { id },
        data: {
          ...data,
          certificates: data.certificates === "" ? null : data.certificates,
          userId: data.userId === "" ? null : data.userId
        }
      });
      if (serviceIds) {
        await tx.specialistService.deleteMany({ where: { specialistId: id } });
        if (serviceIds.length > 0) {
          await tx.specialistService.createMany({
            data: serviceIds.map((serviceId) => ({ specialistId: id, serviceId, isActive: true })),
            skipDuplicates: true
          });
        }
      }
      await writeAudit({
        tx,
        userId: user?.id,
        action: "specialist.update",
        entityType: "Specialist",
        entityId: id,
        description: "Специалист обновлен",
        beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
        afterJson: JSON.parse(JSON.stringify(updated))
      });
      return updated;
    });

    return jsonOk({ specialist });
  } catch (error) {
    return jsonError(error);
  }
}
