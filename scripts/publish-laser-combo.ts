import "dotenv/config";
import { PrismaClient } from "@prisma/client/index";
import { LASER_COMBOS, comboRegularPrice, type LaserCombo } from "../src/domain/service/laser-combo";

const prisma = new PrismaClient();

async function publishCombo(combo: LaserCombo) {
  if (combo.price >= comboRegularPrice(combo)) {
    throw new Error(`Комплекс ${combo.slug} должен стоить меньше суммы зон.`);
  }
  return prisma.$transaction(async (tx) => {
    const zones = await tx.service.findMany({
      where: {
        slug: { in: [...combo.zoneSlugs] },
        isActive: true,
        deletedAt: null,
        category: { isActive: true, deletedAt: null },
        requiresResource: { isActive: true, deletedAt: null }
      }
    });
    const [first] = zones;
    if (
      zones.length !== combo.zoneSlugs.length ||
      !first?.requiresResourceId ||
      zones.some(
        (zone) =>
          zone.requiresResourceId !== first.requiresResourceId ||
          zone.categoryId !== first.categoryId ||
          zone.currency !== first.currency
      )
    ) {
      throw new Error(`Для комплекса ${combo.slug} нужны активные зоны с общим аппаратом и категорией.`);
    }

    const data = {
      name: combo.name,
      categoryId: first.categoryId,
      requiresResourceId: first.requiresResourceId,
      shortDescription: `Лазерная эпиляция ${zones.length} зон за один визит.`,
      fullDescription: `Лазерная эпиляция за один визит: ${zones.map((zone) => zone.name.replace(/^Лазерная эпиляция — /, "").toLowerCase()).join(", ")}.`,
      currency: first.currency,
      priceFrom: null,
      priceExact: combo.price,
      durationMinutes: zones.reduce((sum, zone) => sum + zone.durationMinutes, 0),
      bufferBeforeMinutes: Math.max(...zones.map((zone) => zone.bufferBeforeMinutes)),
      bufferAfterMinutes: Math.max(...zones.map((zone) => zone.bufferAfterMinutes)),
      isActive: true,
      deletedAt: null
    };
    return tx.service.upsert({
      where: { slug: combo.slug },
      update: data,
      create: { ...data, slug: combo.slug, sortOrder: 100 }
    });
  });
}

async function publishLaserCombos() {
  const results = [];
  for (const combo of LASER_COMBOS) results.push(await publishCombo(combo));
  return results;
}

publishLaserCombos()
  .then((services) => {
    for (const { slug, priceExact, durationMinutes, isActive } of services) {
      console.info({ slug, priceExact, durationMinutes, active: isActive });
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
