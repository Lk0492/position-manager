import { fmt, riskChecks, type Calculation } from "../lib/calculator";
export default function Results({
  result: r,
  stale,
}: {
  result: Calculation | null;
  stale: boolean;
}) {
  if (!r)
    return (
      <section
        className="panel results empty-results"
        aria-label="计算结果"
        data-reveal
      >
        <div className="empty-illustration" aria-hidden="true">
          <span>↗</span>
          <i />
          <i />
          <i />
        </div>
        <span className="eyebrow">PLAN BEFORE YOU TRADE</span>
        <h2>先计算，再做决定。</h2>
        <p>
          填写账户、开仓与止损价格，
          <br />
          查看适合你的仓位和风险检查。
        </p>
        <div className="empty-metrics">
          <div>
            <b>01</b>
            <span>明确风险预算</span>
          </div>
          <div>
            <b>02</b>
            <span>计算合理仓位</span>
          </div>
          <div>
            <b>03</b>
            <span>检查交易计划</span>
          </div>
        </div>
        <div className="empty-note">杠杆决定保证金，仓位决定风险。</div>
      </section>
    );
  const checks = riskChecks(r),
    danger = checks.some((c) => c.level === "danger"),
    warn = checks.some((c) => c.level === "warn");
  const priceDigits =
    r.entryPrice < 1
      ? Math.min(14, Math.max(6, -Math.floor(Math.log10(r.entryPrice)) + 4))
      : 2;
  const metrics: [string, string, string, string?][] = [
    [
      "所需保证金",
      `${fmt(r.marginRequired)} USDT`,
      `名义仓位 ÷ ${r.leverage}x 杠杆`,
      "neutral",
    ],
    [
      "最大亏损金额",
      `${fmt(r.maxLossAmount)} USDT`,
      `账户总额的 ${r.maxLossPct}%（含手续费）`,
      "red",
    ],
    [
      "止损距离",
      `${fmt(r.stopDistancePct, 4)}%`,
      `价差 ${fmt(Math.abs(r.entryPrice - r.stopLoss), priceDigits)}`,
      "red",
    ],
    [
      "止盈距离",
      `${fmt(r.profitDistancePct, 4)}%`,
      `止盈价 ${fmt(r.takeProfit, priceDigits)}`,
      "green",
    ],
    [
      "双边手续费",
      `${fmt(r.totalFee, 4)} USDT`,
      `开仓 ${fmt(r.openFee, 4)} + 平仓 ${fmt(r.closeFee, 4)}`,
    ],
    [
      "实际止损成本",
      `${fmt(r.actualStopCostPct, 4)}%`,
      "止损距离 + 双边手续费",
      "red",
    ],
    [
      "保本价格",
      fmt(r.breakEvenPrice, priceDigits),
      "按双边 Taker 手续费估算",
      "neutral",
    ],
    [
      "预期净盈利",
      `${fmt(r.expectedProfit)} USDT`,
      "止盈盈利 − 双边手续费",
      "green",
    ],
    [
      "可买入数量",
      fmt(r.quantity, r.qtyDecimals),
      `${r.symbol || "币"} · 名义仓位 ÷ 开仓价`,
    ],
    [
      "真实杠杆",
      `${fmt(r.realLeverage)}x`,
      "名义仓位 ÷ 账户总额",
      r.realLeverage > 3 ? "red" : "",
    ],
    [
      "保证金占比",
      `${fmt(r.marginRatioPct, 1)}%`,
      "所需保证金 ÷ 账户总额",
      r.marginRatioPct > 30 ? "red" : "",
    ],
    [
      "盈亏比",
      `${fmt(r.riskRewardRatio)}:1`,
      "预期净盈利 ÷ 最大亏损",
      r.riskRewardRatio >= 3 ? "green" : "red",
    ],
  ];
  return (
    <section className="panel results" aria-label="计算结果" data-reveal>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">02 / POSITION PLAN</span>
          <h2>你的仓位计划</h2>
        </div>
        <span
          className={`status ${danger ? "danger" : warn ? "warn" : "pass"}`}
        >
          {danger ? "存在风险" : warn ? "留意风险" : "检查通过"}
        </span>
      </div>
      {stale && (
        <div className="notice" role="status">
          参数已修改，请重新计算以更新结果。
        </div>
      )}
      <div className="result-tags">
        <span>{r.exchange}</span>
        <span>{r.symbol || "未指定币种"}</span>
        <span className={r.direction === "long" ? "green" : "red"}>
          {r.direction === "long" ? "↗ 做多" : "↘ 做空"}
        </span>
        <span>{r.leverage}x</span>
      </div>
      <div className="position-hero">
        <div className="metric-label">建议开仓名义仓位</div>
        <div className="position-amount" data-testid="position-value">
          {fmt(r.positionValue)} <small>USDT</small>
        </div>
        <div className="position-footer">
          <span>账户 {fmt(r.accountTotal)} USDT</span>
          <span>真实杠杆 {fmt(r.realLeverage)}x</span>
        </div>
        <div className="progress">
          <i
            style={{ width: `${Math.min((r.realLeverage / 5) * 100, 100)}%` }}
          />
        </div>
      </div>
      <div className="metrics-grid">
        {metrics.map(([label, value, note, color]) => (
          <div className="metric" key={label}>
            <div className="metric-label">{label}</div>
            <div className={`metric-value ${color ?? ""}`}>{value}</div>
            <div className="metric-note">{note}</div>
          </div>
        ))}
      </div>
      <div className="liquidation">
        <div>
          <div className="metric-label">预估爆仓价格</div>
          <strong className="red">{fmt(r.liqPrice, priceDigits)}</strong>
        </div>
        <p>
          维持保证金率按 0.5% 估算，
          <br />
          实际强平价以交易所为准。
        </p>
      </div>
      <div className="risk-heading">
        <h3>逐条风险检查</h3>
        <span>{checks.filter((c) => c.level === "pass").length} / 7 通过</span>
      </div>
      <div className="risk-checks">
        {checks.map((c) => (
          <div className={`risk-item ${c.level}`} key={c.title}>
            <span className="risk-icon">
              {c.level === "pass" ? "✓" : c.level === "danger" ? "×" : "!"}
            </span>
            <div>
              <strong>{c.title}</strong>
              <p>{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="notice recovery-note">
        本次最大亏损 {r.maxLossPct}%，需要上涨{" "}
        {fmt((r.maxLossPct / (100 - r.maxLossPct)) * 100)}%
        才能回本。小额止损，让下一次机会仍有选择。
      </div>
    </section>
  );
}
