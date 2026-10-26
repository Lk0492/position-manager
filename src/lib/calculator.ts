export type Direction = "long" | "short";
export interface FormValues {
  exchange: string;
  direction: Direction;
  accountTotal: string;
  maxLossPercent: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  leverage: string;
  feePreset: string;
  customFeeMaker: string;
  customFeeTaker: string;
  symbol: string;
}
export const defaults: FormValues = {
  exchange: "binance",
  direction: "short",
  accountTotal: "1450",
  maxLossPercent: "2",
  entryPrice: "",
  stopLoss: "",
  takeProfit: "",
  leverage: "2",
  feePreset: "binance_futures_custom",
  customFeeMaker: "0.018",
  customFeeTaker: "0.045",
  symbol: "",
};
export const exchanges: Record<string, string> = {
  binance: "币安",
  okx: "OKX",
  bybit: "Bybit",
  huobi: "火币",
  custom: "自定义",
};
export const presets: Record<
  string,
  { label: string; maker: number; taker: number }
> = {
  binance_futures_custom: {
    label: "币安 U 本位合约 · 0.045% / 0.018%",
    maker: 0.018,
    taker: 0.045,
  },
  binance_futures: {
    label: "币安合约 · 0.050% / 0.020%",
    maker: 0.02,
    taker: 0.05,
  },
  binance_spot: { label: "币安现货 · 0.100% / 0.100%", maker: 0.1, taker: 0.1 },
  okx_futures: {
    label: "OKX 合约 · 0.050% / 0.020%",
    maker: 0.02,
    taker: 0.05,
  },
  bybit_futures: {
    label: "Bybit 合约 · 0.060% / 0.020%",
    maker: 0.02,
    taker: 0.06,
  },
  huobi_futures: {
    label: "火币合约 · 0.050% / 0.020%",
    maker: 0.02,
    taker: 0.05,
  },
};
export interface Calculation {
  id: number;
  time: string;
  exchange: string;
  symbol: string;
  direction: Direction;
  accountTotal: number;
  maxLossPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
  positionValue: number;
  marginRequired: number;
  maxLossAmount: number;
  expectedProfit: number;
  riskRewardRatio: number;
  realLeverage: number;
  marginRatioPct: number;
  liqPrice: number;
  totalFee: number;
  openFee: number;
  closeFee: number;
  stopDistancePct: number;
  profitDistancePct: number;
  feeCostPct: number;
  actualStopCostPct: number;
  breakEvenPrice: number;
  quantity: number;
  qtyDecimals: number;
  makerRate: number;
  takerRate: number;
}
export function feeRates(form: FormValues) {
  if (form.feePreset === "custom_fee")
    return {
      maker: Number(form.customFeeMaker),
      taker: Number(form.customFeeTaker),
    };
  return presets[form.feePreset] ?? presets.binance_futures;
}
export function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(d) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(d) + "M";
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}
export function fmtTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
// Keep sub-cent prices meaningful; preserve the legacy two-decimal target for ordinary prices.
function targetPrecision(price: number) {
  return price >= 1
    ? 2
    : Math.min(14, Math.max(6, -Math.floor(Math.log10(price)) + 6));
}
export function autoTakeProfit(form: FormValues): string {
  const entry = Number(form.entryPrice),
    stop = Number(form.stopLoss);
  const { taker } = feeRates(form);
  if (
    ![entry, stop, taker].every(Number.isFinite) ||
    entry <= 0 ||
    stop <= 0 ||
    taker < 0
  )
    return "";
  if (form.direction === "long" ? stop >= entry : stop <= entry) return "";
  const distance = Math.abs(entry - stop) / entry;
  const profitDistance = 3 * (distance + (taker * 2) / 100) + (taker * 2) / 100;
  const target =
    entry * (1 + (form.direction === "long" ? 1 : -1) * profitDistance);
  if (target <= 0 || !Number.isFinite(target)) return "";
  const rounded = Number(target.toFixed(targetPrecision(entry)));
  if (form.direction === "long" ? rounded <= entry : rounded >= entry)
    return "";
  return String(rounded);
}
export function calculate(form: FormValues): Calculation {
  const accountTotal = Number(form.accountTotal),
    entryPrice = Number(form.entryPrice),
    stopLoss = Number(form.stopLoss);
  const maxLossPct = Number(form.maxLossPercent),
    leverage = Number(form.leverage);
  const { maker: makerRate, taker: takerRate } = feeRates(form);
  if (
    ![
      accountTotal,
      entryPrice,
      stopLoss,
      maxLossPct,
      leverage,
      makerRate,
      takerRate,
    ].every(Number.isFinite)
  )
    throw new Error("请输入有效的数字");
  if (accountTotal <= 0 || entryPrice <= 0 || stopLoss <= 0)
    throw new Error("账户总额、开仓价格、止损价格必须大于 0");
  if (maxLossPct <= 0 || maxLossPct >= 100 || leverage < 1)
    throw new Error("请检查最大亏损比例和杠杆倍数");
  if (
    form.feePreset === "custom_fee" &&
    (!form.customFeeMaker.trim() || !form.customFeeTaker.trim())
  )
    throw new Error("请填写自定义手续费率，零手续费可输入 0");
  if (makerRate < 0 || takerRate < 0) throw new Error("手续费率不能为负数");
  const direction = form.direction;
  if (direction === "long" ? stopLoss >= entryPrice : stopLoss <= entryPrice)
    throw new Error(
      direction === "long"
        ? "做多时：止损价格必须小于开仓价格"
        : "做空时：止损价格必须大于开仓价格",
    );
  const takeProfit = Number(form.takeProfit.trim() || autoTakeProfit(form));
  if (!Number.isFinite(takeProfit) || takeProfit <= 0)
    throw new Error("无法生成有效的止盈价格，请手动设置止盈或调整止损");
  if (
    direction === "long" ? takeProfit <= entryPrice : takeProfit >= entryPrice
  )
    throw new Error(
      direction === "long"
        ? "做多时：止盈价格必须大于开仓价格"
        : "做空时：止盈价格必须小于开仓价格",
    );
  const maxLossAmount = (accountTotal * maxLossPct) / 100;
  const stopDistancePct = (Math.abs(entryPrice - stopLoss) / entryPrice) * 100;
  const profitDistancePct =
    (Math.abs(takeProfit - entryPrice) / entryPrice) * 100;
  const feeCostPct = takerRate * 2;
  const actualStopCostPct = stopDistancePct + feeCostPct;
  const positionValue = maxLossAmount / (actualStopCostPct / 100);
  const marginRequired = positionValue / leverage;
  const quantity = positionValue / entryPrice;
  const qtyDecimals = entryPrice >= 10000 ? 4 : entryPrice >= 1000 ? 3 : 2;
  const realLeverage = positionValue / accountTotal;
  const openFee = (positionValue * takerRate) / 100,
    closeFee = openFee,
    totalFee = openFee + closeFee;
  const expectedProfit =
    (positionValue * profitDistancePct) / 100 -
    (positionValue * feeCostPct) / 100;
  const riskRewardRatio = expectedProfit / maxLossAmount;
  const breakEvenPrice =
    entryPrice +
    ((direction === "long" ? 1 : -1) * entryPrice * feeCostPct) / 100;
  const marginRatioPct = (marginRequired / accountTotal) * 100;
  const liqPrice =
    direction === "long"
      ? entryPrice * (1 - 1 / leverage + 0.005)
      : entryPrice * (1 + 1 / leverage - 0.005);
  if (
    ![
      positionValue,
      marginRequired,
      quantity,
      realLeverage,
      totalFee,
      expectedProfit,
      riskRewardRatio,
      breakEvenPrice,
      marginRatioPct,
      liqPrice,
    ].every(Number.isFinite)
  )
    throw new Error("输入数值超出可计算范围，请检查价格和账户总额");
  return {
    id: Date.now(),
    time: fmtTime(new Date()),
    exchange: exchanges[form.exchange] ?? form.exchange,
    symbol: form.symbol.trim().toUpperCase(),
    direction,
    accountTotal,
    maxLossPct,
    entryPrice,
    stopLoss,
    takeProfit,
    leverage,
    positionValue,
    marginRequired,
    maxLossAmount,
    expectedProfit,
    riskRewardRatio,
    realLeverage,
    marginRatioPct,
    liqPrice,
    totalFee,
    openFee,
    closeFee,
    stopDistancePct,
    profitDistancePct,
    feeCostPct,
    actualStopCostPct,
    breakEvenPrice,
    quantity,
    qtyDecimals,
    makerRate,
    takerRate,
  };
}
export interface RiskCheck {
  level: "danger" | "warn" | "pass";
  title: string;
  text: string;
}
export function riskChecks(r: Calculation): RiskCheck[] {
  const covered =
    r.direction === "long"
      ? r.takeProfit > r.breakEvenPrice
      : r.takeProfit < r.breakEvenPrice;
  return [
    {
      level: r.marginRequired > r.accountTotal ? "danger" : "pass",
      title: "可用保证金",
      text:
        r.marginRequired > r.accountTotal
          ? "所需保证金超出账户余额，请减小风险预算或调整杠杆。"
          : `保证金 ${fmt(r.marginRequired)} USDT，未超出账户总额。`,
    },
    {
      level: r.marginRatioPct > 30 ? "warn" : "pass",
      title: "保证金占比",
      text: `当前 ${fmt(r.marginRatioPct, 1)}%，${r.marginRatioPct > 30 ? "超过 30%，注意集中度风险。" : "不超过 30%。"}`,
    },
    {
      level:
        r.riskRewardRatio < 1
          ? "danger"
          : r.riskRewardRatio < 3
            ? "warn"
            : "pass",
      title: "盈亏比",
      text: `${fmt(r.riskRewardRatio)}:1，${r.riskRewardRatio < 1 ? "不足 1:1，不建议开仓。" : r.riskRewardRatio < 3 ? "低于 3:1，建议调整止盈止损。" : "达到 3:1 标准。"}`,
    },
    {
      level: r.stopDistancePct < r.feeCostPct ? "danger" : "pass",
      title: "手续费影响",
      text: `止损距离 ${fmt(r.stopDistancePct, 4)}%，双边手续费 ${fmt(r.feeCostPct, 4)}%${r.stopDistancePct < r.feeCostPct ? "，手续费占比过高，请扩大止损。" : "。"}`,
    },
    {
      level: r.leverage > 20 ? "warn" : "pass",
      title: "杠杆倍数",
      text: `${r.leverage}x${r.leverage > 20 ? " 高杠杆，极端行情下可能被强平。" : "，不超过 20x。"}`,
    },
    {
      level: "pass",
      title: "止损方向",
      text:
        r.direction === "long"
          ? "做多，止损价格小于开仓价格。"
          : "做空，止损价格大于开仓价格。",
    },
    {
      level: covered ? "pass" : "warn",
      title: "保本检查",
      text: covered
        ? "止盈价格可覆盖预估双边手续费。"
        : "止盈价格未达到保本点，盈利不足以覆盖手续费。",
    },
  ];
}
