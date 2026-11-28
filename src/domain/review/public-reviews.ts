import { z } from "zod";
import { notifyAdminTelegram } from "@/domain/notification/telegram.service";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Отзывы с сайта. Новый отзыв сохраняется со статусом PENDING и появляется на сайте
 * только после того, как администратор опубликует его в CRM (раздел «Контент»).
 */
export const REVIEW_TOPICS = {
  laser: { label: "Лазерная эпиляция", specialistSlug: "nina-andreevna" },
  cosmetology: { label: "Косметология", specialistSlug: "svetlana-nersisyan" },
  clinic: { label: "Клиника в целом", specialistSlug: null }
} as const;

export type ReviewTopic = keyof typeof REVIEW_TOPICS;

export const SITE_REVIEW_SOURCE = "Сайт клиники";

export const submitReviewSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(60, "Имя — не длиннее 60 символов"),
  text: z.string().trim().min(20, "Напишите хотя бы пару предложений").max(2000, "Отзыв — не длиннее 2000 символов"),
  rating: z.number().int().min(1).max(5),
  topic: z.enum(["laser", "cosmetology", "clinic"]),
  personalDataConsentAccepted: z.literal(true, { message: "Подтвердите согласие на обработку персональных данных" }),
  honeypot: z.string().max(0).optional().or(z.literal(""))
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export async function createPublicReview(input: SubmitReviewInput) {
  const topic = REVIEW_TOPICS[input.topic];
  const specialist = topic.specialistSlug
    ? await prisma.specialist.findFirst({ where: { slug: topic.specialistSlug, deletedAt: null }, select: { id: true } })
    : null;

  const review = await prisma.review.create({
    data: {
      clientDisplayName: input.name,
      text: input.text,
      rating: input.rating,
      source: `${SITE_REVIEW_SOURCE} · ${topic.label}`,
      reviewDate: new Date(),
      status: "PENDING",
      specialistId: specialist?.id ?? null
    }
  });

  try {
    await notifyAdminTelegram(
      [`Новый отзыв на сайте (${topic.label}), ${input.rating}/5`, `${input.name}: ${input.text.slice(0, 300)}`, "Опубликовать: CRM → Контент → Отзывы"].join("\n")
    );
  } catch (error) {
    log("error", "Review notification failed", { reviewId: review.id, error: String(error).slice(0, 200) });
  }
  return review;
}

export type PublicReview = {
  id: string;
  name: string;
  text: string;
  rating: number;
  date: Date;
  source: string | null;
  specialistName: string | null;
};

/** Опубликованные отзывы; `specialistSlug` — только отзывы о конкретном специалисте. */
export async function getPublishedReviews({ specialistSlug, limit = 12 }: { specialistSlug?: string; limit?: number } = {}) {
  const reviews = await prisma.review.findMany({
    where: {
      status: "PUBLISHED",
      ...(specialistSlug ? { specialist: { slug: specialistSlug } } : {})
    },
    orderBy: { reviewDate: "desc" },
    take: limit,
    include: { specialist: { select: { firstName: true, lastName: true } } }
  });
  return reviews.map<PublicReview>((review) => ({
    id: review.id,
    name: review.clientDisplayName,
    text: review.text,
    rating: review.rating,
    date: review.reviewDate,
    source: review.source,
    specialistName: review.specialist ? `${review.specialist.firstName} ${review.specialist.lastName}`.trim() : null
  }));
}
