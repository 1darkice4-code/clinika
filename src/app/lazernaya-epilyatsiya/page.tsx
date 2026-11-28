import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublicContacts, getPublicLaserPricing } from "@/domain/booking/public-catalog";
import { buildDirectionsUrl } from "@/lib/map";
import { formatPrice } from "@/lib/utils";
import { ClinicPage } from "../clinic-page";
import styles from "../clinic-pages.module.css";
import home from "../home.module.css";
import { RelatedDirections } from "@/components/direction/direction-landing";
import { LASER_ZONE_LINKS } from "@/content/laser-zones/pages";
import { LaserPriceList } from "@/components/pricing/laser-price-list";
import { PromoBanner } from "@/components/promo/promo-banner";
import { ReviewsBlock } from "@/components/reviews/reviews-block";
import { TrustStrip } from "@/components/trust/trust-strip";
import { LASER_COMBO, comboRegularPrice } from "@/domain/service/laser-combo";
import {
  aftercare,
  contraindications,
  courseInfo,
  howItWorks,
  MEDICAL_WARNING,
  preparation,
  questions,
  whoFits
} from "./content";
import laser from "../direction.module.css";
import { buildLaserStructuredData, serializeJsonLd } from "./structured-data";

const title = "Лазерная эпиляция в Чите";
const description =
  "Лазерная эпиляция в клинике «Сияние» в Чите. Цены по зонам, курсы на 4, 6 и 10 сеансов, адрес кабинета и онлайн-запись.";

const seoTitle = "Лазерная эпиляция в Чите — цены по зонам и курсы";

export const metadata: Metadata = {
  title: seoTitle,
  description,
  alternates: { canonical: "/lazernaya-epilyatsiya" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние",
    url: "/lazernaya-epilyatsiya",
    title: seoTitle,
    description,
    images: [{ url: "/clinic/treatment-room.webp", alt: "Кабинет лазерной эпиляции клиники «Сияние»" }]
  }
};

export const dynamic = "force-dynamic";

const laserBookingUrl = "/booking?booking=laser";


export default async function LaserHairRemovalPage() {
  const {
    contacts: { phone, address, email },
    bookableZones,
    combo,
    startingPrice
  } = await getPublicLaserPricing();

  const schemaContacts = await getPublicContacts();
  const structuredData = buildLaserStructuredData({
    ...schemaContacts,
    path: "/lazernaya-epilyatsiya",
    title,
    description,
    image: "/clinic/treatment-room.webp",
    zones: bookableZones,
    questions
  });

  return (
    <ClinicPage phone={phone} address={address} email={email}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <main id="clinic-main" tabIndex={-1}>
        <section className={laser.masthead} aria-labelledby="laser-title">
          <div className={`${home.shell} ${laser.mastheadInner}`}>
            <div className={laser.mastheadCopy}>
              <h1 id="laser-title" className={`${home.title} ${laser.mastheadTitle}`}>
                {title}
              </h1>
              <p>
                Диодный лазер для лица и тела. Один сеанс или курс на 4, 6 или 10 посещений — курс выгоднее
                до 16%.
              </p>
              <div className={styles.laserSummary}>
                {startingPrice !== null && <span>Сеанс от {formatPrice(null, startingPrice)}</span>}
                <a href={buildDirectionsUrl(address)}>
                  <MapPin size={16} aria-hidden="true" /> {address}
                </a>
              </div>
              <div className={styles.introActions}>
                <a href="#laser-prices" className={home.buttonBrass}>
                  Смотреть зоны и цены <ArrowDown size={17} aria-hidden="true" />
                </a>
                <Link href={laserBookingUrl} className={home.heroLink}>
                  Записаться <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className={laser.mastheadPhoto}>
              <Image
                src="/clinic/treatment-room.webp"
                alt="Кабинет лазерной эпиляции клиники «Сияние»"
                fill
                sizes="(max-width: 760px) 100vw, 52vw"
                preload
              />
            </div>
          </div>
        </section>

        <div className={`${home.shell} ${styles.priceContent}`}>
          <TrustStrip variant="laser" />

          {combo && (
            <section className={laser.comboOffer} aria-labelledby="laser-combo-title">
              <div>
                <h2 id="laser-combo-title">{combo.name}</h2>
                <p>
                  Две зоны за один визит · {formatPrice(null, combo.priceExact)}
                  {combo.priceExact !== null && combo.priceExact < comboRegularPrice(LASER_COMBO) && (
                    <> вместо {formatPrice(null, comboRegularPrice(LASER_COMBO))}</>
                  )}
                </p>
              </div>
              <Link
                href={`/services/${combo.slug}?utm_source=site&utm_medium=internal`}
                className={home.textLink}
              >
                Посмотреть комплекс <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </section>
          )}
          <section id="laser-prices" className={styles.priceSection} aria-labelledby="laser-prices-title">
            <h2 id="laser-prices-title" className={`${home.title} ${laser.catalogTitle}`}>Зоны и цены</h2>
            <div className={styles.laserPricePanel}>
              <LaserPriceList bookableZones={bookableZones} />
            </div>
            <RelatedDirections
              currentPath="/lazernaya-epilyatsiya"
              title="Подробнее о зонах"
              links={LASER_ZONE_LINKS}
            />
            <p className={styles.priceNotice}>
              Цены могут отличаться от актуальных. Уточнить стоимость можно по телефону{" "}
              <a href={`tel:${phone}`}>{phone}</a>.
            </p>
          </section>

          <PromoBanner />

          <section className={`${styles.priceSection} ${styles.laserEquipment}`} aria-labelledby="laser-room">
            <Image
              src="/clinic/laser-equipment.webp"
              alt="Аппарат RUIKD LAMIS рядом с креслом в кабинете «Сияния»"
              width={1160}
              height={1547}
              sizes="(max-width: 699px) 100vw, 42vw"
            />
            <div>
              <h2 id="laser-room" className={`${home.title} ${styles.sectionTitle}`}>Кабинет и аппарат</h2>
              <p className={styles.sectionDescription}>
                Лазерную эпиляцию в клинике «Сияние» проводит Нина Андреевна на аппарате RUIKD LAMIS.
              </p>
              <Link href="/specialists/nina-andreevna" className={home.textLink}>
                О специалисте <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className={styles.priceSection} aria-labelledby="laser-how">
            <div className={laser.textColumns}>
              <div>
                <h2 id="laser-how" className={`${home.title} ${styles.sectionTitle}`}>{howItWorks.title}</h2>
                {howItWorks.paragraphs.map((paragraph) => (
                  <p key={paragraph} className={laser.bodyText}>{paragraph}</p>
                ))}
              </div>
              <div>
                <h3 className={laser.subTitle}>{whoFits.title}</h3>
                <ul className={laser.bulletList}>
                  {whoFits.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section className={styles.priceSection} aria-labelledby="laser-course">
            <h2 id="laser-course" className={`${home.title} ${styles.sectionTitle}`}>{courseInfo.title}</h2>
            {courseInfo.paragraphs.map((paragraph) => (
              <p key={paragraph} className={laser.bodyText}>{paragraph}</p>
            ))}
            <p className={styles.priceNotice}>{courseInfo.note}</p>
          </section>

          <section className={styles.priceSection} aria-labelledby="laser-prep">
            <div className={laser.textColumns}>
              <div>
                <h2 id="laser-prep" className={`${home.title} ${styles.sectionTitle}`}>{preparation.title}</h2>
                <ul className={laser.bulletList}>
                  {preparation.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <p className={styles.priceNotice}>{preparation.note}</p>
              </div>
              <div>
                <h2 className={`${home.title} ${styles.sectionTitle}`}>{aftercare.title}</h2>
                <ul className={laser.bulletList}>
                  {aftercare.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <section
            className={`${styles.priceSection} ${laser.contraindications}`}
            aria-labelledby="laser-contraindications"
          >
            <h2 id="laser-contraindications" className={`${home.title} ${styles.sectionTitle}`}>
              {contraindications.title}
            </h2>
            <p className={laser.bodyText}>{contraindications.intro}</p>
            <ul className={laser.bulletList}>
              {contraindications.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className={laser.bodyText}>
              {contraindications.note} <a href={`tel:${phone}`}>{phone}</a>
            </p>
          </section>

          <ReviewsBlock title="Отзывы о лазерной эпиляции" specialistSlug="nina-andreevna" topic="laser" />

          <section className={styles.priceSection} aria-labelledby="laser-faq">
            <h2 id="laser-faq" className={`${home.title} ${styles.sectionTitle}`}>Частые вопросы</h2>
            <div className={styles.disclosureList}>
              {questions.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className={`${styles.priceSection} ${styles.laserVisit}`} aria-labelledby="laser-visit">
            <h2 id="laser-visit" className={`${home.title} ${styles.sectionTitle}`}>Запись и адрес</h2>
            <a href={buildDirectionsUrl(address)} className={home.textLink}>
              <MapPin size={16} aria-hidden="true" /> {address}
            </a>
            <div className={styles.introActions}>
              <Link href={laserBookingUrl} className={home.buttonBrass}>
                Выбрать время <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a href={`tel:${phone}`} className={home.textLink}>
                <Phone size={16} aria-hidden="true" /> {phone}
              </a>
            </div>
          </section>

          <RelatedDirections currentPath="/lazernaya-epilyatsiya" />

          <p className={laser.medicalWarning} role="note">{MEDICAL_WARNING}</p>
        </div>
      </main>
    </ClinicPage>
  );
}
