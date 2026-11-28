import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import styles from "@/app/clinic-pages.module.css";
import home from "@/app/home.module.css";
import { getPublishedReviews, type PublicReview } from "@/domain/review/public-reviews";
import list from "./reviews.module.css";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone: "Asia/Chita" });

export function ReviewCards({ reviews }: { reviews: PublicReview[] }) {
  return (
    <div className={list.list}>
      {reviews.map((review) => (
        <article key={review.id} className={list.card}>
          <span className={list.stars} aria-label={`Оценка ${review.rating} из 5`}>
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </span>
          <p className={list.text}>{review.text}</p>
          <p className={list.meta}>
            <strong>{review.name}</strong>
            <span>{dateFormat.format(review.date)}</span>
            {review.source && <span>{review.source}</span>}
          </p>
        </article>
      ))}
    </div>
  );
}

/**
 * Отзывы о специалисте или клинике. Показывает только опубликованные администратором отзывы;
 * пока их нет — приглашение оставить первый.
 */
/** Пока опубликовано меньше отзывов, блок не показывается — пустой список работает против клиники. */
export const MIN_REVIEWS_TO_SHOW = 3;

export async function ReviewsBlock({
  title,
  specialistSlug,
  topic = "laser",
  limit = 6
}: {
  title: string;
  specialistSlug?: string;
  topic?: "laser" | "cosmetology" | "clinic";
  limit?: number;
}) {
  const reviews = await getPublishedReviews({ specialistSlug, limit });
  if (reviews.length < MIN_REVIEWS_TO_SHOW) {
    return (
      <p className={list.invite}>
        Были у нас на процедуре?{" "}
        <Link href={`/otzyvy?o=${topic}#form`} className={home.textLink}>
          Расскажите, как всё прошло <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </p>
    );
  }
  return (
    <section className={styles.priceSection} aria-labelledby={`reviews-${topic}`}>
      <h2 id={`reviews-${topic}`} className={`${home.title} ${styles.sectionTitle}`}>{title}</h2>
      {reviews.length > 0 ? (
        <ReviewCards reviews={reviews} />
      ) : (
        <p className={list.empty}>
          Здесь будут отзывы пациентов. Если вы уже были у нас, расскажите о своём опыте — это поможет другим выбрать клинику.
        </p>
      )}
      <div className={list.actions}>
        <Link href={`/otzyvy?o=${topic}#form`} className={home.textLink}>
          Оставить отзыв <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        {reviews.length > 0 && (
          <Link href="/otzyvy" className={home.textLink}>
            Все отзывы <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
