import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { assertResourceExists } from "@/app/api/admin/resources/validate";
import { ConflictError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const schema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(120).optional().or(z.literal("")),
  shortDescription: z.string().min(2).max(500),
  fullDescription: z.string().min(2).max(5000),
  priceFrom: z.number().int().nonnegative().nullable().optional(),
  priceExact: z.number().int().nonnegative().nullable().optional(),
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().nonnegative().default(0),
  bufferAfterMinutes: z.number().int().nonnegative().default(10),
  contraindications: z.string().max(2000).optional().or(z.literal("")),
  disclaimer: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  requiresResourceId: z.string().min(1).nullable().optional()
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const input = schema.parse(await request.json());
    const slug = slugify(input.slug || input.name, "service");
    const existing = await prisma.service.findUnique({ where: { slug } });
    if (existing) throw new ConflictError("Услуга с таким slug уже существует");
    await assertResourceExists(input.requiresResourceId);

    const service = await prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          categoryId: input.categoryId,
          name: input.name,
          slug,
          shortDescription: input.shortDescription,
          fullDescription: input.fullDescription,
          priceFrom: input.priceFrom,
          priceExact: input.priceExact,
          durationMinutes: input.durationMinutes,
          bufferBeforeMinutes: input.bufferBeforeMinutes,
          bufferAfterMinutes: input.bufferAfterMinutes,
          contraindications: input.contraindications || null,
          disclaimer: input.disclaimer || null,
          isActive: input.isActive,
          isFeatured: input.isFeatured,
          sortOrder: input.sortOrder,
          requiresResourceId: input.requiresResourceId ?? null
        }
      });
      await writeAudit({
        tx,
        userId: user?.id,
        action: "service.create",
        entityType: "Service",
        entityId: created.id,
        description: "Услуга создана"
      });
      return created;
    });

    return jsonOk({ service }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
