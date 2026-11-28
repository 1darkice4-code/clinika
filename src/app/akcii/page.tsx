import type { Metadata } from "next";
import { ArrowUpRight, Phone } from "lucide-react";
import Link from "next/link";
import { MastheadFigure } from "@/components/direction/masthead-figure";
import { MEDICAL_WARNING, RelatedDirections } from "@/components/direction/direction-landing";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import { ClinicPage } from "@/app/clinic-page";
import promo from "@/components/promo/promo.module.css";
import { CLINIC_LEGAL, CLINIC_SITE_URL } from "@/config/clinic";
import { LASER_ZONE_LINKS } from "@/content/laser-zones/pages";
import { getPublicContacts } from "@/domain/booking/public-catalog";
import {
  CURRENT_PROMO,
  isPromoActive,
  promoBookingHref,
  promoLastDayLabel,
  promoOffers
} from "@/domain/promo/current-promo";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbNode, clinicNode, CLINIC_ID, jsonLdGraph, webPageNode, websiteNode } from "@/lib/clinic-structured-data";
import { formatPrice } from "@/lib/utils";

const title = "Акции на лазерную эпиляцию в Чите";
const description = `Акция «${CURRENT_PROMO.name}» в клинике «Сияние»: первый сеанс лазерной эпиляции −${CURRENT_PROMO.firstSessionDiscountPercent}%, комплексы «Бикини + подмышки» и «Всё тело» дешевле, «Приведи подругу».`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/akcii" },
  openGraph: { type: "website", locale: "ru_RU", siteName: "Сияние", url: "/akcii", title, description, images: [{ url: "/clinic/laser-equipment.webp", alt: "Аппарат для лазерной эпиляции в клинике «Сияние»" }] },
  twitter: { card: "summary_large_image", title, description }
};

export const dynamic = "force-dynamic";

export default async function PromoPage() {
  const contacts = await getPublicContacts();
  const active = isPromoActive();
  const offers = promoOffers();
  const lastDay = promoLastDayLabel();
  const organizer = CLINIC_LEGAL.legalName ?? "клиника «Сияние»";
  const validThrough = `${CURRENT_PROMO.lastDay}T23:59:59+09:00`;
  const catalogId = `${CLINIC_SITE_URL}/akcii#offers`;
  const structuredData = jsonLdGraph([
    clinicNode(contacts),
    websiteNode(),
    webPageNode({ path: "/akcii", name: title, description, image: "/clinic/laser-equipment.webp", about: active ? catalogId : undefined }),
    ...(active
      ? [
          {
            "@type": "OfferCatalog",
            "@id": catalogId,
            name: `Акция «${CURRENT_PROMO.name}»`,
            url: `${CLINIC_SITE_URL}/akcii`,
            itemListElement: offers
              .filter((offer) => offer.price)
              .map((offer) => ({
                "@type": "Offer",
                name: `Лазерная эпиляция: ${offer.title}`,
                price: offer.price?.now,
                priceCurrency: "RUB",
                availability: "https://schema.org/InStock",
                validThrough,
                url: `${CLINIC_SITE_URL}${offer.cta?.href ?? "/akcii"}`,
                seller: { "@id": CLINIC_ID },
                itemOffered: {
                  "@type": "Service",
                  name: `Лазерная эпиляция: ${offer.title}`,
                  serviceType: "Лазерная эпиляция",
                  provider: { "@id": CLINIC_ID }
                }
              }))
          }
        ]
      : []),
    breadcrumbNode("/akcii", [{ name: "Акции", path: "/akcii" }])
  ]);

  return (
    <ClinicPage phone={contacts.phone} address={contacts.address} email={contacts.email} bookingHref={promoBookingHref()}>
      <JsonLd data={structuredData} />
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby="promo-title">
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <p className={promo.eyebrow}>{active ? `Акция до ${lastDay}` : "Акция завершилась"}</p>
              <h1 id="promo-title" className={`${home.title} ${direction.mastheadTitle}`}>
                {CURRENT_PROMO.name}
              </h1>
              <p>
                {active
                  ? `Лазерная эпиляция в медицинской клинике — со скидкой ${CURRENT_PROMO.firstSessionDiscountPercent}% на первый сеанс и выгодными комплексами.`
                  : `Акция «${CURRENT_PROMO.name}» действовала до ${lastDay}. Актуальные цены — в прайсе, а комплексы по-прежнему дешевле зон по отдельности.`}
              </p>
              <div className={styles.introActions}>
                <Link href={active ? promoBookingHref() : "/lazernaya-epilyatsiya"} className={home.buttonBrass}>
                  {active ? "Записаться со скидкой" : "Цены на лазерную эпиляцию"} <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <a href={`tel:${contacts.phone}`} className={home.heroLink}>
                  <Phone size={16} aria-hidden="true" /> {contacts.phone}
                </a>
              </div>
            </div>
            <MastheadFigure
              src="/clinic/model-laser-goggles-2.webp"
              alt="Акция на лазерную эпиляцию: модель в защитных очках для лазера"
              width={1126}
              height={1893}
            />
          </div>
        </section>

        <div className={`${home.shell} ${styles.priceContent}`}>
          {active && (
            <section className={styles.priceSection} aria-labelledby="promo-offers">
              <h2 id="promo-offers" className={`${home.title} ${styles.sectionTitle}`}>Что входит в акцию</h2>
              <div className={promo.cards}>
                {offers.map((offer) => (
                  <article key={offer.id} className={promo.card}>
                    <span className={promo.badge}>{offer.badge}</span>
                    <h3 className={promo.cardTitle}>{offer.title}</h3>
                    {offer.price && (
                      <p className={promo.cardPrice}>
                        {formatPrice(null, offer.price.now)}
                        <span className={promo.was}>{formatPrice(null, offer.price.was)}</span>
                      </p>
                    )}
                    <p className={promo.cardText}>{offer.text}</p>
                    {offer.cta && (
                      <Link href={offer.cta.href} className={promo.cardCta}>
                        {offer.cta.label} <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {active && (
            <section className={styles.priceSection} aria-labelledby="promo-how">
              <h2 id="promo-how" className={`${home.title} ${styles.sectionTitle}`}>Как воспользоваться</h2>
              <ol className={promo.steps}>
                <li>Выберите зону или комплекс и запишитесь онлайн — акция отметится в записи автоматически. Или позвоните и скажите: «{CURRENT_PROMO.name}».</li>
                <li>Администратор подтвердит время и цену со скидкой.</li>
                <li>Перед первым сеансом специалист осмотрит кожу и проверит противопоказания — это бесплатно.</li>
              </ol>
            </section>
          )}

          <section className={styles.priceSection} aria-labelledby="promo-terms">
            <h2 id="promo-terms" className={`${home.title} ${styles.sectionTitle}`}>Условия акции</h2>
            <ul className={direction.bulletList}>
              <li>Акция «{CURRENT_PROMO.name}» действует до {lastDay} включительно. Организатор — {organizer}, Чита, {contacts.address.replace(/^Чита,\s*/, "")}.</li>
              <li>Скидка {CURRENT_PROMO.firstSessionDiscountPercent}% — на первый сеанс одной любой зоны из прайса для тех, кто раньше не делал лазерную эпиляцию в «Сиянии».</li>
              <li>Комплексы «Глубокое бикини + подмышки» и «Всё тело» — цена за один визит, для всех клиентов.</li>
              <li>«Приведи подругу»: скидка {CURRENT_PROMO.referralDiscountPercent}% на следующий сеанс — вам и подруге — после её первого визита. Подруга должна быть новым клиентом лазерной эпиляции.</li>
              <li>Скидки не суммируются между собой и с ценами курсов.</li>
              <li>Процедура проводится только при отсутствии противопоказаний — решение принимает специалист на осмотре.</li>
            </ul>
            <div className={promo.notice}>
              Цены на сайте — информационные и не являются публичной офертой. Уточнить условия можно по телефону <a href={`tel:${contacts.phone}`}>{contacts.phone}</a>.
            </div>
          </section>

          <RelatedDirections currentPath="/akcii" title="Лазерная эпиляция по зонам" links={LASER_ZONE_LINKS} />
          <p className={direction.medicalWarning} role="note">{MEDICAL_WARNING}</p>
        </div>
      </main>
    </ClinicPage>
  );
}
