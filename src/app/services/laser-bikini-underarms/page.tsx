import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readCampaignQuery } from "@/domain/analytics/attribution";
import { getPublicBookingCatalog } from "@/domain/booking/public-catalog";
import { LASER_COMBO } from "@/domain/service/laser-combo";
import { LASER_SHAVING_PRICE } from "@/domain/service/current-price-list";
import { buildDirectionsUrl } from "@/lib/map";
import { formatPrice } from "@/lib/utils";
import { ClinicPage } from "../../clinic-page";
import home from "../../home.module.css";
import styles from "./laser-combo.module.css";

const path = `/services/${LASER_COMBO.slug}`;
const title = "Лазерная эпиляция бикини и подмышек в Чите";
const description =
  "Глубокое бикини и подмышки за один визит в клинике «Сияние». Цена за обе зоны, информация о специалисте и онлайн-запись.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { title, description, url: path, images: ["/clinic/treatment-room.webp"] }
};

export default async function LaserComboPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ services, contacts }, query] = await Promise.all([getPublicBookingCatalog(), searchParams]);
  const combo = services.find(
    (service) => service.slug === LASER_COMBO.slug && service.requiresResourceId
  );
  if (!combo || combo.priceExact === null) notFound();

  const { params } = readCampaignQuery(query);
  params.set("booking", "laser");
  params.set("service", combo.slug);
  if (!params.has("utm_campaign")) params.set("utm_campaign", LASER_COMBO.campaign);
  const bookingHref = `/booking?${params.toString()}`;
  const directionsHref = buildDirectionsUrl(contacts.address);
  const telHref = `tel:${contacts.phone.replace(/[^+\d]/g, "")}`;

  return (
    <ClinicPage {...contacts} bookingHref={bookingHref}>
      <main id="clinic-main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="combo-title">
          <div className={`${home.shell} ${styles.heroGrid}`}>
            <div className={styles.offer}>
              <Link href="/lazernaya-epilyatsiya" className={styles.back}>
                <ArrowLeft size={16} aria-hidden="true" /> Лазерная эпиляция
              </Link>
              <h1 id="combo-title" className={styles.title}>
                Глубокое бикини{" "}
                <br />
                + подмышки
              </h1>
              <p className={styles.subtitle}>Лазерная эпиляция двух зон за один визит в Чите.</p>
              <div className={styles.ticket}>
                <strong>{formatPrice(null, combo.priceExact)}</strong>
                <span>за обе зоны</span>
                <span className={styles.duration}>{combo.durationMinutes} мин на визит</span>
              </div>
              <div className={styles.actions}>
                <Link href={bookingHref} className={home.buttonBrass}>
                  Выбрать время <CalendarDays size={18} aria-hidden="true" />
                </Link>
                <a href={directionsHref} className={styles.address}>
                  <MapPin size={17} aria-hidden="true" /> {contacts.address}
                </a>
              </div>
            </div>
            <figure className={styles.room}>
              <Image
                src="/clinic/treatment-room.webp"
                alt="Кабинет лазерной эпиляции клиники «Сияние» в Чите"
                fill
                sizes="(max-width: 759px) 95vw, 52vw"
                preload
              />
            </figure>
          </div>
        </section>
        <div className={`${home.shell} ${styles.details}`}>
          <section className={styles.specialist} aria-labelledby="combo-specialist">
            <Image
              src="/doctors/nina-andreevna.png"
              alt="Нина Андреевна"
              width={240}
              height={320}
              sizes="(max-width: 450px) 30vw, 150px"
            />
            <div>
              <p>Специалист по лазерной эпиляции</p>
              <h2 id="combo-specialist">Нина Андреевна</h2>
              <p>Сургутский медицинский колледж</p>
              <Link href="/specialists/nina-andreevna" className={home.textLink}>
                О специалисте
              </Link>
            </div>
          </section>
          <section className={styles.visit} aria-labelledby="combo-visit">
            <h2 id="combo-visit">Перед визитом</h2>
            <ul>
              <li>В стоимость входит обработка обеих зон на аппарате RUIKD LAMIS.</li>
              <li>Добривание, если понадобится, оплачивается отдельно ({formatPrice(null, LASER_SHAVING_PRICE)}).</li>
              <li>При записи администратор подтвердит визит. У него можно уточнить подготовку и ограничения.</li>
            </ul>
            <a href={telHref} className={home.textLink}>
              <Phone size={16} aria-hidden="true" /> {contacts.phone}
            </a>
          </section>
        </div>
      </main>
    </ClinicPage>
  );
}
