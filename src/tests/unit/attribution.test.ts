import { describe, expect, it } from "vitest";
import { inferSource } from "@/domain/analytics/attribution";

describe("inferSource", () => {
  it("prefers utm source", () => {
    expect(inferSource({ utmSource: "yandex", referrer: "https://example.com" })).toBe("yandex");
  });

  it("falls back to referrer host", () => {
    expect(inferSource({ referrer: "https://example.com/path" })).toBe("example.com");
  });
});
