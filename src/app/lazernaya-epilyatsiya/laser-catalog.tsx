"use client";

import { ArrowUpRight, Maximize, Phone } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId } from "react";
import { LASER_PRICE_GROUPS } from "@/domain/service/current-price-list";
import { formatPrice } from "@/lib/utils";
import styles from "./laser-catalog.module.css";
import type { LaserZone } from "./laser-zone-scene";

const LaserZoneScene = dynamic(() => import("./laser-zone-scene"), { ssr: false });

const formats = [
  { key: "one", count: 1, label: "1 сеанс" },
  { key: "four", count: 4, label: "4 сеанса" },
  { key: "six", count: 6, label: "6 сеансов" },
  { key: "ten", count: 10, label: "10 сеансов" }
] as const;

const mapZones = [
  { name: "Лицо", slug: "face" },
  { name: "Руки", slug: "arms" },
  { name: "Тело", slug: "body" },
  { name: "Бикини", slug: "bikini" },
  { name: "Ноги", slug: "legs" }
] as const;

const defaultZone = "legs";
const defaultLegService = "laser-shins";
const legs = LASER_PRICE_GROUPS.find(({ name }) => name === "Ноги")!;
const legServices = [
  ...legs.items.filter(({ slug }) => slug === defaultLegService),
  ...legs.items.filter(({ slug }) => slug !== defaultLegService)
];

export function LaserCatalog({
  bookableZones,
  phone,
  roomLink
}: {
  bookableZones: {
    slug: string;
    priceExact: number | null;
    priceFrom: number | null;
    durationMinutes: number;
  }[];
  phone: string;
  roomLink: string;
}) {
  const id = useId();
  const params = useSearchParams();
  const activeZone = mapZones.find(({ slug }) => slug === params.get("zone"));
  const group = LASER_PRICE_GROUPS.find(
    ({ name }) => name === activeZone?.name
  ) ?? legs;
  const zoneSlug = activeZone?.slug ?? defaultZone;
  const focus = params.get("view") === "overview" ? null : activeZone?.slug ?? null;
  const services = group === legs ? legServices : group.items;
  const service = services.find(({ slug }) => slug === params.get("service")) ?? services[0];
  const format = formats.find(({ count }) => String(count) === params.get("sessions")) ?? formats[0];
  const serviceName = (name: string) => zoneSlug === "bikini" ? `${name} бикини` : name;
  const booking = bookableZones.find(({ slug }) => slug === service.slug);
  const single = format.key === "one";
  const canBook = single && booking;
  const formattedPrice = canBook
    ? formatPrice(booking.priceFrom, booking.priceExact)
    : formatPrice(null, service.prices[format.key]);
  const action = canBook ? "Выбрать время" : single ? "Позвонить" : "Уточнить курс";
  const perSession = service.prices[format.key] / format.count;
  const sessionPrice = formatPrice(null, Math.round(perSession));

  function updateSelection(changes: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", url);
  }

  function focusOnZone(slug: LaserZone) {
    if (slug === focus) return;
    updateSelection({
      zone: slug,
      view: null,
      service: slug === zoneSlug ? params.get("service") : null
    });
  }

  return (
    <div className={styles.catalog}>
      <section className={styles.map} data-focus={focus ?? "overview"} aria-labelledby={`${id}-map`}>
        <h3 id={`${id}-map`}>Выберите зону</h3>
        <div className={styles.rings} aria-hidden="true" />
        <div className={styles.figure}>
          <Image
            src="/clinic/laser-zone-map.webp"
            alt=""
            fill
            loading="eager"
            sizes="(max-width: 760px) 58vw, 34vw"
          />
        </div>
        <LaserZoneScene
          focus={focus}
          bodySide={service.slug === "laser-abdomen" ? "front" : "back"}
          onSelect={focusOnZone}
        />
        <button
          type="button"
          className={styles.overview}
          aria-disabled={!focus}
          tabIndex={focus ? 0 : -1}
          onClick={() => {
            if (focus) updateSelection({ view: "overview" });
          }}
        >
          <Maximize size={16} aria-hidden="true" /> Общий вид
        </button>
        <div className={styles.markers} role="group" aria-label="Зоны эпиляции">
          {mapZones.map(({ name, slug }) => (
            <button
              key={slug}
              type="button"
              className={styles.marker}
              data-zone={slug}
              aria-pressed={slug === zoneSlug}
              aria-controls={`${id}-selection`}
              onClick={() => focusOnZone(slug)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.panel} id={`${id}-selection`} aria-labelledby={`${id}-zone`}>
        <div className={styles.heading}>
          <h3 id={`${id}-zone`}>{group.name}</h3>
          <p>{serviceName(service.zone)}</p>
        </div>
        <div className={styles.priceRow}>
          <div aria-live="polite" aria-atomic="true" className={styles.quote}>
            <span className="sr-only">{serviceName(service.zone)}</span>
            <strong>{formattedPrice}</strong>
            <p>
              {single
                ? `${booking?.durationMinutes ?? service.durationMinutes} мин за сеанс`
                : `Курс на ${format.label} · ${Number.isInteger(perSession) ? "" : "≈ "}${sessionPrice} за сеанс`}
            </p>
          </div>
          {canBook ? (
            <Link className={styles.action} href={`/booking?booking=laser&service=${service.slug}`}>
              {action} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <a className={styles.action} href={`tel:${phone.replace(/[^+\d]/g, "")}`}>
              {action} <Phone size={15} aria-hidden="true" />
            </a>
          )}
        </div>
        <fieldset className={styles.services}>
          <legend className={styles.legend}>Участок</legend>
          {services.map((item) => (
            <label key={item.slug} className={styles.option}>
              <input
                type="radio"
                className="sr-only"
                name={`${id}-service`}
                value={item.slug}
                checked={item.slug === service.slug}
                onChange={() => updateSelection({ service: item.slug === services[0].slug ? null : item.slug })}
              />
              <span>{serviceName(item.zone)}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.sessions}>
          <legend className={styles.legend}>Количество сеансов</legend>
          {formats.map((entry) => (
            <label key={entry.key} className={styles.option}>
              <input
                type="radio"
                className="sr-only"
                name={`${id}-sessions`}
                value={entry.count}
                checked={entry.key === format.key}
                onChange={() => updateSelection({ sessions: entry.count === 1 ? null : String(entry.count) })}
              />
              <span>{entry.label}</span>
            </label>
          ))}
        </fieldset>
        <a className={styles.room} href={roomLink}>
          <div>
            <Image
              src="/clinic/treatment-room.webp"
              alt=""
              fill
              sizes="(max-width: 1200px) 42vw, 480px"
            />
          </div>
          <span>Кабинет и аппарат <ArrowUpRight size={14} aria-hidden="true" /></span>
        </a>
      </section>
    </div>
  );
}
