import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { calculate, defaults } from "../../src/lib/calculator";
const legacyRecord = calculate({
  ...defaults,
  entryPrice: "100000",
  stopLoss: "105000",
  symbol: "BTC",
  takeProfit: "",
});
async function fill(page: import("@playwright/test").Page) {
  await page.getByLabel("开仓价格", { exact: false }).fill("100000");
  await page.getByLabel("止损价格", { exact: false }).fill("105000");
}
test("calculation, persistence, manual target, Excel sheets, filter and delete", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await fill(page);
  await expect(page.getByLabel("止盈价格", { exact: true })).toHaveValue(
    "84640",
  );
  await page.getByRole("button", { name: "计算仓位" }).click();
  await expect(page.getByTestId("position-value")).toContainText("569.74");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Excel" }).click();
  const download = await downloadEvent;
  const book = XLSX.read(readFileSync((await download.path())!));
  expect(book.SheetNames).toEqual(["计算明细", "统计摘要"]);
  expect(XLSX.utils.sheet_to_json(book.Sheets["计算明细"])).toHaveLength(1);
  await fill(page);
  await page.getByLabel("止盈价格", { exact: true }).fill("83000");
  await page.getByLabel("开仓价格", { exact: false }).fill("100100");
  await expect(page.getByLabel("止盈价格", { exact: true })).toHaveValue(
    "83000",
  );
  await page.getByRole("button", { name: "计算仓位" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .locator(".history-filter")
    .getByRole("button", { name: "做多" })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page
    .locator(".history-filter")
    .getByRole("button", { name: "全部" })
    .click();
  await page.getByRole("button", { name: "选择删除", exact: true }).click();
  await page.locator("tbody input[type=checkbox]").first().check();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除选中 (1)" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "清空", exact: true }).click();
  await expect(page.getByText("还没有计算记录")).toBeVisible();
  expect(errors).toEqual([]);
});
test("legacy localStorage records and symbols load; keyboard reordering persists", async ({
  page,
}) => {
  await page.addInitScript((record) => {
    localStorage.setItem("positionCalcHistory", JSON.stringify([record]));
    localStorage.setItem("positionSymbolList", JSON.stringify(["BTC", "ETH"]));
  }, legacyRecord);
  await page.goto("/");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "ETH", exact: true }).click();
  await expect(page.getByLabel("交易币种")).toHaveValue("ETH");
  await page
    .getByRole("button", { name: "ETH", exact: true })
    .press("Alt+ArrowLeft");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("positionSymbolList")!),
    ),
  ).toEqual(["ETH", "BTC"]);
  await page.getByLabel("交易币种").fill("SOL");
  await page.getByRole("button", { name: "添加", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "SOL", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "删除币种 BTC", exact: true }).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("positionSymbolList")!),
    ),
  ).toEqual(["ETH", "SOL"]);
});
test("zero fee, invalid direction, empty target fallback and stale results", async ({
  page,
}) => {
  await page.goto("/");
  await fill(page);
  await page.getByLabel("手续费预设").selectOption("custom_fee");
  await page.getByLabel("Maker 费率").fill("0");
  await page.getByLabel("Taker 费率").fill("0");
  await page.getByLabel("止盈价格", { exact: true }).fill("");
  await page.getByRole("button", { name: "计算仓位" }).click();
  await expect(page.getByLabel("止盈价格", { exact: true })).toHaveValue(
    "85000",
  );
  await expect(page.getByTestId("position-value")).toContainText("580.00");
  await page.getByLabel("账户总额", { exact: false }).fill("2000");
  await expect(
    page.getByText("参数已修改，请重新计算以更新结果。"),
  ).toBeVisible();
  await page.getByLabel("止损价格", { exact: false }).fill("99000");
  await page.getByRole("button", { name: "计算仓位" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "止损价格必须大于开仓价格",
  );
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.getByLabel("账户总额", { exact: false })).toHaveValue(
    "1450",
  );
});
test("mobile layout has no page overflow before or after calculation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-empty.png",
    fullPage: true,
  });
  await fill(page);
  await page.getByRole("button", { name: "计算仓位" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-result.png",
    fullPage: true,
  });
});
test("PWA offline reload, calculation and lazy Excel export work", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("离线模式", { exact: true })).toBeVisible();
  await fill(page);
  await page.getByRole("button", { name: "计算仓位" }).click();
  await expect(page.getByTestId("position-value")).toContainText("569.74");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Excel" }).click();
  expect((await event).suggestedFilename()).toMatch(/\.xlsx$/);
});
test("corrupt legacy data is retained without overwriting", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("positionCalcHistory", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("原数据未被覆盖");
  await fill(page);
  await page.getByRole("button", { name: "计算仓位" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("positionCalcHistory")),
  ).toBe("{broken");
});
