import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/domain/notification/template-renderer";

describe("renderTemplate", () => {
  it("replaces variables", () => {
    expect(renderTemplate("Здравствуйте, {{ name }}", { name: "Анна" })).toBe("Здравствуйте, Анна");
  });
});
