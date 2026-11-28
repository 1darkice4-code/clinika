import type { PublicBookingCatalog } from "./public-catalog";
import { LASER_COMBO, LASER_FULL_BODY_COMBO } from "@/domain/service/laser-combo";

const laserAliases: Record<string, RegExp> = {
  "laser-upper-lip": /усик|усы|верхн\S* губ/,
  "laser-chin": /подбород/,
  "laser-underarms": /подмыш/,
  "laser-deep-bikini": /глубок\S*\s+бикини|бикини\s+глубок/,
  "laser-classic-bikini": /классич\S*\s+бикини|бикини\s+классич/,
  "laser-shins": /голен/,
  "laser-full-legs": /ног\S*\s+полност|полност\S*\s+ног/,
  "cosmetologist-consultation":
    /(?:главн|светлан|нерсисян).{0,28}консультац|консультац.{0,28}(?:главн|светлан|нерсисян)/,
  "cosmetologist-follow-up-consultation": /повторн.{0,20}(?:прием|консультац)/
};

export function findAssistantService(question: string, services: PublicBookingCatalog["services"]) {
  const normalized = question.toLowerCase().replaceAll("ё", "е");
  // Сначала больший комплекс: «ноги полностью + бикини + подмышки» включает «бикини + подмышки».
  for (const combo of [LASER_FULL_BODY_COMBO, LASER_COMBO]) {
    const mentioned =
      combo.zoneSlugs.every((slug) => laserAliases[slug].test(normalized)) ||
      (combo === LASER_FULL_BODY_COMBO && /вс[её]\s+тело/.test(normalized));
    if (!mentioned) continue;
    const service = services.find((item) => item.slug === combo.slug);
    if (service) return service;
  }
  const alias = services.find((service) => laserAliases[service.slug]?.test(normalized));
  if (alias) return alias;
  if (/консультац|первичн\S* прием/.test(normalized) && !/повторн/.test(normalized)) {
    return services.find(
      (service) => service.slug === "cosmetologist-consultation" || service.slug === "consultation"
    );
  }
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const generic =
    /^(цена|цены|цену|сеанс|стоит|сколько|курс|лазер|эпиляц|услуг|препар|коррек|контур|пластик|повторн|первичн|прием|полнос|запис|сдела)/;
  const tokens = words
    .filter((word) => word.length >= 4 && !generic.test(word))
    .map((word) => word.slice(0, 5));
  const matches = services
    .map((service) => {
      const name = service.name.toLowerCase().replaceAll("ё", "е");
      const score = new Set(tokens.filter((token) => name.includes(token))).size;
      return { service, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
  const best = matches[0];
  return best && best.score !== matches[1]?.score ? best.service : undefined;
}
