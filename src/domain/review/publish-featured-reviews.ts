import type { PrismaClient } from "@prisma/client/index";
import { FEATURED_SPECIALIST } from "@/domain/specialist/featured-specialist";
import { FEATURED_REVIEWS, FEATURED_REVIEW_SOURCE } from "./featured-reviews";

const PLACEHOLDER_REVIEW_TEXTS = [
  "Пришла без понимания, какая процедура нужна. Все спокойно объяснили, ничего не навязывали.",
  "Записалась через сайт, администратор быстро перезвонил и помог выбрать удобное время."
];

export async function publishFeaturedReviews(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const specialist = await tx.specialist.findUniqueOrThrow({
      where: { slug: FEATURED_SPECIALIST.slug },
      select: { id: true }
    });

    await tx.review.deleteMany({
      where: {
        OR: [
          { source: FEATURED_REVIEW_SOURCE },
          { text: { in: PLACEHOLDER_REVIEW_TEXTS } }
        ]
      }
    });

    await tx.review.createMany({
      data: FEATURED_REVIEWS.map((review) => ({
        ...review,
        source: FEATURED_REVIEW_SOURCE,
        status: "PUBLISHED" as const,
        specialistId: specialist.id
      }))
    });

    return FEATURED_REVIEWS.length;
  });
}
