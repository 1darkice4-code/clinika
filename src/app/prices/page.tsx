import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LaserPriceList } from "@/components/pricing/laser-price-list";
import { getPublicLaserPricing } from "@/domain/booking/public-catalog";
import { COSMETOLOGY_PRICE_GROUPS, LASER_SHAVING_PRICE } from "@/domain/service/current-price-list";
import { formatPrice } from "@/lib/utils";
import { ClinicPage } from "../clinic-page";
import styles from "../clinic-pages.module.css";
import home from "../home.module.css";
import price from "./prices.module.css";

export const metadata: Metadata = {
  title: "Цены на косметологию и лазерную эпиляцию в Чите",
  description:
    "Прайс клиники «Сияние» в Чите: консультации косметолога, процедуры и лазерная эпиляция по зонам. Цены за один сеанс и курсы.",
  alternates: { canonical: "/prices" }
};

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const { contacts: { phone, address, email }, bookableZones } = await getPublicLaserPricing();

  return (
    <ClinicPage phone={phone} address={address} email={email}>
      <main id="clinic-main" tabIndex={-1}>
        <div className={price.stage}>
          <div className={home.shell}>
            <div id="price-sections" className={price.intro}>
              <div>
                <h1>Услуги и цены</h1>
                <p>{address}</p>
              </div>
              <nav className={price.jumps} aria-label="Разделы прайса">
                <a href="#laser-hair-removal">Лазерная эпиляция</a>
                <a href="#cosmetology-prices">
                  Косметология <ArrowDown size={16} aria-hidden="true" />
                </a>
              </nav>
            </div>

            <section id="laser-hair-removal" className={price.section} aria-labelledby="laser-price-title">
              <h2 id="laser-price-title" className="sr-only">Лазерная эпиляция</h2>
              <div className={styles.laserPricePanel}>
                <LaserPriceList bookableZones={bookableZones} />
              </div>
              <div className={price.notes}>
                <p>Добривание зоны при необходимости — {formatPrice(null, LASER_SHAVING_PRICE)}.</p>
                <Link href="/lazernaya-epilyatsiya">
                  О лазерной эпиляции в клинике <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </section>
          </div>
        </div>

        <div className={`${home.shell} ${styles.priceContent}`}>
          <section id="cosmetology-prices" className={price.section} aria-labelledby="cosmetology-price-title">
            <h2 id="cosmetology-price-title" className={price.title}>Косметология</h2>
            <div className={styles.disclosureList}>
              {COSMETOLOGY_PRICE_GROUPS.map((group, index) => (
                <details key={group.slug} id={group.slug} open={index === 0}>
                  <summary>{group.name}</summary>
                  <p>{group.description}</p>
                  <table className={styles.priceTable} aria-label={group.name}>
                    <thead>
                      <tr>
                        <th scope="col">Услуга</th>
                        <th scope="col">Цена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.slug}>
                          <th scope="row">{item.name}</th>
                          <td>{formatPrice(null, item.priceExact)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>
            <p className={styles.priceNotice}>
              Цены могут отличаться. Уточнить стоимость и записаться можно по телефону{" "}
              <a href={`tel:${phone}`}>{phone}</a>.
            </p>
          </section>
        </div>
      </main>
    </ClinicPage>
  );
}
