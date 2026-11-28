import type { Metadata } from "next";
import Link from "next/link";
import { ClinicPage } from "@/app/clinic-page";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import { ReviewForm } from "@/components/reviews/review-form";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbNode, clinicNode, jsonLdGraph, webPageNode, websiteNode } from "@/lib/clinic-structured-data";
import { ReviewCards } from "@/components/reviews/reviews-block";
import list from "@/components/reviews/reviews.module.css";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { REVIEW_TOPICS, getPublishedReviews, type ReviewTopic } from "@/domain/review/public-reviews";

const title = "Отзывы о клинике «Сияние» в Чите";
const description =
  "Отзывы пациентов клиники «Сияние» в Чите о лазерной эпиляции и косметологии. Оставьте свой отзыв — он появится после проверки администратором.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/otzyvy" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние",
    url: "/otzyvy",
    title,
    description,
    images: [{ url: "/clinic/treatment-room.webp", alt: "Кабинет клиники «Сияние»" }]
  }
};
export const dynamic = "force-dynamic";

function parseTopic(value: string | string[] | undefined): ReviewTopic | null {
  return value === "laser" || value === "cosmetology" || value === "clinic" ? value : null;
}

export default async function ReviewsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const topic = parseTopic((await searchParams).o);
  const specialistSlug = topic ? (REVIEW_TOPICS[topic].specialistSlug ?? undefined) : undefined;
  const [contacts, reviews] = await Promise.all([
    getPublicContacts(),
    getPublishedReviews({ specialistSlug, limit: 60 })
  ]);
  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: "/otzyvy", label: "Все", active: !topic },
    { href: "/otzyvy?o=laser", label: "Лазерная эпиляция", active: topic === "laser" },
    { href: "/otzyvy?o=cosmetology", label: "Косметология", active: topic === "cosmetology" }
  ];

  const structuredData = jsonLdGraph([
    clinicNode(contacts),
    websiteNode(),
    webPageNode({ path: "/otzyvy", name: title, description, type: "CollectionPage" }),
    breadcrumbNode("/otzyvy", [{ name: "Отзывы", path: "/otzyvy" }])
  ]);

  return (
    <ClinicPage phone={contacts.phone} address={contacts.address} email={contacts.email}>
      <JsonLd data={structuredData} />
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby="reviews-title">
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <h1 id="reviews-title" className={`${home.title} ${direction.mastheadTitle}`}>Отзывы пациентов</h1>
              <p>
                Мы публикуем отзывы, которые пациенты оставляют на сайте, после проверки администратором — без правок
                по смыслу. Отзывы на других площадках остаются там.
              </p>
              <div className={styles.introActions}>
                <a href="#form" className={home.buttonBrass}>Оставить отзыв</a>
              </div>
            </div>
          </div>
        </section>

        <div className={`${home.shell} ${styles.priceContent}`}>
          <section className={styles.priceSection} aria-labelledby="reviews-list">
            <h2 id="reviews-list" className="sr-only">Отзывы</h2>
            <nav aria-label="Фильтр отзывов" className={direction.related}>
              <ul>
                {tabs.map((tab) => (
                  <li key={tab.href}>
                    <Link href={tab.href} className={home.textLink} aria-current={tab.active ? "page" : undefined}>
                      {tab.active ? <strong>{tab.label}</strong> : tab.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {reviews.length > 0 ? (
              <ReviewCards reviews={reviews} />
            ) : (
              <p className={list.empty}>Пока здесь нет отзывов. Будьте первым — форма ниже.</p>
            )}
          </section>

          <section id="form" className={styles.priceSection} aria-labelledby="review-form-title">
            <h2 id="review-form-title" className={`${home.title} ${styles.sectionTitle}`}>Оставить отзыв</h2>
            <p className={direction.bodyText}>
              Расскажите, как прошёл визит. Отзыв появится на сайте после проверки — обычно в течение дня. Мы не
              публикуем телефоны и не правим текст, кроме опечаток и персональных данных.
            </p>
            <ReviewForm defaultTopic={topic ?? "laser"} />
          </section>
        </div>
      </main>
    </ClinicPage>
  );
}
