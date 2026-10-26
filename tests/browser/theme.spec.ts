import { test, expect, type Page } from "@playwright/test";

// Check rendered colors, including the backgrounds behind transparent elements.
async function checkTextContrast(page: Page) {
  const failures = await page.evaluate(() => {
    function rgb(value: string) {
      return (value.match(/[\d.]+/g) ?? []).map(Number);
    }
    function luminance(color: number[]) {
      return color.slice(0, 3).reduce((sum, channel, index) => {
        const s = channel / 255;
        const linear = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    }
    const issues: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(
      "h1,h2,h3,label,legend,input,select,.brand-icon,.brand small,.eyebrow,.greeting p,.greeting time,.unit-tag,.segmented button,.button,.text-button,.symbol-tag button,.form-footnote,.empty-results p,.empty-metrics span,.empty-note,.metric-label,.metric-value,.metric-note,.position-amount,.position-footer,.risk-item strong,.risk-item p,.status,.notice,th,td,.time-cell,.history-subhead>span,.principles p,.principles strong,.loss-reminder,.toast,footer",
    )) {
      if (!el.getClientRects().length || el.matches(":disabled")) continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      let current: Element | null = el;
      let background: number[] = [];
      while (current) {
        const candidate = rgb(getComputedStyle(current).backgroundColor);
        if (candidate.length === 3 || candidate[3] === 1) {
          background = candidate;
          break;
        }
        current = current.parentElement;
      }
      const foreground = rgb(getComputedStyle(el).color);
      const a = luminance(foreground);
      const b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5)
        issues.push(`${el.tagName}.${el.className}: ${ratio.toFixed(2)}:1`);
    }
    return issues;
  });
  expect(failures).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [375, 1440]) {
    test(`${colorScheme} theme at ${width}px covers empty, result, validation and selection states`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 960 });
      await page.goto("/");
      const text =
        colorScheme === "dark" ? "rgb(245, 245, 247)" : "rgb(29, 29, 31)";
      const panel =
        colorScheme === "dark" ? "rgb(28, 28, 30)" : "rgb(255, 255, 255)";
      await expect(page.locator(".hero h1")).toHaveCSS("color", text);
      await expect(page.locator(".hero h1 span")).toHaveCSS("color", text);
      await expect(page.locator(".empty-results")).toHaveCSS(
        "background-color",
        panel,
      );
      await checkTextContrast(page);
      await page.getByRole("button", { name: "计算仓位" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
      await checkTextContrast(page);
      await page.getByLabel("开仓价格", { exact: false }).fill("100000");
      await page.getByLabel("止损价格", { exact: false }).fill("105000");
      await page.getByLabel("手续费预设").selectOption("custom_fee");
      await page.getByRole("button", { name: "计算仓位" }).click();
      await expect(page.getByTestId("position-value")).toContainText("569.74");
      await page.getByLabel("交易币种").fill("BTC");
      await page.getByRole("button", { name: "添加", exact: false }).click();
      await expect(page.locator(".toast")).toBeVisible();
      await page.getByRole("button", { name: "选择删除", exact: true }).click();
      await page.locator("tbody input[type=checkbox]").check();
      await checkTextContrast(page);
      await page.getByLabel("账户总额", { exact: false }).fill("1600");
      await expect(
        page.getByText("参数已修改，请重新计算以更新结果。"),
      ).toBeVisible();
      await checkTextContrast(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/theme-${colorScheme}-${width}.png`,
        fullPage: true,
      });
    });
  }
  test(`${colorScheme} warning and danger results stay legible with increased contrast`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.getByLabel("开仓价格", { exact: false }).fill("100000");
    await page.getByLabel("止损价格", { exact: false }).fill("100010");
    await page.getByLabel("杠杆倍数").selectOption("100");
    await page.getByRole("button", { name: "计算仓位" }).click();
    await expect(page.locator(".risk-item.danger").first()).toBeVisible();
    await expect(page.locator(".risk-item.warn").first()).toBeVisible();
    await expect(page.locator(".greeting.danger")).toBeVisible();
    await checkTextContrast(page);
    await page.emulateMedia({ contrast: "more" });
    await checkTextContrast(page);
  });
}

test("system appearance changes live without losing inputs, results or saved history", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByLabel("开仓价格", { exact: false }).fill("100000");
  await page.getByLabel("止损价格", { exact: false }).fill("105000");
  await page.getByRole("button", { name: "计算仓位" }).click();
  for (const colorScheme of ["dark", "light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator(".hero h1")).toHaveCSS(
      "color",
      colorScheme === "dark" ? "rgb(245, 245, 247)" : "rgb(29, 29, 31)",
    );
    await expect(page.getByLabel("开仓价格", { exact: false })).toHaveValue(
      "100000",
    );
    await expect(page.getByTestId("position-value")).toContainText("569.74");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await checkTextContrast(page);
  }
  await page.emulateMedia({ contrast: "more" });
  await checkTextContrast(page);
});

test("dark appearance works during an offline PWA reload", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".hero h1")).toHaveCSS(
    "color",
    "rgb(245, 245, 247)",
  );
  await expect(page.getByText("离线模式", { exact: true })).toBeAttached();
  await checkTextContrast(page);
});
