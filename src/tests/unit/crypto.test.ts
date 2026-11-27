import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const key = "test-secret-that-is-longer-than-thirty-two-characters";

describe("encrypted settings secrets", () => {
  it("round-trips without storing the plaintext", () => {
    const encrypted = encryptSecret("123456:telegram-token", key);

    expect(encrypted).not.toContain("telegram-token");
    expect(decryptSecret(encrypted, key)).toBe("123456:telegram-token");
  });

  it("cannot be decrypted with another key", () => {
    const encrypted = encryptSecret("123456:telegram-token", key);

    expect(() => decryptSecret(encrypted, `${key}-different`)).toThrow();
  });
});
