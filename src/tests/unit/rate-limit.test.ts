import { describe, expect, it } from "vitest";
import { createRateLimitKey } from "@/lib/rate-limit";

function requestWithHeaders(headers: HeadersInit) {
  return new Request("http://localhost/api/public/appointments", { headers });
}

describe("createRateLimitKey", () => {
  it("scopes keys by request client identity without exposing raw ip", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "test-browser"
    });

    const key = createRateLimitKey(request, "public:appointment");

    expect(key).toMatch(/^public:appointment:[a-f0-9]{32}$/);
    expect(key).not.toContain("203.0.113.10");
  });

  it("creates different buckets for different clients", () => {
    const first = createRateLimitKey(
      requestWithHeaders({ "x-forwarded-for": "203.0.113.10", "user-agent": "test-browser" }),
      "public:appointment"
    );
    const second = createRateLimitKey(
      requestWithHeaders({ "x-forwarded-for": "203.0.113.11", "user-agent": "test-browser" }),
      "public:appointment"
    );

    expect(first).not.toBe(second);
  });
});
