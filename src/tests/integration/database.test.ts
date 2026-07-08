import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe.skipIf(!process.env.DATABASE_URL)("database integration", () => {
  it("has seeded clinic settings and services", async () => {
    const [settings, services] = await Promise.all([
      prisma.clinicSettings.findFirst(),
      prisma.service.count()
    ]);

    expect(settings?.timezone).toBe("Asia/Chita");
    expect(services).toBeGreaterThanOrEqual(3);
  });
});
