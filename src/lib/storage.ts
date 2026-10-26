import { useState } from "react";
import type { Calculation } from "./calculator";
export const HISTORY_KEY = "positionCalcHistory";
export const SYMBOLS_KEY = "positionSymbolList";
const numberFields = [
  "id",
  "accountTotal",
  "maxLossPct",
  "entryPrice",
  "stopLoss",
  "takeProfit",
  "leverage",
  "positionValue",
  "marginRequired",
  "maxLossAmount",
  "expectedProfit",
  "riskRewardRatio",
  "realLeverage",
  "marginRatioPct",
  "liqPrice",
  "totalFee",
  "openFee",
  "closeFee",
  "stopDistancePct",
  "profitDistancePct",
  "feeCostPct",
  "actualStopCostPct",
  "breakEvenPrice",
  "quantity",
  "qtyDecimals",
  "makerRate",
  "takerRate",
];
export function validHistory(value: unknown): value is Calculation[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r) =>
        r &&
        typeof r === "object" &&
        numberFields.every(
          (k) => typeof r[k] === "number" && Number.isFinite(r[k]),
        ) &&
        typeof r.time === "string" &&
        typeof r.exchange === "string" &&
        typeof r.symbol === "string" &&
        ["long", "short"].includes(r.direction),
    )
  );
}
export function validSymbols(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((s) => typeof s === "string");
}
// Write only on explicit changes: malformed or unavailable storage must not be silently overwritten at startup.
export function useLocalData<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T,
) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return { value: fallback, error: "" };
      const parsed: unknown = JSON.parse(raw);
      if (!valid(parsed)) throw new Error("invalid data");
      return { value: parsed, error: "" };
    } catch {
      return {
        value: fallback,
        error:
          "无法读取部分本地数据，原数据未被覆盖。请先备份浏览器数据，或检查存储权限。",
      };
    }
  });
  const [value, setValue] = useState<T>(initial.value);
  const [error, setError] = useState(initial.error);
  function save(next: T): boolean {
    if (initial.error) {
      setError(
        "原有数据无法读取，已暂停写入以保护数据。请先备份并处理浏览器本地存储。",
      );
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "本地保存失败，可能是存储空间不足或浏览器禁止存储。请及时导出记录。",
      );
      setValue(next);
      return false;
    }
    setValue(next);
    return true;
  }
  return { value, save, error };
}
