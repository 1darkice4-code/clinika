import { LASER_SERVICES } from "./current-price-list";

export type LaserCombo = {
  slug: string;
  name: string;
  campaign: string;
  zoneSlugs: readonly string[];
  /** Цена комплекса за визит. Должна быть ниже суммы зон — иначе комплекс не нужен. */
  price: number;
};

export const LASER_COMBO = {
  slug: "laser-bikini-underarms",
  name: "Глубокое бикини + подмышки",
  campaign: "laser_bikini_underarms",
  zoneSlugs: ["laser-deep-bikini", "laser-underarms"],
  price: 3490
} as const satisfies LaserCombo;

export const LASER_FULL_BODY_COMBO = {
  slug: "laser-full-body",
  name: "Всё тело: ноги полностью + глубокое бикини + подмышки",
  campaign: "laser_full_body",
  zoneSlugs: ["laser-full-legs", "laser-deep-bikini", "laser-underarms"],
  price: 5990
} as const satisfies LaserCombo;

export const LASER_COMBOS: readonly LaserCombo[] = [LASER_COMBO, LASER_FULL_BODY_COMBO];

export const LASER_COMBO_SLUGS: ReadonlySet<string> = new Set(LASER_COMBOS.map((combo) => combo.slug));

/** Сумма разовых сеансов зон комплекса — «старая» цена для сравнения. */
export function comboRegularPrice(combo: LaserCombo) {
  return combo.zoneSlugs.reduce((sum, slug) => {
    const zone = LASER_SERVICES.find((item) => item.slug === slug);
    if (!zone) throw new Error(`Нет зоны ${slug} в прайсе`);
    return sum + zone.prices.one;
  }, 0);
}
