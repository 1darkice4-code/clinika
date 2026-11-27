import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { LASER_COMBO } from "../src/domain/service/laser-combo";

const prisma = new PrismaClient();

async function publishLaserCombo() {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.service.findUnique({ where: { slug: LASER_COMBO.slug } });
    if (existing) return existing;

    const zones = await tx.service.findMany({
      where: {
        slug: { in: [...LASER_COMBO.zoneSlugs] },
        isActive: true,
        deletedAt: null,
        category: { isActive: true, deletedAt: null },
        requiresResource: { isActive: true, deletedAt: null }
      }
    });
    const [first, second] = zones;
    if (
      !first ||
      !second ||
      !first.requiresResourceId ||
      first.requiresResourceId !== second.requiresResourceId ||
      first.categoryId !== second.categoryId ||
      first.currency !== second.currency ||
      first.priceExact === null ||
      second.priceExact === null
    ) {
      throw new Error("Для комплекса нужны две активные зоны с фиксированной ценой и общим аппаратом.");
    }

    return tx.service.upsert({
      where: { slug: LASER_COMBO.slug },
      update: {},
      create: {
        slug: LASER_COMBO.slug,
        name: LASER_COMBO.name,
        categoryId: first.categoryId,
        requiresResourceId: first.requiresResourceId,
        shortDescription: "Лазерная эпиляция двух зон за один визит.",
        fullDescription: "Лазерная эпиляция глубокого бикини и подмышек за один визит.",
        currency: first.currency,
        priceExact: first.priceExact + second.priceExact,
        durationMinutes: first.durationMinutes + second.durationMinutes,
        bufferBeforeMinutes: Math.max(first.bufferBeforeMinutes, second.bufferBeforeMinutes),
        bufferAfterMinutes: Math.max(first.bufferAfterMinutes, second.bufferAfterMinutes),
        sortOrder: 100
      }
    });
  });
}

publishLaserCombo()
  .then(({ slug, priceExact, durationMinutes, isActive, deletedAt }) => {
    console.info({ slug, priceExact, durationMinutes, active: isActive && !deletedAt });
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
