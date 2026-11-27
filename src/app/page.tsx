import type { Metadata } from "next";
import { ArrowUpRight, Mail, MapPin, Phone, Plus, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CLINIC_CONTACTS, CLINIC_SITE_URL } from "@/config/clinic";
import { FEATURED_REVIEW_SOURCE_URL } from "@/domain/review/featured-reviews";
import { LASER_SERVICES, PER_UNIT_PRICE_SLUGS } from "@/domain/service/current-price-list";
import { FEATURED_SPECIALIST } from "@/domain/specialist/featured-specialist";
import { buildDirectionsUrl, buildMapEmbedUrl } from "@/lib/map";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { ClinicHero } from "./clinic-hero";
import { ClinicPage } from "./clinic-page";
import { SpecialistCarousel } from "./specialist-carousel";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

const title = "Клиника «Сияние» в Чите — косметология и лазерная эпиляция";
const description =
  "Клиника красоты и здоровья «Сияние» в Чите, ул. Суглинная, 2Б. Приём врача-косметолога, лазерная эпиляция и массаж. Цены и запись онлайн.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние",
    url: "/",
    title,
    description,
    images: ["/clinic/treatment-room.webp"]
  }
};

async function getHomeData() {
  const [categories, specialists, reviews, settings] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { sortOrder: "asc" }
        }
      }
    }),
    prisma.specialist.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { photo: true }
    }),
    prisma.review.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { reviewDate: "desc" },
      take: 6
    }),
    prisma.clinicSettings.findFirst({
      select: { phone: true, email: true, address: true, mapEmbedUrl: true }
    })
  ]);

  return { categories, specialists, reviews, settings };
}

const reviewDate = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const popularZones = [
  { slug: "laser-upper-lip", label: "Верхняя губа" },
  { slug: "laser-underarms", label: "Подмышки" },
  { slug: "laser-deep-bikini", label: "Глубокое бикини" },
  { slug: "laser-full-legs", label: "Ноги полностью" }
];
const laserZones = popularZones.flatMap(({ slug, label }) => {
  const zone = LASER_SERVICES.find((entry) => entry.slug === slug);
  return zone ? [{ slug, label, price: zone.prices.one }] : [];
});

const roomPhotos = [
  {
    src: "/clinic/consultation-room.webp",
    alt: "Белое кресло и графитовые стены в процедурном кабинете «Сияния»",
    label: "Процедурный кабинет",
    width: 1800,
    height: 1201
  },
  {
    src: "/clinic/massage-room.webp",
    alt: "Массажный стол и кресло в кабинете «Сияния»",
    label: "Кабинет массажа",
    width: 1440,
    height: 1080
  },
  {
    src: "/clinic/laser-equipment.webp",
    alt: "Аппарат для лазерной эпиляции рядом с кушеткой",
    label: "Лазерное оборудование",
    width: 1160,
    height: 1547
  }
];

type Price = { priceExact: number | null; priceFrom: number | null };

function priceFloor(services: Price[]) {
  const prices = services.flatMap((service) => {
    const price = service.priceExact ?? service.priceFrom;
    // Бесплатные услуги (например, повторный приём) не должны давать «от 0 ₽».
    return price === null || price <= 0 ? [] : [price];
  });
  return prices.length ? formatPrice(Math.min(...prices)) : "Уточнить цену";
}

function bookingLink(serviceSlug?: string, direction?: "laser" | "doctor") {
  const params = new URLSearchParams();
  if (direction) params.set("booking", direction);
  if (serviceSlug) params.set("service", serviceSlug);
  return "/booking" + (params.size ? "?" + params : "");
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ booking?: string; request?: string }>;
}) {
  const query = await searchParams;
  if (query.booking === "laser" || query.booking === "doctor" || query.request === "callback") {
    const params = new URLSearchParams();
    if (query.booking) params.set("booking", query.booking);
    if (query.request === "callback") params.set("request", "callback");
    redirect("/booking?" + params);
  }

  const { categories, specialists, reviews, settings } = await getHomeData();
  const specialistCards = specialists.map((specialist) => {
    const name = `${specialist.firstName} ${specialist.lastName}`.trim();
    const photo =
      specialist.slug === FEATURED_SPECIALIST.slug &&
      (!specialist.photo?.publicUrl || specialist.photo.publicUrl === "/doctors/svetlana-nersisyan.jpg")
        ? FEATURED_SPECIALIST.photo
        : specialist.photo;
    return { specialist, name, photo };
  });
  const phone = settings?.phone || CLINIC_CONTACTS.phone;
  const email = settings?.email || CLINIC_CONTACTS.email;
  const address = settings?.address || CLINIC_CONTACTS.address;
  const mapEmbedUrl = buildMapEmbedUrl(address, settings?.mapEmbedUrl);
  const directionsUrl = buildDirectionsUrl(address);
  const services = categories.flatMap((category) => category.services);
  const massageServices = services.filter((service) => /массаж/i.test(service.name));
  const cosmeticServices = services.filter(
    (service) => !service.requiresResourceId && !massageServices.includes(service)
  );
  // Цена за 1 единицу препарата — не цена процедуры, поэтому для «Косметология от …»
  // её не учитываем.
  const cosmeticProcedurePrices = cosmeticServices.filter((service) => !PER_UNIT_PRICE_SLUGS.has(service.slug));
  const laserPrice = priceFloor(
    LASER_SERVICES.map(({ prices }) => ({ priceExact: prices.one, priceFrom: null }))
  );
  const consultation =
    cosmeticServices.find((service) => service.slug === "cosmetologist-consultation") ??
    cosmeticServices.find((service) => /консультац/i.test(service.name));
  const clinicStructuredData = {
    "@context": "https://schema.org",
    "@type": ["MedicalClinic", "LocalBusiness"],
    "@id": `${CLINIC_SITE_URL}/#clinic`,
    name: "Клиника красоты и здоровья «Сияние»",
    url: `${CLINIC_SITE_URL}/`,
    description,
    image: `${CLINIC_SITE_URL}/clinic/treatment-room.webp`,
    logo: `${CLINIC_SITE_URL}/brand/siyanie-round.webp`,
    telephone: phone.replace(/[^+0-9]/g, ""),
    email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.replace(/^Чита,\s*/i, ""),
      addressLocality: "Чита",
      addressRegion: "Забайкальский край",
      addressCountry: "RU"
    }
  };

  return (
    <ClinicPage phone={phone} address={address}>
      <main id="clinic-main" tabIndex={-1}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(clinicStructuredData).replace(/</g, "\\u003c")
          }}
        />
        <ClinicHero address={address} />

        <section id="services" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 className={styles.title}>Выберите направление</h2>
              <Link href="/lazernaya-epilyatsiya" className={styles.textLink}>
                Лазерная эпиляция в Чите <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
              <Link href="/prices" className={styles.textLink}>
                Полный прайс <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
            </div>
            <div className={styles.serviceList}>
              <details className={styles.service} data-testid="service-card">
                <summary className={styles.serviceSummary}>
                  <span className={styles.serviceMedia}>
                    <Image
                      src="/clinic/consultation-room.webp"
                      alt=""
                      fill
                      sizes="(min-width: 900px) 34vw, (min-width: 620px) 50vw, 94vw"
                    />
                  </span>
                  <span className={styles.serviceInfo}>
                    <span className={styles.serviceName}>Косметология</span>
                    <span className={styles.servicePrice}>{priceFloor(cosmeticProcedurePrices)}</span>
                  </span>
                  <span className={styles.serviceIcon}>
                    <Plus aria-hidden="true" size={20} />
                  </span>
                </summary>
                <div className={styles.serviceBody}>
                  <p>Консультация врача, уход за кожей и эстетические процедуры.</p>
                  <ul className={styles.zoneList}>
                    <li>
                      <Link href="/botulinoterapiya">
                        <span>Ботулинотерапия</span>
                        <span>
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/konturnaya-plastika">
                        <span>Контурная пластика</span>
                        <span>
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link href="/lechenie-gipergidroza">
                        <span>Лечение гипергидроза</span>
                        <span>
                          <ArrowUpRight aria-hidden="true" size={15} />
                        </span>
                      </Link>
                    </li>
                  </ul>
                  <Link
                    href={bookingLink(consultation?.slug, "doctor")}
                    className={styles.textLink}
                  >
                    Записаться к врачу <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                </div>
              </details>
              <details className={styles.service} data-testid="service-card">
                <summary className={styles.serviceSummary}>
                  <span className={styles.serviceMedia}>
                    <Image
                      src="/clinic/laser-equipment.webp"
                      alt=""
                      fill
                      sizes="(min-width: 900px) 34vw, (min-width: 620px) 50vw, 94vw"
                    />
                  </span>
                  <span className={styles.serviceInfo}>
                    <span className={styles.serviceName}>Лазерная эпиляция</span>
                    <span className={styles.servicePrice}>{laserPrice}</span>
                  </span>
                  <span className={styles.serviceIcon}>
                    <Plus aria-hidden="true" size={20} />
                  </span>
                </summary>
                <div className={styles.serviceBody}>
                  <p>Выберите зону, чтобы перейти к доступному времени.</p>
                  <ul className={styles.zoneList}>
                    {laserZones.map((zone) => (
                      <li key={zone.slug}>
                        <Link href={bookingLink(zone.slug, "laser")}>
                          <span>{zone.label}</span>
                          <span>
                            {formatPrice(null, zone.price)}{" "}
                            <ArrowUpRight aria-hidden="true" size={15} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link href="/prices#laser-hair-removal" className={styles.textLink}>
                    Все зоны и цены <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                </div>
              </details>
              <details className={styles.service} data-testid="service-card">
                <summary className={styles.serviceSummary}>
                  <span className={styles.serviceMedia}>
                    <Image
                      src="/clinic/massage-room.webp"
                      alt=""
                      fill
                      sizes="(min-width: 900px) 34vw, (min-width: 620px) 50vw, 94vw"
                    />
                  </span>
                  <span className={styles.serviceInfo}>
                    <span className={styles.serviceName}>Массаж</span>
                    <span className={styles.servicePrice}>{priceFloor(massageServices)}</span>
                  </span>
                  <span className={styles.serviceIcon}>
                    <Plus aria-hidden="true" size={20} />
                  </span>
                </summary>
                <div className={styles.serviceBody}>
                  {massageServices.length ? (
                    <Link
                      href={bookingLink(massageServices[0].slug, "doctor")}
                      className={styles.textLink}
                    >
                      Записаться на массаж <ArrowUpRight aria-hidden="true" size={16} />
                    </Link>
                  ) : (
                    <>
                      <p>Администратор подскажет стоимость и предложит удобное время.</p>
                      <Link href="/booking?request=callback" className={styles.textLink}>
                        Попросить перезвонить <ArrowUpRight aria-hidden="true" size={16} />
                      </Link>
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>
        </section>

        {specialists.length > 0 && (
          <section id="specialists" className={styles.specialists} aria-labelledby="specialists-title">
            <div className={styles.shell}>
              <h2 id="specialists-title" className={`${styles.title} ${styles.specialistsTitle}`}>Специалисты клиники</h2>
              <SpecialistCarousel
                specialists={specialistCards.map(({ specialist, name, photo }) => ({
                  id: specialist.id, name, photoUrl: photo?.publicUrl ?? null
                }))}
              >
                {specialistCards.map(({ specialist, name, photo }) => {
                  const isLaserSpecialist = specialist.slug === "nina-andreevna";
                  return (
                    <article key={specialist.id} className={styles.doctorGrid}>
                      {photo?.publicUrl && (
                        <div className={styles.portraitMedia}>
                          <Image
                            src={photo.publicUrl}
                            alt={photo.alt ?? name}
                            width={photo.width ?? 1000}
                            height={photo.height ?? 1000}
                            sizes="(min-width: 900px) 35vw, calc(100vw - 2.3rem)"
                            className={styles.portrait}
                          />
                        </div>
                      )}
                      <div className={styles.doctorCopy}>
                        <p className={styles.position}>{specialist.position}</p>
                        <h3 className={styles.title}>{name}</h3>
                        {!isLaserSpecialist && <p className={styles.doctorDescription}>{specialist.description}</p>}
                        <dl className={styles.credentials}>
                          <div>
                            <dt>Стаж</dt>
                            <dd>
                              {specialist.experienceYears} {isLaserSpecialist ? "лет в эстетических процедурах" : "лет врачебной практики"}
                            </dd>
                          </div>
                          <div>
                            <dt>Образование</dt>
                            <dd>{specialist.education}</dd>
                          </div>
                        </dl>
                        <div className={styles.inlineActions}>
                          {isLaserSpecialist ? (
                            <Link href={bookingLink(undefined, "laser")} className={styles.buttonDark}>
                              Записаться на эпиляцию <ArrowUpRight aria-hidden="true" size={16} />
                            </Link>
                          ) : (
                            <Link href={bookingLink(consultation?.slug, "doctor")} className={styles.buttonDark}>
                              Записаться к врачу <ArrowUpRight aria-hidden="true" size={16} />
                            </Link>
                          )}
                          <Link href={`/specialists/${specialist.slug}`} className={styles.textLink}>
                            {isLaserSpecialist ? "О специалисте" : "О враче"} <ArrowUpRight aria-hidden="true" size={16} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </SpecialistCarousel>
            </div>
          </section>
        )}

        <section id="reviews" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 className={styles.title}>Отзывы пациентов</h2>
              <a
                href={FEATURED_REVIEW_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                className={styles.textLink}
              >
                Все отзывы на ПроДокторов <ArrowUpRight aria-hidden="true" size={17} />
              </a>
            </div>
            {reviews.length > 0 && (
              <>
                <div className={styles.reviews}>
                  {reviews.map((review) => (
                    <figure key={review.id} className={styles.review}>
                      <span className={styles.rating} aria-label={`Оценка ${review.rating} из 5`}>
                        <Star aria-hidden="true" size={16} fill="currentColor" /> {review.rating}/5
                      </span>
                      <blockquote>«{review.text}»</blockquote>
                      <figcaption>
                        <span>{review.clientDisplayName}</span>
                        <span>
                          {review.source} · {reviewDate.format(review.reviewDate)}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <p className={styles.reviewNote}>Отзывы сокращены без изменения смысла.</p>
              </>
            )}
          </div>
        </section>

        <section id="interior" className={styles.gallery} aria-label="Фотографии клиники">
          <div className={styles.shell}>
            <div className={styles.galleryGrid}>
              {roomPhotos.map((photo) => (
                <figure key={photo.src}>
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(min-width: 900px) 33vw, (min-width: 620px) 50vw, calc(100vw - 40px)"
                  />
                  <figcaption>{photo.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="contacts" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.contactGrid}>
              <div>
                <h2 className={styles.title}>Как нас найти</h2>
                <address className={styles.contactDetails}>
                  <p>
                    <MapPin size={19} aria-hidden="true" />
                    <span>{address}</span>
                  </p>
                  <a href={`tel:${phone}`}>
                    <Phone size={18} aria-hidden="true" />
                    <span>{phone}</span>
                  </a>
                  <a href={`mailto:${email}`}>
                    <Mail size={18} aria-hidden="true" />
                    <span>{email}</span>
                  </a>
                </address>
                <Link href="/booking" className={styles.buttonDark}>
                  Записаться <ArrowUpRight aria-hidden="true" size={16} />
                </Link>
              </div>
              <div className={styles.map}>
                <iframe
                  title="Карта проезда к клинике «Сияние»"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="directions-link"
                >
                  Построить маршрут <ArrowUpRight aria-hidden="true" size={17} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ClinicPage>
  );
}
