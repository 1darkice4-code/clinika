import { describe, expect, it } from "vitest";
import { themeForHour } from "@/lib/theme";

describe("themeForHour", () => {
  it("uses the light theme during the day", () => {
    expect(themeForHour(7)).toBe("light");
    expect(themeForHour(12)).toBe("light");
    expect(themeForHour(19)).toBe("light");
  });

  it("uses the dark theme at night", () => {
    expect(themeForHour(20)).toBe("dark");
    expect(themeForHour(0)).toBe("dark");
    expect(themeForHour(6)).toBe("dark");
  });
});
