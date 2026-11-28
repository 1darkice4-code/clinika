import type { PrismaClient } from "@prisma/client/index";
import { LASER_COMBO_SLUGS } from "./laser-combo";
import {
  COSMETOLOGY_PRICE_GROUPS,
  CONSULTATION_SERVICES,
  LASER_CATEGORY,
  LASER_SERVICES,
  type CosmetologyPriceItem,
  type LaserPriceItem
} from "./current-price-list";

function laserDescription(item: LaserPriceItem) {
  const { one, four, six, ten } = item.prices;
  return `1 сеанс — ${one} ₽; 4 сеанса — ${four} ₽; 6 сеансов — ${six} ₽; 10 сеансов — ${ten} ₽.`;
}

function cosmetologyDescription(item: CosmetologyPriceItem, categoryName: string) {
  if (item.priceExact === null && item.priceFrom != null) {
    return `${categoryName}. Стоимость — от ${item.priceFrom.toLocaleString("ru-RU")} ₽, зависит от дозировки; препарат и дозировку врач подбирает на приёме.`;
  }
  if (item.priceExact === null) return `${categoryName}. Стоимость уточняется у администратора.`;
  if (item.priceExact === 0) return `${categoryName}. Услуга бесплатная.`;
  return `${categoryName}. Стоимость услуги — ${item.priceExact.toLocaleString("ru-RU")} ₽.`;
}

export async function publishCurrentPriceList(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const activeCategorySlugs: string[] = COSMETOLOGY_PRICE_GROUPS.map((group) => group.slug);
    const activeCosmetologySlugs: string[] = [];
    let chiefConsultation = null;

    for (const [categoryIndex, group] of COSMETOLOGY_PRICE_GROUPS.entries()) {
      const category = await tx.serviceCategory.upsert({
        where: { slug: group.slug },
        update: {
          name: group.name,
          description: group.description,
          sortOrder: categoryIndex + 1,
          isActive: true,
          deletedAt: null
        },
        create: {
          name: group.name,
          slug: group.slug,
          description: group.description,
          sortOrder: categoryIndex + 1,
          isActive: true
        }
      });

      for (const [itemIndex, item] of group.items.entries()) {
        activeCosmetologySlugs.push(item.slug);
        const description = cosmetologyDescription(item, group.name);
        const service = await tx.service.upsert({
          where: { slug: item.slug },
          update: {
            categoryId: category.id,
            requiresResourceId: null,
            name: item.name,
            shortDescription: description,
            fullDescription: `${group.description}. ${description}`,
            priceFrom: item.priceFrom ?? null,
            priceExact: item.priceExact,
            durationMinutes: item.durationMinutes,
            bufferAfterMinutes: 0,
            isActive: true,
            isFeatured: group.slug === "cosmetology-consultations",
            sortOrder: itemIndex + 1,
            deletedAt: null
          },
          create: {
            categoryId: category.id,
            name: item.name,
            slug: item.slug,
            shortDescription: description,
            fullDescription: `${group.description}. ${description}`,
            priceFrom: item.priceFrom ?? null,
            priceExact: item.priceExact,
            durationMinutes: item.durationMinutes,
            bufferAfterMinutes: 0,
            isActive: true,
            isFeatured: group.slug === "cosmetology-consultations",
            sortOrder: itemIndex + 1
          }
        });
        if (item.slug === CONSULTATION_SERVICES[0].slug) chiefConsultation = service;
      }
    }

    const laserCategory = await tx.serviceCategory.upsert({
      where: { slug: LASER_CATEGORY.slug },
      update: {
        name: LASER_CATEGORY.name,
        description: LASER_CATEGORY.description,
        sortOrder: COSMETOLOGY_PRICE_GROUPS.length + 1,
        isActive: true,
        deletedAt: null
      },
      create: {
        name: LASER_CATEGORY.name,
        slug: LASER_CATEGORY.slug,
        description: LASER_CATEGORY.description,
        sortOrder: COSMETOLOGY_PRICE_GROUPS.length + 1,
        isActive: true
      }
    });
    activeCategorySlugs.push(LASER_CATEGORY.slug);

    const laserResource = await tx.resource.upsert({
      where: { slug: "laser-machine" },
      update: { name: "Лазерный аппарат", isActive: true, deletedAt: null },
      create: { name: "Лазерный аппарат", slug: "laser-machine", isActive: true, sortOrder: 1 }
    });

    const activeLaserSlugs: string[] = [];
    for (const [index, item] of LASER_SERVICES.entries()) {
      activeLaserSlugs.push(item.slug);
      const description = laserDescription(item);
      await tx.service.upsert({
        where: { slug: item.slug },
        update: {
          categoryId: laserCategory.id,
          requiresResourceId: laserResource.id,
          name: `Лазерная эпиляция — ${item.zone}`,
          shortDescription: description,
          fullDescription: `Лазерная эпиляция зоны «${item.zone}». ${description} Добривание при необходимости оплачивается отдельно.`,
          priceFrom: null,
          priceExact: item.prices.one,
          durationMinutes: item.durationMinutes,
          bufferAfterMinutes: 0,
          contraindications:
            "Загар, повреждения кожи, беременность и индивидуальные противопоказания.",
          isActive: true,
          isFeatured: false,
          sortOrder: index + 1,
          deletedAt: null
        },
        create: {
          categoryId: laserCategory.id,
          requiresResourceId: laserResource.id,
          name: `Лазерная эпиляция — ${item.zone}`,
          slug: item.slug,
          shortDescription: description,
          fullDescription: `Лазерная эпиляция зоны «${item.zone}». ${description} Добривание при необходимости оплачивается отдельно.`,
          priceExact: item.prices.one,
          durationMinutes: item.durationMinutes,
          bufferAfterMinutes: 0,
          contraindications:
            "Загар, повреждения кожи, беременность и индивидуальные противопоказания.",
          isActive: true,
          isFeatured: false,
          sortOrder: index + 1
        }
      });
    }

    const activeServiceSlugs = [...activeCosmetologySlugs, ...activeLaserSlugs];
    await tx.service.updateMany({
      where: { slug: { notIn: [...activeServiceSlugs, ...LASER_COMBO_SLUGS] } },
      data: { isActive: false, isFeatured: false }
    });
    await tx.serviceCategory.updateMany({
      where: { slug: { notIn: activeCategorySlugs } },
      data: { isActive: false }
    });

    const specialist = await tx.specialist.findUnique({ where: { slug: "svetlana-nersisyan" } });
    if (specialist) {
      const cosmetologyServices = await tx.service.findMany({
        where: { slug: { in: activeCosmetologySlugs } },
        select: { id: true }
      });
      await tx.specialistService.updateMany({
        where: { specialistId: specialist.id },
        data: { isActive: false }
      });
      for (const service of cosmetologyServices) {
        await tx.specialistService.upsert({
          where: { specialistId_serviceId: { specialistId: specialist.id, serviceId: service.id } },
          update: { isActive: true, customPriceFrom: null, customDurationMinutes: null },
          create: { specialistId: specialist.id, serviceId: service.id, isActive: true }
        });
      }
    }

    return {
      consultation: chiefConsultation,
      cosmetologyServiceCount: activeCosmetologySlugs.length,
      laserServiceCount: activeLaserSlugs.length
    };
  });
}
