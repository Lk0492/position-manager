import { useState } from "react";
import { fmt, type Calculation, type Direction } from "../lib/calculator";
export default function History({
  records,
  save,
  notify,
}: {
  records: Calculation[];
  save: (next: Calculation[]) => boolean;
  notify: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | Direction>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const filtered = records.filter(
    (r) => filter === "all" || r.direction === filter,
  );
  function remove(ids: Set<number>, confirm = false) {
    if (confirm && !window.confirm(`确定删除 ${ids.size} 条历史记录？`)) return;
    if (save(records.filter((r) => !ids.has(r.id)))) {
      setSelected(new Set());
      notify("记录已删除");
    }
  }
  async function exportExcel() {
    if (!records.length) return notify("暂无历史记录可下载");
    setExporting(true);
    try {
      const { downloadHistory } = await import("../lib/export");
      notify("已导出：" + downloadHistory(records));
    } catch {
      notify("Excel 导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }
  return (
    <section
      className="panel history"
      id="history"
      aria-label="计算历史记录"
      data-reveal
    >
      <div className="history-header">
        <div>
          <span className="eyebrow">YOUR TRADING JOURNAL</span>
          <h2>
            计算历史 <span className="count">{records.length}</span>
          </h2>
        </div>
        <div className="history-actions">
          <button
            className="button secondary small"
            onClick={() => {
              setSelectMode(!selectMode);
              setSelected(new Set());
            }}
          >
            {selectMode ? "取消选择" : "选择删除"}
          </button>
          {selectMode && (
            <button
              className="button secondary small red"
              disabled={!selected.size}
              onClick={() => remove(selected, true)}
            >
              删除选中 ({selected.size})
            </button>
          )}
          <button
            className="button secondary small"
            disabled={exporting}
            onClick={exportExcel}
          >
            {exporting ? "正在导出…" : "↓ 导出 Excel"}
          </button>
          <button
            className="text-button red"
            disabled={!records.length}
            onClick={() => {
              if (window.confirm("确定清空所有历史记录？")) {
                if (save([])) {
                  setSelected(new Set());
                  setSelectMode(false);
                  notify("历史已清空");
                }
              }
            }}
          >
            清空
          </button>
        </div>
      </div>
      <div className="history-subhead">
        <div className="segmented history-filter">
          {(["all", "long", "short"] as const).map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "全部" : f === "long" ? "做多" : "做空"}
            </button>
          ))}
        </div>
        <span>仅保存在本机 · 最近 100 条</span>
      </div>
      {!filtered.length ? (
        <div className="history-empty">
          <span aria-hidden="true">≡</span>
          <p>{records.length ? "暂无该方向的记录" : "还没有计算记录"}</p>
          <small>
            {records.length
              ? "切换筛选查看其他记录"
              : "完成一次计算，你的交易计划会出现在这里"}
          </small>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {selectMode && <th>选择</th>}
                {[
                  "时间",
                  "币种",
                  "方向",
                  "开仓价",
                  "止损",
                  "止盈",
                  "仓位",
                  "保证金",
                  "保证金%",
                  "盈亏比",
                  "真实杠杆",
                  "操作",
                ].map((title) => (
                  <th key={title}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? "selected" : ""}>
                  {selectMode && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`选择记录 ${r.id}`}
                        checked={selected.has(r.id)}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                      />
                    </td>
                  )}
                  <td className="time-cell">{r.time}</td>
                  <td>
                    <strong>{r.symbol || "—"}</strong>
                  </td>
                  <td className={r.direction === "long" ? "green" : "red"}>
                    {r.direction === "long" ? "↗ 做多" : "↘ 做空"}
                  </td>
                  <td>{fmt(r.entryPrice, r.entryPrice < 1 ? 8 : 2)}</td>
                  <td>{fmt(r.stopLoss, r.stopLoss < 1 ? 8 : 2)}</td>
                  <td>{fmt(r.takeProfit, r.takeProfit < 1 ? 8 : 2)}</td>
                  <td>{fmt(r.positionValue)}</td>
                  <td>{fmt(r.marginRequired)}</td>
                  <td className={r.marginRatioPct > 30 ? "red" : ""}>
                    {fmt(r.marginRatioPct, 1)}%
                  </td>
                  <td className={r.riskRewardRatio >= 3 ? "green" : ""}>
                    {fmt(r.riskRewardRatio)}:1
                  </td>
                  <td>{fmt(r.realLeverage)}x</td>
                  <td>
                    <button
                      className="delete-button"
                      aria-label={`删除记录 ${r.id}`}
                      onClick={() => remove(new Set([r.id]))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
