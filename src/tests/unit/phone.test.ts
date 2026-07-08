import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/domain/client/phone";

describe("normalizePhone", () => {
  it("normalizes Russian local phone", () => {
    expect(normalizePhone("8 (999) 123-45-67")).toBe("+79991234567");
  });

  it("normalizes phone without country prefix", () => {
    expect(normalizePhone("9991234567")).toBe("+79991234567");
  });

  it("rejects invalid phone", () => {
    expect(() => normalizePhone("123")).toThrow("Укажите корректный телефон");
  });
});
