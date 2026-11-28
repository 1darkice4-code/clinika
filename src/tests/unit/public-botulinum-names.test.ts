import { describe, expect, it } from "vitest";
import { botulinoterapiya } from "@/content/directions/botulinoterapiya";
import { dermatologKosmetolog } from "@/content/directions/dermatolog-kosmetolog";
import { konturnayaPlastika } from "@/content/directions/konturnaya-plastika";
import { uvelichenieGub } from "@/content/directions/uvelichenie-gub";
import { lechenieGipergidroza } from "@/content/directions/lechenie-gipergidroza";
import {
  BOTULINUM_PUBLIC_SERVICES,
  BOTULINUM_SERVICES,
  PER_UNIT_PRICE_SLUGS,
  PUBLIC_COSMETOLOGY_PRICE_GROUPS,
  PUBLIC_HIDDEN_SERVICE_SLUGS
} from "@/domain/service/current-price-list";

// Торговые названия препаратов, которые применяет клиника, не должны попадать на публичные страницы.
// Бытовое слово «ботокс» допустимо — согласовано с юристом клиники.
const BRAND_PATTERN = /диспорт|релатокс|ксеомин|миотокс|новокутан|dysport|relatox|xeomin/i;

describe("public botulinum names", () => {
  it("hides every brand-named botulinum service from the public price list", () => {
    expect(BOTULINUM_SERVICES.every((item) => PUBLIC_HIDDEN_SERVICE_SLUGS.has(item.slug))).toBe(true);
    const publicNames = PUBLIC_COSMETOLOGY_PRICE_GROUPS.flatMap((group) => group.items.map((item) => item.name));
    expect(publicNames.filter((name) => BRAND_PATTERN.test(name))).toEqual([]);
  });

  it("offers generic botulinum services with 'from' prices taken from the brand list", () => {
    expect(BOTULINUM_PUBLIC_SERVICES.map((item) => [item.slug, item.priceFrom])).toEqual([
      ["botulinum-wrinkles", 150],
      ["botulinum-hyperhidrosis", 15000]
    ]);
    expect(BOTULINUM_PUBLIC_SERVICES.some((item) => BRAND_PATTERN.test(item.name))).toBe(false);
    expect(PER_UNIT_PRICE_SLUGS.has("botulinum-wrinkles")).toBe(true);
  });

  it("keeps brand names out of the direction page texts", () => {
    for (const content of [botulinoterapiya, lechenieGipergidroza, konturnayaPlastika, uvelichenieGub, dermatologKosmetolog]) {
      expect(JSON.stringify(content)).not.toMatch(BRAND_PATTERN);
    }
  });
});
