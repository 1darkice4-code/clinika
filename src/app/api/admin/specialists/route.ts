import { z } from "zod";
import { permissions } from "@/config/permissions";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { writeAudit } from "@/domain/audit/audit.service";
import { ConflictError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const schema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  slug: z.string().min(2).max(120).optional().or(z.literal("")),
  position: z.string().min(2).max(160),
  specialization: z.string().min(2).max(200),
  experienceYears: z.number().int().min(0).max(80),
  education: z.string().min(2).max(1000),
  certificates: z.string().max(2000).optional().or(z.literal("")),
  description: z.string().min(2).max(2000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  userId: z.string().min(1).nullable().optional(),
  serviceIds: z.array(z.string().min(1)).default([])
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    assertPermission(user, permissions.contentWrite);
    const input = schema.parse(await request.json());
    const slug = slugify(input.slug || `${input.firstName}-${input.lastName}`, "specialist");
    const existing = await prisma.specialist.findUnique({ where: { slug } });
    if (existing) throw new ConflictError("Специалист с таким slug уже существует");

    const specialist = await prisma.$transaction(async (tx) => {
      const created = await tx.specialist.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          slug,
          position: input.position,
          specialization: input.specialization,
          experienceYears: input.experienceYears,
          education: input.education,
          certificates: input.certificates || null,
          description: input.description,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          userId: input.userId || null
        }
      });
      if (input.serviceIds.length > 0) {
        await tx.specialistService.createMany({
          data: input.serviceIds.map((serviceId) => ({
            specialistId: created.id,
            serviceId,
            isActive: true
          })),
          skipDuplicates: true
        });
      }
      await writeAudit({
        tx,
        userId: user?.id,
        action: "specialist.create",
        entityType: "Specialist",
        entityId: created.id,
        description: "Специалист создан"
      });
      return created;
    });

    return jsonOk({ specialist }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
