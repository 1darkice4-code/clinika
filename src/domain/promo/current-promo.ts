import { LASER_COMBO, LASER_FULL_BODY_COMBO, comboRegularPrice } from "@/domain/service/laser-combo";

/**
 * Текущая акция. Всё, что видит посетитель (баннеры, страница /akcii, пометка в записи),
 * берётся отсюда. Чтобы изменить условия или продлить акцию — поменяйте значения ниже.
 * После `lastDay` баннеры скрываются сами, а страница /akcii сообщает, что акция завершилась.
 */
export const CURRENT_PROMO = {
  code: "gladkiy-sezon",
  name: "Сезон гладкой кожи",
  /** Последний день акции включительно, по времени Читы. */
  lastDay: "2027-02-28",
  firstSessionDiscountPercent: 30,
  referralDiscountPercent: 15
} as const;

/** Чита — UTC+9 круглый год. */
const CHITA_OFFSET = "+09:00";

export function isPromoActive(now: Date = new Date()) {
  return now.getTime() <= new Date(`${CURRENT_PROMO.lastDay}T23:59:59${CHITA_OFFSET}`).getTime();
}

export function promoLastDayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Chita" }).format(
    new Date(`${CURRENT_PROMO.lastDay}T12:00:00${CHITA_OFFSET}`)
  );
}

export function promoBookingHref({ service, booking = "laser" }: { service?: string; booking?: "laser" | "doctor" } = {}) {
  const params = new URLSearchParams({ booking, promo: CURRENT_PROMO.code });
  if (service) params.set("service", service);
  return `/booking?${params}`;
}

export type PromoOffer = {
  id: "first-session" | "bikini-underarms" | "full-body" | "referral";
  title: string;
  price?: { now: number; was: number };
  badge: string;
  text: string;
  cta?: { label: string; href: string };
  /** Текст, который подставляется в комментарий к записи. */
  bookingNote: string;
};

export function promoOffers(): PromoOffer[] {
  const { firstSessionDiscountPercent: first, referralDiscountPercent: referral } = CURRENT_PROMO;
  return [
    {
      id: "first-session",
      title: "Первый сеанс любой зоны",
      badge: `−${first}%`,
      text: `Для тех, кто впервые делает лазерную эпиляцию в «Сиянии». Скидка ${first}% на первый сеанс любой зоны из прайса.`,
      cta: { label: "Выбрать зону", href: promoBookingHref() },
      bookingNote: `первый сеанс −${first}%`
    },
    {
      id: "bikini-underarms",
      title: "Глубокое бикини + подмышки",
      price: { now: LASER_COMBO.price, was: comboRegularPrice(LASER_COMBO) },
      badge: "комплекс",
      text: "Две самые популярные зоны за один визит — дешевле, чем по отдельности.",
      cta: { label: "Записаться", href: promoBookingHref({ service: LASER_COMBO.slug }) },
      bookingNote: "комплекс «Глубокое бикини + подмышки»"
    },
    {
      id: "full-body",
      title: "Всё тело",
      price: { now: LASER_FULL_BODY_COMBO.price, was: comboRegularPrice(LASER_FULL_BODY_COMBO) },
      badge: "комплекс",
      text: "Ноги полностью, глубокое бикини и подмышки за один визит, около 2 ч 45 мин.",
      cta: { label: "Записаться", href: promoBookingHref({ service: LASER_FULL_BODY_COMBO.slug }) },
      bookingNote: "комплекс «Всё тело»"
    },
    {
      id: "referral",
      title: "Приведи подругу",
      badge: `−${referral}% обеим`,
      text: `Подруга приходит на первый сеанс и называет ваше имя — вы обе получаете скидку ${referral}% на следующий сеанс.`,
      bookingNote: "по приглашению подруги"
    }
  ];
}
