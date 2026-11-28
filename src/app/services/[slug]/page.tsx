import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { ClinicPage } from "@/app/clinic-page";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import { MEDICAL_WARNING, RelatedDirections } from "@/components/direction/direction-landing";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { zonePagePathForService } from "@/content/laser-zones/pages";
import { PUBLIC_HIDDEN_SERVICE_SLUGS } from "@/domain/service/current-price-list";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

// Страницы отдельных услуг — это одна строка прайса (цена и длительность) и почти
// дублируют друг друга. Закрываем их от индексации (noindex, follow), чтобы поисковики
// продвигали /lazernaya-epilyatsiya и /prices, а не десятки «малоценных» страниц.
// Комплекс laser-bikini-underarms имеет собственную страницу и индексируется,
// а зоны лазерной эпиляции перенаправляются на страницы /lazernaya-epilyatsiya/<зона>.

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

// Страница направления для категории услуги — ссылка «О процедуре» и хлебные крошки.
const DIRECTION_FOR_CATEGORY: Record<string, { path: string; name: string }> = {
  "contour-plastic": { path: "/konturnaya-plastika", name: "Контурная пластика" },
  "botulinum-therapy": { path: "/botulinoterapiya", name: "Ботулинотерапия" },
  "cosmetology-consultations": { path: "/prices#cosmetology-prices", name: "Косметология" }
};

// Публичные адреса для услуг ботулинотерапии (см. PUBLIC_HIDDEN_SERVICE_SLUGS).
const DIRECTION_BY_SERVICE_PREFIX: [prefix: string, path: string][] = [
  ["hyperhidrosis-", "/lechenie-gipergidroza"],
  ["botulinum-hyperhidrosis", "/lechenie-gipergidroza"],
  ["wrinkles-", "/botulinoterapiya"],
  ["botulinum-wrinkles", "/botulinoterapiya"]
];

function directionPathFor(slug: string) {
  return (
    zonePagePathForService(slug) ??
    DIRECTION_BY_SERVICE_PREFIX.find(([prefix]) => slug.startsWith(prefix))?.[1] ??
    null
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await prisma.service.findUnique({ where: { slug }, include: { seoMetadata: true } });
  if (!service) return {};

  return {
    title: service.seoMetadata?.title ?? service.name,
    description: service.seoMetadata?.description ?? service.shortDescription,
    alternates: { canonical: `/services/${service.slug}` },
    robots: { index: false, follow: true }
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const directionPath = directionPathFor(slug);
  if (PUBLIC_HIDDEN_SERVICE_SLUGS.has(slug) || directionPath) {
    permanentRedirect(directionPath ?? "/prices");
  }
  const service = await prisma.service.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      specialistServices: {
        where: { isActive: true },
        include: { specialist: true }
      }
    }
  });

  if (!service) notFound();

  const contacts = await getPublicContacts();
  const bookingHref = `/booking?${new URLSearchParams({ booking: service.requiresResourceId ? "laser" : "doctor", service: service.slug })}`;
  const directionLink = DIRECTION_FOR_CATEGORY[service.category.slug] ?? null;

  return (
    <ClinicPage phone={contacts.phone} address={contacts.address} email={contacts.email} bookingHref={bookingHref}>
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby="service-title">
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <nav aria-label="Хлебные крошки" className={direction.breadcrumbs}>
                <Link href="/">Главная</Link>
                <span aria-hidden="true">/</span>
                <Link href={directionLink?.path ?? "/prices"}>{directionLink?.name ?? "Цены"}</Link>
              </nav>
              <p className={direction.specialistRole}>{service.category.name}</p>
              <h1 id="service-title" className={`${home.title} ${direction.mastheadTitle} ${direction.mastheadTitleLong}`}>
                {service.name}
              </h1>
              <p>{service.shortDescription}</p>
              <dl className={direction.specialistFacts}>
                <div>
                  <dt>Стоимость</dt>
                  <dd>{formatPrice(service.priceFrom, service.priceExact)}</dd>
                </div>
                <div>
                  <dt>Длительность</dt>
                  <dd>{service.durationMinutes} мин</dd>
                </div>
              </dl>
              <div className={styles.introActions}>
                <Link href={bookingHref} className={home.buttonBrass}>
                  Выбрать время <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                {directionLink && (
                  <Link href={directionLink.path} className={home.heroLink}>
                    О процедуре <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
        <div className={`${home.shell} ${styles.priceContent}`}>
          <section className={styles.priceSection} aria-labelledby="service-about">
            <h2 id="service-about" className={`${home.title} ${styles.sectionTitle}`}>Описание</h2>
            <p className={direction.bodyText} style={{ whiteSpace: "pre-line" }}>{service.fullDescription}</p>
            {service.contraindications && <p className={styles.priceNotice}>{service.contraindications}</p>}
            {service.disclaimer && <p className={direction.bodyText}>{service.disclaimer}</p>}
          </section>
          <RelatedDirections currentPath={`/services/${service.slug}`} />
          <p className={direction.medicalWarning} role="note">{MEDICAL_WARNING}</p>
        </div>
      </main>
    </ClinicPage>
  );
}
