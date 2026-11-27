import { expect, test } from "@playwright/test";

test("public landing links to a separate booking page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Клиника эстетической медицины «Сияние»", exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Форма онлайн-записи" })).toHaveCount(0);
  await page
    .getByTestId("site-header")
    .getByRole("link", { name: "Записаться", exact: true })
    .click();
  await expect(page).toHaveURL(/\/booking$/);
  await expect(page.getByRole("form", { name: "Форма онлайн-записи" })).toBeVisible();
  await expect(page.getByLabel("Имя", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Выбрать время", exact: true }).click();
  await expect(page.getByText("Выберите дату и время", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Продолжить", exact: true })).toBeDisabled();
});

test("narrow mobile landing keeps key content inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const rightEdges = await page
    .locator('[data-testid="service-card"], [data-testid="directions-link"]')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().right));
  const factOverflow = await page
    .getByTestId("hero-facts")
    .locator("p")
    .evaluateAll((elements) =>
      elements.map((element) => element.scrollWidth - element.clientWidth)
    );
  const headerRect = await page.getByTestId("site-header").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top };
  });

  expect(rightEdges.every((right) => right <= viewportWidth + 1)).toBe(true);
  expect(factOverflow.every((overflow) => overflow <= 1)).toBe(true);
  expect(headerRect.left).toBeGreaterThanOrEqual(-1);
  expect(headerRect.right).toBeLessThanOrEqual(viewportWidth + 1);
  expect(headerRect.top).toBe(0);
});

test("mobile sticky header reserves Telegram safe area", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    sessionStorage.setItem("themeOverride", "dark");
  });
  await page.goto("/");

  const measurements = await page.evaluate(() => {
    document.documentElement.style.setProperty("--tg-content-safe-area-inset-top", "47px");
    const header = document.querySelector<HTMLElement>('[data-testid="site-header"]');
    const headerRow = header?.firstElementChild as HTMLElement | null;
    const spacer = document.querySelector<HTMLElement>(".site-header-spacer");
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!header || !headerRow || !spacer) throw new Error("Header structure is missing");

    const headerRect = header.getBoundingClientRect();
    const rowRect = headerRow.getBoundingClientRect();
    return {
      headerHeight: headerRect.height,
      headerBottom: headerRect.bottom,
      rowTop: rowRect.top,
      spacerHeight: spacer.getBoundingClientRect().height,
      theme: document.documentElement.dataset.theme,
      themeColor: themeColor?.content
    };
  });

  expect(measurements.theme).toBe("dark");
  expect(measurements.themeColor).toBe("");
  expect(measurements.headerBottom).toBeGreaterThanOrEqual(111);
  expect(measurements.rowTop).toBeGreaterThanOrEqual(47);
  expect(measurements.headerHeight).toBeGreaterThanOrEqual(111);
  expect(measurements.spacerHeight).toBe(0);
});

test("laser service booking hides the operator picker (single queue)", async ({ page }) => {
  await page.goto("/booking");
  await page.getByRole("button", { name: /Лазерная эпиляция/ }).click();

  const serviceSelect = page.getByLabel("Услуга");
  await expect(page.getByLabel("Зона эпиляции")).toBeVisible();
  await expect(serviceSelect).toHaveCount(0);

  // The specialist picker must disappear and the single-queue notice appears.
  await page.getByRole("button", { name: "Выбрать время", exact: true }).click();
  await expect(page.getByLabel("Специалист")).toHaveCount(0);
  await expect(page.getByText(/все зоны записываются в общую очередь/)).toBeVisible();
});
