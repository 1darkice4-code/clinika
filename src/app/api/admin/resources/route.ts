import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { assertOperatorsExist } from "@/app/api/admin/resources/validate";
import { ConflictError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const schema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  operatorIds: z.array(z.string().min(1)).default([])
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const input = schema.parse(await request.json());
    const slug = slugify(input.slug || input.name, "resource");
    const existing = await prisma.resource.findUnique({ where: { slug } });
    if (existing) throw new ConflictError("Ресурс с таким slug уже существует");
    await assertOperatorsExist(input.operatorIds);

    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          name: input.name,
          slug,
          isActive: input.isActive,
          sortOrder: input.sortOrder
        }
      });
      if (input.operatorIds.length > 0) {
        await tx.resourceOperator.createMany({
          data: input.operatorIds.map((specialistId) => ({
            resourceId: created.id,
            specialistId,
            isActive: true
          })),
          skipDuplicates: true
        });
      }
      await writeAudit({
        tx,
        userId: user?.id,
        action: "resource.create",
        entityType: "Resource",
        entityId: created.id,
        description: "Ресурс создан"
      });
      return created;
    });

    return jsonOk({ resource }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
