import { expect, test } from "@playwright/test";

test("public landing opens and booking form is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Сияние уход за кожей без лишних обещаний" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Форма онлайн-записи" })).toBeVisible();
});
