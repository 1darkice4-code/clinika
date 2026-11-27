import type { PrismaClient } from "@prisma/client/index";
import { CONSULTATION_SERVICE } from "@/domain/service/current-price-list";
import { FEATURED_SPECIALIST, PLACEHOLDER_SPECIALIST_SLUGS } from "./featured-specialist";

type PublishOptions = {
  userId?: string;
};

export async function publishFeaturedSpecialist(
  prisma: PrismaClient,
  options: PublishOptions = {}
) {
  return prisma.$transaction(async (tx) => {
    const photo = await tx.mediaFile.upsert({
      where: { storageKey: FEATURED_SPECIALIST.photo.storageKey },
      update: FEATURED_SPECIALIST.photo,
      create: FEATURED_SPECIALIST.photo
    });

    const existing = await tx.specialist.findUnique({ where: { slug: FEATURED_SPECIALIST.slug } });
    const legacyPrimary = existing
      ? null
      : await tx.specialist.findUnique({ where: { slug: PLACEHOLDER_SPECIALIST_SLUGS[0] } });
    const data = {
      firstName: FEATURED_SPECIALIST.firstName,
      lastName: FEATURED_SPECIALIST.lastName,
      slug: FEATURED_SPECIALIST.slug,
      photoMediaId: photo.id,
      position: FEATURED_SPECIALIST.position,
      specialization: FEATURED_SPECIALIST.specialization,
      experienceYears: FEATURED_SPECIALIST.experienceYears,
      education: FEATURED_SPECIALIST.education,
      certificates: FEATURED_SPECIALIST.certificates,
      description: FEATURED_SPECIALIST.description,
      sortOrder: FEATURED_SPECIALIST.sortOrder,
      isActive: true,
      deletedAt: null,
      ...(options.userId ? { userId: options.userId } : {})
    };

    const specialist = existing
      ? await tx.specialist.update({ where: { id: existing.id }, data })
      : legacyPrimary
        ? await tx.specialist.update({ where: { id: legacyPrimary.id }, data })
        : await tx.specialist.create({ data });

    const placeholders = await tx.specialist.findMany({
      where: {
        slug: { in: [...PLACEHOLDER_SPECIALIST_SLUGS] },
        id: { not: specialist.id }
      },
      select: { id: true }
    });
    const placeholderIds = placeholders.map((item) => item.id);

    if (placeholderIds.length > 0) {
      await tx.specialist.updateMany({
        where: { id: { in: placeholderIds } },
        data: { isActive: false, deletedAt: new Date() }
      });
      await tx.resourceOperator.updateMany({
        where: { specialistId: { in: placeholderIds } },
        data: { isActive: false }
      });
      await tx.specialistService.updateMany({
        where: { specialistId: { in: placeholderIds } },
        data: { isActive: false }
      });
    }

    const services = await tx.service.findMany({
      where: { slug: CONSULTATION_SERVICE.slug, isActive: true, deletedAt: null },
      select: { id: true }
    });
    await tx.specialistService.updateMany({
      where: {
        specialistId: specialist.id,
        serviceId: { notIn: services.map((service) => service.id) }
      },
      data: { isActive: false }
    });
    for (const service of services) {
      await tx.specialistService.upsert({
        where: { specialistId_serviceId: { specialistId: specialist.id, serviceId: service.id } },
        update: { isActive: true },
        create: { specialistId: specialist.id, serviceId: service.id, isActive: true }
      });
    }

    const resources = await tx.resource.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true }
    });
    for (const resource of resources) {
      await tx.resourceOperator.upsert({
        where: {
          resourceId_specialistId: { resourceId: resource.id, specialistId: specialist.id }
        },
        update: { isActive: true },
        create: { resourceId: resource.id, specialistId: specialist.id, isActive: true }
      });
    }

    const scheduleCount = await tx.workSchedule.count({ where: { specialistId: specialist.id } });
    if (scheduleCount === 0) {
      await tx.workSchedule.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          specialistId: specialist.id,
          weekday,
          startsAtLocalTime: "09:00",
          endsAtLocalTime: "18:00",
          breaksJson: [{ startsAtLocalTime: "13:00", endsAtLocalTime: "14:00" }]
        }))
      });
    }

    return specialist;
  });
}
