import type { PublicBookingCatalog } from "./public-catalog";
import { LASER_COMBO } from "@/domain/service/laser-combo";

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
  if (LASER_COMBO.zoneSlugs.every((slug) => laserAliases[slug].test(normalized))) {
    const combo = services.find((service) => service.slug === LASER_COMBO.slug);
    if (combo) return combo;
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
