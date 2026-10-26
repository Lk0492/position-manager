import * as XLSX from "xlsx";
import { fmtTime, type Calculation } from "./calculator";
export function downloadHistory(historyData: Calculation[]) {
  const wsData = [
    [
      "序号",
      "时间",
      "交易所",
      "币种",
      "方向",
      "账户总额(USDT)",
      "最大亏损比例(%)",
      "开仓价格",
      "止损价格",
      "止盈价格",
      "杠杆(x)",
      "名义仓位(USDT)",
      "保证金(USDT)",
      "保证金占比(%)",
      "最大亏损金额(USDT)",
      "预期盈利(USDT)",
      "盈亏比(预期盈利:最大亏损)",
      "真实杠杆",
      "爆仓价格",
      "止损距离(%)",
      "止盈距离(%)",
      "手续费(USDT)",
      "实际止损成本(%)",
      "保本价格",
      "手续费率(T/M%)",
    ],
    ...historyData.map((r, i) => [
      i + 1,
      r.time,
      r.exchange,
      r.symbol || "",
      r.direction === "long" ? "做多" : "做空",
      r.accountTotal,
      r.maxLossPct.toFixed(2),
      r.entryPrice,
      r.stopLoss,
      r.takeProfit,
      r.leverage,
      r.positionValue,
      r.marginRequired,
      r.marginRatioPct.toFixed(4),
      r.maxLossAmount,
      r.expectedProfit,
      r.riskRewardRatio.toFixed(2) + ":1",
      r.realLeverage.toFixed(4),
      r.liqPrice,
      r.stopDistancePct.toFixed(4),
      r.profitDistancePct.toFixed(4),
      r.totalFee,
      r.actualStopCostPct.toFixed(4),
      r.breakEvenPrice,
      r.takerRate + "% / " + r.makerRate + "%",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 7 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
  ];

  // Sheet2: Summary
  const total = historyData.length;
  const longCnt = historyData.filter((r) => r.direction === "long").length;
  const shortCnt = historyData.filter((r) => r.direction === "short").length;
  const avgRR = total
    ? (historyData.reduce((s, r) => s + r.riskRewardRatio, 0) / total).toFixed(
        4,
      )
    : 0;
  const passCnt = historyData.filter((r) => r.riskRewardRatio >= 3).length;
  const avgLoss = total
    ? (historyData.reduce((s, r) => s + r.maxLossAmount, 0) / total).toFixed(4)
    : 0;
  const avgRealLev = total
    ? (historyData.reduce((s, r) => s + r.realLeverage, 0) / total).toFixed(4)
    : 0;
  const usedSymbols = [
    ...new Set(historyData.filter((r) => r.symbol).map((r) => r.symbol)),
  ];

  const sumData = [
    ["仓位管理器 - 计算历史统计摘要"],
    [""],
    ["统计项目", "数值"],
    ["总计算次数", total],
    ["做多次数", longCnt],
    ["做空次数", shortCnt],
    [
      "盈亏比达标次数 (\u22653:1)",
      passCnt +
        " / " +
        total +
        " (" +
        (total ? ((passCnt / total) * 100).toFixed(1) : 0) +
        "%)",
    ],
    ["平均盈亏比", avgRR],
    ["平均最大亏损(USDT)", avgLoss],
    ["平均真实杠杆", avgRealLev + "x"],
    ["已使用币种", usedSymbols.length > 0 ? usedSymbols.join("、") : "无"],
    [""],
    ["导出时间", fmtTime(new Date())],
  ];
  const wsSum = XLSX.utils.aoa_to_sheet(sumData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "计算明细");
  XLSX.utils.book_append_sheet(wb, wsSum, "统计摘要");

  const fileName =
    "仓位计算历史_" + new Date().toISOString().slice(0, 10) + ".xlsx";
  XLSX.writeFile(wb, fileName);
  return fileName;
}
