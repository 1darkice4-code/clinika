import { describe, expect, it } from "vitest";
import {
  BOTULINUM_SERVICES,
  CONTOUR_SERVICES,
  CONSULTATION_SERVICES,
  CONSULTATION_SERVICE,
  LASER_PRICE_GROUPS,
  LASER_SERVICES,
  LASER_SHAVING_PRICE
} from "@/domain/service/current-price-list";

describe("current public price list", () => {
  it("contains the consultation prices", () => {
    expect(CONSULTATION_SERVICES.map((item) => item.priceExact)).toEqual([2000, 1000, 0]);
    expect(CONSULTATION_SERVICE.priceExact).toBe(2000);
    expect(CONSULTATION_SERVICE.durationMinutes).toBe(30);
    expect(CONSULTATION_SERVICE.bufferAfterMinutes).toBe(0);
    expect(CONSULTATION_SERVICE.slug).toBe("cosmetologist-consultation");
  });

  it("contains botulinum and contour services", () => {
    expect(BOTULINUM_SERVICES).toHaveLength(10);
    expect(CONTOUR_SERVICES).toHaveLength(37);
    expect(
      CONTOUR_SERVICES.find((item) => item.slug === "contour-aesthefill-10")?.priceExact
    ).toBeNull();
    expect(CONTOUR_SERVICES.find((item) => item.slug === "contour-radiesse-3")?.priceExact).toBe(
      55000
    );
  });

  it("contains all 16 laser zones with unique slugs and four course prices", () => {
    expect(LASER_SERVICES).toHaveLength(16);
    expect(new Set(LASER_SERVICES.map((item) => item.slug)).size).toBe(16);
    expect(LASER_PRICE_GROUPS.map((group) => group.name)).toEqual([
      "Лицо",
      "Руки",
      "Ноги",
      "Бикини",
      "Тело"
    ]);
    expect(LASER_SERVICES.find((item) => item.slug === "laser-underarms")?.prices).toEqual({
      one: 1490,
      four: 5600,
      six: 8000,
      ten: 12000
    });
    expect(LASER_SERVICES.find((item) => item.slug === "laser-full-legs")?.prices).toEqual({
      one: 4290,
      four: 16000,
      six: 23100,
      ten: 36000
    });
    expect(LASER_SHAVING_PRICE).toBe(500);
    expect(LASER_SERVICES.find((item) => item.slug === "laser-upper-lip")?.durationMinutes).toBe(
      15
    );
    expect(LASER_SERVICES.find((item) => item.slug === "laser-full-legs")?.durationMinutes).toBe(
      90
    );
  });
});
