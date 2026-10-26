import { test, expect } from "@playwright/test";

for (const width of [320, 390, 1440]) {
  test(`manual appearance overrides the system and persists at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("/");
    const control = page.getByLabel("页面外观");
    await expect(control).toBeVisible();
    await control.selectOption("dark");
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      "rgb(245, 245, 247)",
    );
    await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
    await page.reload();
    await expect(control).toHaveValue("dark");
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      "rgb(245, 245, 247)",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await control.selectOption("light");
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      "rgb(29, 29, 31)",
    );
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
    await control.selectOption("system");
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      "rgb(245, 245, 247)",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      "rgb(29, 29, 31)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("a pressed button provides visible feedback without changing its layout", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "计算仓位" });
  await button.hover();
  await page.mouse.down();
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).transform))
    .toMatch(/matrix\(0\.96/);
  await page.mouse.up();
  await expect(page.getByRole("alert")).toBeVisible();
});
