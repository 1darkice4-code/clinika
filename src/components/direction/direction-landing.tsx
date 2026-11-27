import { ArrowDown, ArrowUpRight, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ClinicPage } from "@/app/clinic-page";
import styles from "@/app/clinic-pages.module.css";
import direction from "@/app/direction.module.css";
import home from "@/app/home.module.css";
import type { DirectionContent, DirectionTextSection } from "@/content/directions/types";
import { buildDirectionStructuredData, serializeJsonLd, type DirectionOffer } from "@/lib/direction-structured-data";
import { buildDirectionsUrl } from "@/lib/map";

export const MEDICAL_WARNING = "Имеются противопоказания. Необходима консультация специалиста.";

const RELATED = [
  { path: "/lazernaya-epilyatsiya", name: "Лазерная эпиляция" },
  { path: "/botulinoterapiya", name: "Ботулинотерапия" },
  { path: "/lechenie-gipergidroza", name: "Лечение гипергидроза" },
  { path: "/konturnaya-plastika", name: "Контурная пластика" }
];

export function RelatedDirections({ currentPath }: { currentPath: string }) {
  return (
    <nav className={direction.related} aria-label="Другие направления">
      <p>Другие направления клиники</p>
      <ul>
        {RELATED.filter((item) => item.path !== currentPath).map((item) => (
          <li key={item.path}>
            <Link href={item.path} className={home.textLink}>
              {item.name} <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TextSection({ section, id, level = 2 }: { section: DirectionTextSection; id?: string; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div>
      <Heading id={id} className={level === 2 ? `${home.title} ${styles.sectionTitle}` : direction.subTitle}>
        {section.title}
      </Heading>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className={direction.bodyText}>{paragraph}</p>
      ))}
      {section.items && (
        <ul className={direction.bulletList}>
          {section.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      {section.note && <p className={styles.priceNotice}>{section.note}</p>}
    </div>
  );
}

export function DirectionLanding({
  content,
  offers,
  contacts: { phone, address, email }
}: {
  content: DirectionContent;
  offers: DirectionOffer[];
  contacts: { phone: string; address: string; email?: string };
}) {
  const structuredData = buildDirectionStructuredData({
    path: content.path,
    title: content.title,
    description: content.metaDescription,
    serviceType: content.serviceType,
    breadcrumb: content.shortName,
    phone,
    address,
    email,
    offers,
    questions: content.questions
  });
  const slug = content.path.slice(1);
  const longestWord = Math.max(...content.title.split(/\s+/).map((word) => word.length));
  const titleClass = `${home.title} ${direction.mastheadTitle} ${longestWord > 12 ? direction.mastheadTitleLong : ""}`;

  return (
    <ClinicPage phone={phone} address={address} email={email} bookingHref={content.bookingHref}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <main id="clinic-main" tabIndex={-1}>
        <section className={direction.masthead} aria-labelledby={`${slug}-title`}>
          <div className={`${home.shell} ${direction.mastheadInner}`}>
            <div className={direction.mastheadCopy}>
              <h1 id={`${slug}-title`} className={titleClass}>
                {content.title}
              </h1>
              <p>{content.lead}</p>
              <div className={styles.laserSummary}>
                <span>{content.priceBadge}</span>
                <a href={buildDirectionsUrl(address)}>
                  <MapPin size={16} aria-hidden="true" /> {address}
                </a>
              </div>
              <div className={styles.introActions}>
                <a href="#prices" className={home.buttonBrass}>
                  Смотреть цены <ArrowDown size={17} aria-hidden="true" />
                </a>
                <Link href={content.bookingHref} className={home.heroLink}>
                  {content.bookingLabel} <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className={direction.mastheadPhoto}>
              <Image src={content.image.src} alt={content.image.alt} fill sizes="(max-width: 760px) 100vw, 52vw" preload />
            </div>
          </div>
        </section>

        <div className={`${home.shell} ${styles.priceContent}`}>
          <section id="prices" className={styles.priceSection} aria-labelledby={`${slug}-prices`}>
            <h2 id={`${slug}-prices`} className={`${home.title} ${styles.sectionTitle}`}>{content.prices.title}</h2>
            <div className={`${styles.disclosureList} ${direction.priceTableWrap}`}>
              <table className={styles.priceTable}>
                <thead>
                  <tr>
                    <th scope="col">Услуга</th>
                    <th scope="col">Цена</th>
                  </tr>
                </thead>
                <tbody>
                  {content.prices.rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      <td className={direction.priceCell}>{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.priceNotice}>
              {content.prices.note} Уточнить стоимость можно по телефону <a href={`tel:${phone}`}>{phone}</a>.
            </p>
          </section>

          <section className={`${styles.priceSection} ${styles.laserEquipment}`} aria-labelledby={`${slug}-doctor`}>
            <Image
              src="/doctors/svetlana-nersisyan-hd.webp"
              alt="Врач-дерматовенеролог Светлана Арутюновна Нерсисян"
              width={1160}
              height={1547}
              sizes="(max-width: 699px) 100vw, 42vw"
            />
            <div>
              <h2 id={`${slug}-doctor`} className={`${home.title} ${styles.sectionTitle}`}>Кто проводит процедуру</h2>
              <p className={styles.sectionDescription}>
                Светлана Арутюновна Нерсисян — врач-дерматовенеролог, 29 лет врачебной практики. {content.doctorNote}
              </p>
              <Link href="/specialists/svetlana-nersisyan" className={home.textLink}>
                О враче <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </section>

          {content.sections.map((entry, index) =>
            Array.isArray(entry) ? (
              <section key={index} className={styles.priceSection} aria-label={`${entry[0].title}. ${entry[1].title}`}>
                <div className={direction.textColumns}>
                  <TextSection section={entry[0]} />
                  <TextSection section={entry[1]} />
                </div>
              </section>
            ) : (
              <section key={index} className={styles.priceSection} aria-label={(entry as DirectionTextSection).title}>
                <TextSection section={entry as DirectionTextSection} />
              </section>
            )
          )}

          <section className={`${styles.priceSection} ${direction.contraindications}`} aria-labelledby={`${slug}-contra`}>
            <h2 id={`${slug}-contra`} className={`${home.title} ${styles.sectionTitle}`}>Противопоказания</h2>
            <p className={direction.bodyText}>{content.contraindications.intro}</p>
            <ul className={direction.bulletList}>
              {content.contraindications.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className={direction.bodyText}>
              {content.contraindications.note} <a href={`tel:${phone}`}>{phone}</a>
            </p>
          </section>

          <section className={styles.priceSection} aria-labelledby={`${slug}-faq`}>
            <h2 id={`${slug}-faq`} className={`${home.title} ${styles.sectionTitle}`}>Частые вопросы</h2>
            <div className={styles.disclosureList}>
              {content.questions.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className={`${styles.priceSection} ${styles.laserVisit}`} aria-labelledby={`${slug}-visit`}>
            <h2 id={`${slug}-visit`} className={`${home.title} ${styles.sectionTitle}`}>Запись и адрес</h2>
            <a href={buildDirectionsUrl(address)} className={home.textLink}>
              <MapPin size={16} aria-hidden="true" /> {address}
            </a>
            <div className={styles.introActions}>
              <Link href={content.bookingHref} className={home.buttonBrass}>
                {content.bookingLabel} <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <a href={`tel:${phone}`} className={home.textLink}>
                <Phone size={16} aria-hidden="true" /> {phone}
              </a>
            </div>
          </section>

          <RelatedDirections currentPath={content.path} />

          <p className={direction.medicalWarning} role="note">{MEDICAL_WARNING}</p>
        </div>
      </main>
    </ClinicPage>
  );
}
