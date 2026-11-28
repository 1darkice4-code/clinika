import { describe, expect, it } from "vitest";
import { submitReviewSchema } from "@/domain/review/public-reviews";

const valid = {
  name: "Анна",
  text: "Прошла три сеанса, всё аккуратно и спокойно, специалист всё объяснила.",
  rating: 5,
  topic: "laser" as const,
  personalDataConsentAccepted: true as const
};

describe("site review validation", () => {
  it("accepts a normal review", () => {
    expect(submitReviewSchema.parse(valid).topic).toBe("laser");
  });

  it("requires consent, a real text and a rating from 1 to 5", () => {
    expect(() => submitReviewSchema.parse({ ...valid, personalDataConsentAccepted: false })).toThrow();
    expect(() => submitReviewSchema.parse({ ...valid, text: "Хорошо" })).toThrow();
    expect(() => submitReviewSchema.parse({ ...valid, rating: 6 })).toThrow();
    expect(() => submitReviewSchema.parse({ ...valid, topic: "botox" })).toThrow();
  });

  it("rejects a filled honeypot field", () => {
    expect(() => submitReviewSchema.parse({ ...valid, honeypot: "spam" })).toThrow();
  });
});
