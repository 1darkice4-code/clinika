import { describe, expect, it } from "vitest";
import { CURRENT_PROMO, isPromoActive, promoBookingHref, promoOffers } from "@/domain/promo/current-promo";
import { LASER_COMBOS, comboRegularPrice } from "@/domain/service/laser-combo";
import { LASER_SERVICES } from "@/domain/service/current-price-list";

describe("laser combos", () => {
  it("are cheaper than their zones booked separately", () => {
    for (const combo of LASER_COMBOS) {
      expect(combo.price).toBeLessThan(comboRegularPrice(combo));
    }
  });

  it("only use zones from the price list", () => {
    const slugs = new Set<string>(LASER_SERVICES.map((zone) => zone.slug));
    for (const combo of LASER_COMBOS) expect(combo.zoneSlugs.every((slug) => slugs.has(slug))).toBe(true);
  });
});

describe("current promo", () => {
  it("is active through the last day in Chita time and off right after", () => {
    expect(isPromoActive(new Date(`${CURRENT_PROMO.lastDay}T23:59:00+09:00`))).toBe(true);
    expect(isPromoActive(new Date(`${CURRENT_PROMO.lastDay}T23:59:59+09:00`))).toBe(true);
    const nextDay = new Date(`${CURRENT_PROMO.lastDay}T23:59:59+09:00`);
    nextDay.setSeconds(nextDay.getSeconds() + 1);
    expect(isPromoActive(nextDay)).toBe(false);
  });

  it("builds booking links that carry the promo code", () => {
    expect(promoBookingHref({ service: "laser-full-body" })).toBe(
      `/booking?booking=laser&promo=${CURRENT_PROMO.code}&service=laser-full-body`
    );
    expect(promoOffers().every((offer) => offer.bookingNote.length > 0)).toBe(true);
  });
});
