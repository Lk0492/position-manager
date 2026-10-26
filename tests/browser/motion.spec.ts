import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`sections arrive smoothly in either direction at ${width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    await expect(page.locator(".calculator")).toHaveCSS("opacity", "1");
    const rule = page.locator(".principles article").first();
    await rule.evaluate((el) => {
      const state = window as unknown as {
        arrivalCount: number;
        arrivalDuration: string;
      };
      state.arrivalCount = 0;
      el.addEventListener("animationstart", (event) => {
        if (
          event.target === el &&
          (event as AnimationEvent).animationName === "section-arrive"
        ) {
          state.arrivalCount += 1;
          state.arrivalDuration = getComputedStyle(el).animationDuration;
        }
      });
      el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { arrivalCount: number }).arrivalCount,
        ),
      )
      .toBe(1);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { arrivalDuration: string }).arrivalDuration,
      ),
    ).toBe("0.82s");
    await expect(rule).toHaveCSS("opacity", "1");
    await expect(rule).toHaveCSS("transform", "none");
    await page.evaluate(async () => {
      scrollTo({ top: 0, behavior: "instant" });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    await rule.evaluate((el) =>
      el.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { arrivalCount: number }).arrivalCount,
        ),
      )
      .toBe(2);
    await expect(rule).toHaveCSS("transform", "none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Native anchor scrolling should finish at the actual journal.
    await page.evaluate(async () => {
      scrollTo({ top: 0, behavior: "instant" });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    await page
      .locator('.site-header a[href="#history"]')
      .evaluate((el) => (el as HTMLAnchorElement).click());
    await expect
      .poll(() =>
        page
          .locator("#history")
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
      )
      .toBeLessThan(30);
  });
}

test("reduced motion and a live preference change leave all content usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  const last = page.locator(".loss-reminder");
  await last.evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
  await expect(last).toHaveCSS("opacity", "1");
  expect(await last.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-revealing]")).toHaveCount(0);
  await expect(last).toHaveCSS("transform", "none");
});

test("keyboard focus and missing observer support never hide controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const exportButton = page.getByRole("button", { name: "导出 Excel" });
  await exportButton.focus();
  await expect(exportButton).toBeFocused();
  await expect(page.locator("#history")).toHaveCSS("opacity", "1");
  await expect(page.locator("#history")).toHaveCSS("transform", "none");
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).IntersectionObserver;
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "计算仓位" })).toBeVisible();
  await expect(page.locator(".loss-reminder")).toHaveCSS("opacity", "1");
});

test("returning to the page checks updates and throttles repeated focus events", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.clock.setFixedTime(Date.now() + 120_000);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const original = registration!.update.bind(registration);
    (window as unknown as Record<string, unknown>).updateCalls = 0;
    registration!.update = async () => {
      (window as unknown as Record<string, number>).updateCalls += 1;
      return original();
    };
    window.dispatchEvent(new Event("focus"));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Record<string, number>).updateCalls,
      ),
    )
    .toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
  });
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, number>).updateCalls,
    ),
  ).toBe(1);
});
