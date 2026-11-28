import { expect, test } from "@playwright/test";

const zonePages = ["bikini", "podmyshki", "nogi", "litso", "ruki", "dlya-muzhchin"];

test.describe("laser zone pages on a narrow phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const zone of zonePages) {
    test(`${zone} fits the screen width`, async ({ page }) => {
      await page.goto(`/lazernaya-epilyatsiya/${zone}`);
      // Если что-то шире экрана, мобильный браузер расширяет layout viewport и уменьшает страницу.
      expect(await page.evaluate(() => window.innerWidth)).toBe(390);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});
