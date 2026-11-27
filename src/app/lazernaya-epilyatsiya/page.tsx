import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPublicLaserPricing } from "@/domain/booking/public-catalog";
import { buildDirectionsUrl } from "@/lib/map";
import { formatPrice } from "@/lib/utils";
import { ClinicPage } from "../clinic-page";
import styles from "../clinic-pages.module.css";
import home from "../home.module.css";
import { LaserPriceList } from "@/components/pricing/laser-price-list";
import laser from "./laser.module.css";

const title = "Лазерная эпиляция в Чите";
const description =
  "Лазерная эпиляция в клинике «Сияние» в Чите. Цены по зонам, курсы на 4, 6 и 10 сеансов, адрес кабинета и онлайн-запись.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/lazernaya-epilyatsiya" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Сияние",
    url: "/lazernaya-epilyatsiya",
    title,
    description,
    images: ["/clinic/treatment-room.webp"]
  }
};

export const dynamic = "force-dynamic";

const laserBookingUrl = "/booking?booking=laser";

const questions = [
  {
    question: "Можно записаться на один сеанс?",
    answer: "Да. Нажмите на название зоны в прайсе, чтобы открыть форму записи на один сеанс."
  },
  {
    question: "Как подготовиться к первому посещению?",
    answer: "Перед визитом уточните у администратора, как подготовить выбранную зону и какие ограничения важно обсудить со специалистом."
  },
  {
    question: "Нужно ли заранее покупать курс?",
    answer: "Можно начать с одного сеанса. Подходящее количество посещений и интервалы между ними можно обсудить со специалистом."
  },
  {
    question: "Как подтвердят запись?",
    answer: "Выберите зону и свободное время в форме записи. Администратор свяжется с вами, чтобы подтвердить визит."
  }
];

export default async function LaserHairRemovalPage() {
  const {
    contacts: { phone, address, email },
    bookableZones,
    combo,
    startingPrice
  } = await getPublicLaserPricing();

  return (
    <ClinicPage phone={phone} address={address} email={email}>
      <main id="clinic-main" tabIndex={-1}>
        <section className={laser.masthead} aria-labelledby="laser-title">
          <div className={`${home.shell} ${laser.mastheadInner}`}>
            <div className={laser.mastheadCopy}>
              <h1 id="laser-title" className={`${home.title} ${laser.mastheadTitle}`}>
                {title}
              </h1>
              <p>Лицо и тело. Один сеанс или курс на 4, 6 или 10 посещений.</p>
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
          {combo && (
            <section className={laser.comboOffer} aria-labelledby="laser-combo-title">
              <div>
                <h2 id="laser-combo-title">{combo.name}</h2>
                <p>Две зоны за один визит · {formatPrice(null, combo.priceExact)}</p>
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
            <p className={styles.priceNotice}>
              Цены могут отличаться от актуальных. Уточнить стоимость можно по телефону{" "}
              <a href={`tel:${phone}`}>{phone}</a>.
            </p>
          </section>

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

          <section className={styles.priceSection} aria-labelledby="laser-faq">
            <h2 id="laser-faq" className={`${home.title} ${styles.sectionTitle}`}>Перед первым визитом</h2>
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
        </div>
      </main>
    </ClinicPage>
  );
}
