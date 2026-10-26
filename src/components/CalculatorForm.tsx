import {
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  autoTakeProfit,
  exchanges,
  presets,
  type FormValues,
} from "../lib/calculator";
interface Props {
  form: FormValues;
  setForm: Dispatch<SetStateAction<FormValues>>;
  symbols: string[];
  saveSymbols: (next: string[]) => boolean;
  onCalculate: () => void;
  onReset: () => void;
  notify: (message: string) => void;
  error: string;
}
export default function CalculatorForm({
  form,
  setForm,
  symbols,
  saveSymbols,
  onCalculate,
  onReset,
  notify,
  error,
}: Props) {
  const dragged = useRef<string | null>(null);
  const [manualTarget, setManualTarget] = useState(false);
  function update(key: keyof FormValues, value: string) {
    if (key === "takeProfit") setManualTarget(!!value.trim());
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (
        key !== "takeProfit" &&
        !manualTarget &&
        [
          "entryPrice",
          "stopLoss",
          "direction",
          "feePreset",
          "customFeeTaker",
        ].includes(key)
      )
        next.takeProfit = autoTakeProfit(next);
      return next;
    });
  }
  function addSymbol() {
    const symbol = form.symbol.trim().toUpperCase();
    if (!symbol) return notify("请输入币种名称");
    if (symbols.includes(symbol)) return notify("该币种已存在");
    if (saveSymbols([...symbols, symbol]))
      notify("币种已添加，可点击使用或拖动排序");
  }
  function moveSymbol(symbol: string, offset: number) {
    const index = symbols.indexOf(symbol),
      target = index + offset;
    if (target < 0 || target >= symbols.length) return;
    const next = [...symbols];
    [next[index], next[target]] = [next[target], next[index]];
    saveSymbols(next);
  }
  function field(
    key: keyof FormValues,
    label: string,
    placeholder = "",
    options?: ReactNode,
    extra = "",
  ) {
    return (
      <div className={`field ${extra}`}>
        <label htmlFor={key}>{label}</label>
        {options ? (
          <select
            id={key}
            value={form[key]}
            onChange={(e) => update(key, e.target.value)}
          >
            {options}
          </select>
        ) : (
          <input
            id={key}
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={form[key]}
            placeholder={placeholder}
            onChange={(e) => update(key, e.target.value)}
          />
        )}
      </div>
    );
  }
  return (
    <form
      className="panel calculator"
      data-reveal
      onSubmit={(e) => {
        e.preventDefault();
        onCalculate();
      }}
      noValidate
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / PARAMETERS</span>
          <h2>设置你的交易</h2>
        </div>
        <span className="unit-tag">USDT 本位</span>
      </div>
      <div className="fields two-col">
        {field(
          "exchange",
          "交易所",
          "",
          Object.entries(exchanges).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          )),
        )}
        <fieldset className="direction-field">
          <legend>交易方向</legend>
          <div className="segmented direction">
            {(["long", "short"] as const).map((direction) => (
              <button
                type="button"
                key={direction}
                aria-pressed={form.direction === direction}
                className={
                  form.direction === direction ? `active ${direction}` : ""
                }
                onClick={() => update("direction", direction)}
              >
                {direction === "long" ? "↗ 做多" : "↘ 做空"}
              </button>
            ))}
          </div>
        </fieldset>
        {field("accountTotal", "账户总额 *", "例如 10000")}
        {field(
          "maxLossPercent",
          "每笔最大亏损",
          "",
          [0.5, 1, 2, 3, 5].map((n) => (
            <option key={n} value={n}>
              {n}%
            </option>
          )),
        )}
      </div>
      <div className="section-divider">
        <span>价格与杠杆</span>
      </div>
      <div className="fields two-col">
        {field("entryPrice", "开仓价格 *", "例如 100000")}
        {field("stopLoss", "止损价格 *", "例如 105000")}
        {field(
          "takeProfit",
          "止盈价格",
          "自动计算 3:1，或手动输入",
          undefined,
          "target-field",
        )}
        {field(
          "leverage",
          "杠杆倍数",
          "",
          [1, 2, 3, 5, 10, 15, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}x{n === 1 ? " · 现货" : ""}
            </option>
          )),
        )}
      </div>
      <div className="target-hint">
        <span>
          {manualTarget ? "使用手动止盈价格" : "自动止盈已计入双边手续费"}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setManualTarget(false);
            setForm((current) => ({
              ...current,
              takeProfit: autoTakeProfit(current),
            }));
          }}
        >
          恢复自动 3:1
        </button>
      </div>
      <div className="fields two-col fee-fields">
        {field(
          "feePreset",
          "手续费预设（Taker / Maker）",
          "",
          <>
            {Object.entries(presets).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
            <option value="custom_fee">自定义费率</option>
          </>,
          "span-two",
        )}
        {form.feePreset === "custom_fee" && (
          <>
            {field("customFeeMaker", "Maker 费率 (%)", "0.018")}
            {field("customFeeTaker", "Taker 费率 (%)", "0.045")}
          </>
        )}
      </div>
      <div className="section-divider">
        <span>币种管理</span>
      </div>
      <label htmlFor="symbol">
        交易币种 <span className="optional">选填</span>
      </label>
      <div className="symbol-entry">
        <div className="input-clear">
          <input
            id="symbol"
            autoComplete="off"
            maxLength={20}
            value={form.symbol}
            placeholder="例如 BTC、ETH、BNB"
            onChange={(e) => update("symbol", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSymbol();
              }
            }}
          />
          {form.symbol && (
            <button
              type="button"
              aria-label="清空币种输入"
              onClick={() => update("symbol", "")}
            >
              ×
            </button>
          )}
        </div>
        <button type="button" className="button secondary" onClick={addSymbol}>
          ＋ 添加
        </button>
      </div>
      {symbols.length > 0 && (
        <div className="symbol-tags" aria-label="已保存币种">
          {symbols.map((symbol) => (
            <div
              className="symbol-tag"
              key={symbol}
              draggable
              onDragStart={() => {
                dragged.current = symbol;
              }}
              onDragEnd={() => {
                dragged.current = null;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = symbols.indexOf(dragged.current ?? "");
                if (from < 0) return;
                const next = [...symbols];
                next.splice(from, 1);
                next.splice(symbols.indexOf(symbol), 0, dragged.current!);
                saveSymbols(next);
                dragged.current = null;
              }}
            >
              <button
                type="button"
                title="点击使用；拖动排序；Alt + 左右方向键排序"
                onClick={() => update("symbol", symbol)}
                onKeyDown={(e) => {
                  if (e.altKey && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    moveSymbol(symbol, e.key === "ArrowLeft" ? -1 : 1);
                  }
                }}
              >
                {symbol}
              </button>
              <button
                type="button"
                aria-label={`删除币种 ${symbol}`}
                onClick={() => saveSymbols(symbols.filter((s) => s !== symbol))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="notice danger" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button primary">
          计算仓位 <span>↗</span>
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setManualTarget(false);
            onReset();
          }}
        >
          重置
        </button>
      </div>
      <p className="form-footnote">
        按 Enter 计算 · 计算记录仅保存在当前浏览器
      </p>
    </form>
  );
}
