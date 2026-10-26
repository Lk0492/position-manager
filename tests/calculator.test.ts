import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  autoTakeProfit,
  calculate,
  defaults,
  presets,
  riskChecks,
  type FormValues,
} from "../src/lib/calculator";
import { validHistory } from "../src/lib/storage";
const legacy = readFileSync(new URL("./legacy.html", import.meta.url), "utf8");
function extract(name: string) {
  const start = legacy.indexOf(`function ${name}(`);
  return legacy.slice(start, legacy.indexOf("\n}", start) + 2);
}
function legacyCalculate(form: FormValues) {
  const elements: Record<string, { value: string }> = Object.fromEntries(
    Object.entries(form).map(([k, value]) => [k, { value }]),
  );
  elements.symbolInput = { value: form.symbol };
  const start = legacy.indexOf("function calculate()");
  const end = legacy.indexOf(
    "  document.getElementById('resultCard').style.display = 'block';",
    start,
  );
  const recordStart = legacy.indexOf("    const record = {", end);
  const recordEnd = legacy.indexOf("\n    };", recordStart) + 7;
  const source = `${extract("getFeeRates")}\n${extract("getQuantityDecimals")}\n${extract("fmt")}\nfunction validate(){ return {ok:true}; }\nfunction hideValidation(){}\nfunction genId(){return 1;}\nfunction fmtTime(){return 'legacy';}\n${legacy.slice(start, end)}\n${legacy.slice(recordStart, recordEnd)}\nreturn record;\n}\ncalculate();`;
  return vm.runInNewContext(source, {
    document: {
      getElementById: (id: string) => elements[id],
      querySelector: () => ({ value: form.direction }),
    },
  });
}
const base: FormValues = {
  ...defaults,
  entryPrice: "100000",
  stopLoss: "105000",
  takeProfit: "84000",
  symbol: "BTC",
};
describe("legacy calculation parity", () => {
  for (const direction of ["long", "short"] as const)
    for (const feePreset of Object.keys(presets)) {
      it(`${direction} / ${feePreset}`, () => {
        const form = {
          ...base,
          direction,
          feePreset,
          stopLoss: direction === "long" ? "95000" : "105000",
          takeProfit: direction === "long" ? "116000" : "84000",
        };
        const before = legacyCalculate(form),
          after = calculate(form);
        for (const key of Object.keys(before)) {
          if (["id", "time"].includes(key)) continue;
          const actual = after[key as keyof typeof after];
          if (typeof actual === "number")
            expect(actual, key).toBeCloseTo(before[key], 8);
          else expect(actual, key).toEqual(before[key]);
        }
      });
    }
  it("custom fees and fractional prices match legacy", () => {
    const form = {
      ...base,
      entryPrice: "0.123456",
      stopLoss: "0.13",
      takeProfit: "0.10",
      feePreset: "custom_fee",
      customFeeTaker: "0.032",
      customFeeMaker: "0.01",
    };
    const before = legacyCalculate(form),
      after = calculate(form);
    expect(after.positionValue).toBeCloseTo(before.positionValue, 8);
    expect(after.expectedProfit).toBeCloseTo(before.expectedProfit, 8);
  });
});
describe("edge cases and risk limits", () => {
  it("empty target computes instead of throwing the legacy initialization error", () => {
    const result = calculate({ ...base, takeProfit: "" });
    expect(result.takeProfit).toBe(84640);
    expect(result.riskRewardRatio).toBeCloseTo(3, 10);
  });
  it("automatic target agrees with the previous input event formula", () => {
    const elements: Record<string, { value: string }> = Object.fromEntries(
      Object.entries(base).map(([k, value]) => [k, { value }]),
    );
    const source = `${extract("getFeeRates")}\n${extract("autoCalculateTakeProfit")}\nautoCalculateTakeProfit();`;
    vm.runInNewContext(source, {
      document: {
        getElementById: (id: string) => elements[id],
        querySelector: () => ({ value: "short" }),
      },
    });
    expect(autoTakeProfit(base)).toBe(String(elements.takeProfit.value));
  });
  it("zero custom fees stay zero", () => {
    const result = calculate({
      ...base,
      feePreset: "custom_fee",
      customFeeMaker: "0",
      customFeeTaker: "0",
      takeProfit: "",
    });
    expect(result.totalFee).toBe(0);
    expect(result.takeProfit).toBe(85000);
    expect(result.riskRewardRatio).toBeCloseTo(3);
  });
  it("sub-cent target remains positive and keeps meaningful precision", () => {
    const result = calculate({
      ...base,
      direction: "long",
      entryPrice: "0.000012",
      stopLoss: "0.000011",
      takeProfit: "",
    });
    expect(result.takeProfit).toBeCloseTo(0.0000150432, 12);
    expect(result.riskRewardRatio).toBeCloseTo(3, 6);
  });
  it.each([
    { entryPrice: "Infinity" },
    { accountTotal: "-1" },
    { stopLoss: "99000" },
    { takeProfit: "105000" },
    { maxLossPercent: "100" },
    { customFeeTaker: "-1", feePreset: "custom_fee" },
    { takeProfit: "NaN" },
  ])("rejects invalid input %o", (patch) => {
    expect(() => calculate({ ...base, ...patch })).toThrow();
  });
  it("flags insufficient funds, fee impact, high leverage, and bad reward", () => {
    const r = calculate({
      ...base,
      stopLoss: "100010",
      takeProfit: "99999",
      leverage: "50",
      maxLossPercent: "5",
    });
    const checks = riskChecks(r);
    expect(checks).toHaveLength(7);
    expect(checks.find((c) => c.title === "盈亏比")?.level).toBe("danger");
    expect(checks.find((c) => c.title === "手续费影响")?.level).toBe("danger");
    expect(checks.find((c) => c.title === "杠杆倍数")?.level).toBe("warn");
    expect(
      riskChecks(calculate({ ...base, stopLoss: "100010", leverage: "1" }))[0]
        .level,
    ).toBe("danger");
  });
  it("accepts the legacy record schema without transformation", () => {
    expect(validHistory([legacyCalculate(base)])).toBe(true);
  });
  it("rejects corrupt storage and non-finite values", () => {
    expect(validHistory({})).toBe(false);
    expect(validHistory([{ ...calculate(base), positionValue: null }])).toBe(
      false,
    );
  });
});
