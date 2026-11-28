import type { Metadata } from "next";
import { ArrowUpRight, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClinicPage } from "@/app/clinic-page";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import { RelatedDirections } from "@/components/direction/direction-landing";
import { ReviewCards } from "@/components/reviews/reviews-block";
import list from "@/components/reviews/reviews.module.css";
import { JsonLd } from "@/components/seo/json-ld";
import { CLINIC_SITE_URL } from "@/config/clinic";
import { LASER_ZONE_PAGES } from "@/content/laser-zones/pages";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import { getPublishedReviews } from "@/domain/review/public-reviews";
import {
  CONSULTATION_SERVICES,
  CONTOUR_SERVICES,
  PUBLIC_HIDDEN_SERVICE_SLUGS,
  botulinumPriceRange
} from "@/domain/service/current-price-list";
import { breadcrumbNode, clinicNode, CLINIC_ID, jsonLdGraph, webPageNode, websiteNode } from "@/lib/clinic-structured-data";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

/** Фото из папки public, если в CRM фото специалиста не загружено. */
const PHOTO_FALLBACK: Record<string, string> = {
  "nina-andreevna": "/doctors/nina-andreevna.png",
  "svetlana-nersisyan": "/doctors/svetlana-nersisyan-hd.webp"
};

type ServiceRow = { name: string; price: string; href: string };

function laserRows(): ServiceRow[] {
  return LASER_ZONE_PAGES.map((page) => ({
    name: page.content.title.replace(/ в Чите$/, ""),
    price: page.content.priceBadge,
    href: page.content.path
  }));
}

function cosmetologyRows(): ServiceRow[] {
  const contourMin = Math.min(...CONTOUR_SERVICES.flatMap((item) => (item.priceExact ? [item.priceExact] : [])));
  const lipsMin = Math.min(
    ...CONTOUR_SERVICES.flatMap((item) => (/липс|lips/i.test(item.name) && item.priceExact ? [item.priceExact] : []))
  );
  const [chief] = CONSULTATION_SERVICES;
  return [
    {
      name: chief.name,
      price: formatPrice(null, chief.priceExact),
      href: "/dermatolog-kosmetolog"
    },
    { name: "Ботулинотерапия мимических морщин", price: `от ${formatPrice(null, botulinumPriceRange("wrinkles").min)} за ед.`, href: "/botulinoterapiya" },
    { name: "Лечение гипергидроза", price: `от ${formatPrice(null, botulinumPriceRange("hyperhidrosis").min)}`, href: "/lechenie-gipergidroza" },
    { name: "Контурная пластика", price: `от ${formatPrice(null, contourMin)}`, href: "/konturnaya-plastika" },
    { name: "Увеличение губ", price: `от ${formatPrice(null, lipsMin)}`, href: "/konturnaya-plastika/guby" }
  ];
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await prisma.specialist.findUnique({
    where: { slug },
    include: { seoMetadata: true, photo: true }
  });
  if (!specialist) return {};
  const name = `${specialist.firstName} ${specialist.lastName}`.trim();
  const generatedTitle = `${name} — ${specialist.position.toLowerCase()} в Чите`;
  // Вместе с « | Сияние» title должен укладываться примерно в 60 символов.
  const title =
    specialist.seoMetadata?.title ??
    (generatedTitle.length <= 52 ? generatedTitle : `${name} — ${specialist.position.toLowerCase()}`);
  const fallbackDescription = `${name} — ${specialist.position.toLowerCase()} клиники «Сияние» в Чите. Стаж ${specialist.experienceYears} лет. ${specialist.description} Онлайн-запись.`;
  const description =
    specialist.seoMetadata?.description ??
    (specialist.description.length >= 70 ? specialist.description : fallbackDescription);
  const path = `/specialists/${specialist.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "profile",
      locale: "ru_RU",
      siteName: "Сияние",
      url: path,
      title,
      description,
      images: [{ url: specialist.photo?.publicUrl ?? PHOTO_FALLBACK[specialist.slug] ?? "/clinic/treatment-room.webp", alt: name }]
    }
  };
}

export default async function SpecialistPage({ params }: PageProps) {
  const { slug } = await params;
  const specialist = await prisma.specialist.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      photo: true,
      services: { where: { isActive: true }, include: { service: true } }
    }
  });

  if (!specialist) notFound();
  const [reviews, schemaContacts] = await Promise.all([
    getPublishedReviews({ specialistSlug: specialist.slug, limit: 10 }),
    getPublicContacts()
  ]);
  const fullName = `${specialist.firstName} ${specialist.lastName}`.trim();
  const path = `/specialists/${specialist.slug}`;
  const personId = `${CLINIC_SITE_URL}${path}#person`;
  const isPhysician = /врач|дерматолог|венеролог/i.test(`${specialist.position} ${specialist.specialization}`);
  const structuredData = jsonLdGraph([
    clinicNode(schemaContacts),
    websiteNode(),
    webPageNode({ path, name: fullName, description: specialist.description, type: "ProfilePage", about: personId }),
    {
      "@type": isPhysician ? ["Person", "Physician"] : "Person",
      "@id": personId,
      name: fullName,
      jobTitle: specialist.position,
      description: specialist.description,
      url: `${CLINIC_SITE_URL}${path}`,
      ...(specialist.photo?.publicUrl
        ? { image: new URL(specialist.photo.publicUrl, CLINIC_SITE_URL).toString() }
        : {}),
      worksFor: { "@id": CLINIC_ID },
      ...(isPhysician ? { medicalSpecialty: "Dermatology" } : {}),
      ...(specialist.education
        ? {
            alumniOf: specialist.education
              .split(/;\s*/)
              .map((part) => part.split(",")[0].trim())
              .filter(Boolean)
              .map((name) => ({ "@type": "EducationalOrganization", name }))
          }
        : {})
    },
    breadcrumbNode(path, [{ name: fullName, path }])
  ]);
  const publicServices = specialist.services.filter(
    (item) => !PUBLIC_HIDDEN_SERVICE_SLUGS.has(item.service.slug)
  );
  const isLaser = /лазер/i.test(`${specialist.position} ${specialist.specialization}`);
  const rows: ServiceRow[] = isLaser
    ? laserRows()
    : isPhysician
      ? cosmetologyRows()
      : publicServices.map((item) => ({
          name: item.service.name,
          price: formatPrice(item.service.priceFrom, item.service.priceExact),
          href: `/booking?service=${item.service.slug}`
        }));
  const bookingHref = isLaser
    ? "/booking?booking=laser"
    : "/booking?booking=doctor&service=cosmetologist-consultation";
  const photoUrl = specialist.photo?.publicUrl ?? PHOTO_FALLBACK[specialist.slug] ?? null;
  const reviewTopic = isLaser ? "laser" : "cosmetology";

  return (
    <ClinicPage phone={schemaContacts.phone} address={schemaContacts.address} email={schemaContacts.email} bookingHref={bookingHref}>
      <JsonLd data={structuredData} />
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby="specialist-title">
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <nav aria-label="Хлебные крошки" className={direction.breadcrumbs}>
                <Link href="/">Главная</Link>
                <span aria-hidden="true">/</span>
                <Link href="/#specialists">Специалисты</Link>
              </nav>
              <p className={direction.specialistRole}>{specialist.position}</p>
              <h1 id="specialist-title" className={`${home.title} ${direction.mastheadTitle}`}>{fullName}</h1>
              <p>{specialist.description}</p>
              <dl className={direction.specialistFacts}>
                <div>
                  <dt>Опыт</dt>
                  <dd>
                    {specialist.experienceYears} лет{isLaser ? " в эстетических процедурах" : " врачебной практики"}
                  </dd>
                </div>
                {specialist.education && (
                  <div>
                    <dt>Образование</dt>
                    <dd>{specialist.education}</dd>
                  </div>
                )}
              </dl>
              <div className={styles.introActions}>
                <Link href={bookingHref} className={home.buttonBrass}>
                  Записаться к специалисту <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <a href={`tel:${schemaContacts.phone}`} className={home.heroLink}>
                  <Phone size={16} aria-hidden="true" /> {schemaContacts.phone}
                </a>
              </div>
            </div>
            {photoUrl && (
              <div className={`${direction.mastheadPhoto} ${direction.portrait}`}>
                <Image src={photoUrl} alt={specialist.photo?.alt ?? fullName} fill sizes="(max-width: 760px) 100vw, 40vw" preload />
              </div>
            )}
          </div>
        </section>

        <div className={`${home.shell} ${styles.priceContent}`}>
          {rows.length > 0 && (
            <section className={`${styles.priceSection} ${direction.priceBlock}`} aria-labelledby="specialist-services">
              <h2 id="specialist-services" className={`${home.title} ${styles.sectionTitle}`}>Услуги и цены</h2>
              <div className={`${styles.disclosureList} ${direction.priceTableWrap}`}>
                <table className={styles.priceTable}>
                  <thead>
                    <tr>
                      <th scope="col">Услуга</th>
                      <th scope="col">Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name}>
                        <th scope="row">
                          <Link href={row.href} className={direction.rowLink}>{row.name}</Link>
                        </th>
                        <td className={direction.priceCell}>{row.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {specialist.certificates && (
            <section className={styles.priceSection} aria-labelledby="specialist-certificates">
              <h2 id="specialist-certificates" className={`${home.title} ${styles.sectionTitle}`}>Обучение и сертификаты</h2>
              <ul className={direction.bulletList}>
                {specialist.certificates
                  .split(/\n|;\s*/)
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
            </section>
          )}

          <section className={styles.priceSection} aria-labelledby="specialist-reviews">
            <h2 id="specialist-reviews" className={`${home.title} ${styles.sectionTitle}`}>Отзывы</h2>
            {reviews.length > 0 ? (
              <ReviewCards reviews={reviews} />
            ) : (
              <p className={list.invite}>
                Отзывов на сайте пока нет. Были на приёме?{" "}
                <Link href={`/otzyvy?o=${reviewTopic}#form`} className={home.textLink}>
                  Расскажите, как всё прошло <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </p>
            )}
          </section>

          <RelatedDirections currentPath={path} />
        </div>
      </main>
    </ClinicPage>
  );
}
