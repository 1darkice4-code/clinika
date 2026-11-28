import { contraindications as laserContraindications } from "@/app/lazernaya-epilyatsiya/content";
import { NINA_PERFORMER } from "@/content/directions/performers";
import type { DirectionContent, DirectionTextSection } from "@/content/directions/types";
import { LASER_SERVICES, LASER_SHAVING_PRICE } from "@/domain/service/current-price-list";
import type { DirectionOffer } from "@/lib/direction-structured-data";
import { formatPrice } from "@/lib/utils";

// Страницы лазерной эпиляции по зонам. Медицинские формулировки опираются на тексты
// основной страницы /lazernaya-epilyatsiya, согласованные врачом; новые детали по зонам
// стоит показать врачу перед выкаткой.

export const LASER_PARENT = { name: "Лазерная эпиляция", path: "/lazernaya-epilyatsiya" } as const;

type LaserZoneSlug = (typeof LASER_SERVICES)[number]["slug"];

export type LaserZonePageInput = {
  /** Последняя часть адреса: /lazernaya-epilyatsiya/<slug>. */
  slug: string;
  title: string;
  shortName: string;
  metaDescription: string;
  lead: string;
  zones: readonly LaserZoneSlug[];
  /** Подписи зон в таблице, если нужно отличие от прайса («Глубокое» → «Глубокое бикини»). */
  zoneLabels?: Partial<Record<LaserZoneSlug, string>>;
  image?: { src: string; alt: string };
  sections: DirectionContent["sections"];
  questions: DirectionContent["questions"];
  pricesNote?: string;
};

export type LaserZonePage = { content: DirectionContent; offers: DirectionOffer[]; zones: readonly LaserZoneSlug[] };

const rub = (value: number) => formatPrice(null, value);

export function zoneBookingHref(zone: string) {
  return `/booking?booking=laser&service=${zone}`;
}

export function buildLaserZonePage(input: LaserZonePageInput): LaserZonePage {
  const zones = input.zones.map((slug) => {
    const zone = LASER_SERVICES.find((item) => item.slug === slug);
    if (!zone) throw new Error(`Нет зоны ${slug} в прайсе`);
    return zone;
  });
  const minPrice = Math.min(...zones.map((zone) => zone.prices.one));
  const path = `${LASER_PARENT.path}/${input.slug}`;

  const content: DirectionContent = {
    path,
    title: input.title,
    shortName: input.shortName,
    serviceType: "Лазерная эпиляция",
    metaDescription: input.metaDescription,
    lead: input.lead,
    priceBadge: `от ${rub(minPrice)} за сеанс`,
    image: input.image ?? { src: "/clinic/laser-equipment.webp", alt: "Аппарат для лазерной эпиляции в клинике «Сияние»" },
    bookingHref: zoneBookingHref(zones[0].slug),
    bookingLabel: "Записаться",
    parent: LASER_PARENT,
    prices: {
      title: "Цены",
      head: ["Зона", "1 сеанс", "4 сеанса", "6 сеансов", "10 сеансов"],
      rows: zones.map((zone) => ({
        name: `${input.zoneLabels?.[zone.slug] ?? zone.zone} · ${zone.durationMinutes} мин`,
        cells: [rub(zone.prices.one), rub(zone.prices.four), rub(zone.prices.six), rub(zone.prices.ten)],
        href: zoneBookingHref(zone.slug)
      })),
      note:
        input.pricesNote ??
        `Курс выгоднее разовых сеансов — экономия до 16%. Если зона не подготовлена, специалист добреет её перед процедурой — ${rub(LASER_SHAVING_PRICE)}. Нажмите на зону, чтобы записаться.`
    },
    performer: NINA_PERFORMER,
    sections: input.sections,
    contraindications: laserContraindications,
    questions: input.questions
  };

  const offers: DirectionOffer[] = zones.map((zone) => ({
    name: `Лазерная эпиляция — ${(input.zoneLabels?.[zone.slug] ?? zone.zone).toLowerCase()} (1 сеанс)`,
    price: zone.prices.one,
    url: zoneBookingHref(zone.slug)
  }));

  return { content, offers, zones: input.zones };
}

/** Общие разделы, которые повторяются на страницах зон с небольшими отличиями. */
export function preparationSection(extra: readonly string[] = []): DirectionTextSection {
  return {
    title: "Подготовка",
    items: [
      "Побрейте зону за 1–2 дня до сеанса. Волосы должны быть короткими, но видимыми — около 1 мм.",
      "За 4 недели до сеанса не удаляйте волосы с корнем: воском, шугарингом, пинцетом или эпилятором.",
      "За 2 недели до сеанса не загорайте на солнце и в солярии, не используйте автозагар.",
      "В день процедуры не наносите на зону крем, дезодорант и косметику.",
      ...extra
    ]
  };
}

export function aftercareSection(extra: readonly string[] = []): DirectionTextSection {
  return {
    title: "После сеанса",
    items: [
      "Лёгкое покраснение и ощущение тепла — нормальная реакция, обычно проходит за несколько часов.",
      "2–3 дня не посещайте баню, сауну и бассейн, избегайте интенсивных тренировок.",
      "2 недели не загорайте; на открытые зоны наносите крем с SPF 50.",
      "Между сеансами волосы можно только брить — не выщипывайте их и не используйте воск.",
      ...extra
    ]
  };
}
