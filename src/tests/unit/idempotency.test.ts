import { describe, expect, it } from "vitest";
import { hashIdempotencyKey } from "@/domain/booking/idempotency";

describe("hashIdempotencyKey", () => {
  it("returns stable hash", () => {
    expect(hashIdempotencyKey("booking-key-123")).toBe(hashIdempotencyKey("booking-key-123"));
  });

  it("rejects short key", () => {
    expect(() => hashIdempotencyKey("short")).toThrow();
  });
});
