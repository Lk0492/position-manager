import { useEffect, useRef, useState } from "react";
import CalculatorForm from "./components/CalculatorForm";
import Results from "./components/Results";
import History from "./components/History";
import PwaUpdate from "./components/PwaUpdate";
import GreetingBar from "./components/GreetingBar";
import AppearanceControl from "./components/AppearanceControl";
import { useScrollReveal } from "./lib/useScrollReveal";
import SiteFooter from "./components/SiteFooter";
import {
  calculate,
  defaults,
  fmt,
  riskChecks,
  type Calculation,
  type FormValues,
} from "./lib/calculator";
import {
  HISTORY_KEY,
  SYMBOLS_KEY,
  useLocalData,
  validHistory,
  validSymbols,
} from "./lib/storage";

export default function App() {
  const [form, setForm] = useState<FormValues>({ ...defaults });
  const [result, setResult] = useState<Calculation | null>(null);
  const [calculatedForm, setCalculatedForm] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useLocalData<Calculation[]>(HISTORY_KEY, [], validHistory);
  const symbols = useLocalData<string[]>(SYMBOLS_KEY, [], validSymbols);
  const pageRef = useScrollReveal();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  function onCalculate() {
    try {
      const next = calculate(form);
      next.id = Math.max(Date.now(), ...history.value.map((r) => r.id + 1));
      setResult(next);
      setError("");
      const nextForm = { ...form, takeProfit: String(next.takeProfit) };
      setForm(nextForm);
      setCalculatedForm(JSON.stringify(nextForm));
      history.save([next, ...history.value].slice(0, 100));
    } catch (e) {
      setError(e instanceof Error ? e.message : "计算失败，请检查输入");
      setResult(null);
    }
  }
  const checks = result ? riskChecks(result) : [];
  const hasDanger = checks.some((c) => c.level === "danger"),
    hasWarn = checks.some((c) => c.level === "warn");
  return (
    <div className="app" ref={pageRef}>
      <header className="site-header">
        <a className="brand" href="/" aria-label="仓位管理器首页">
          <span className="brand-icon">仓</span>
          <span>
            仓位管理器<small>POSITION MANAGER</small>
          </span>
        </a>
        <nav>
          <AppearanceControl />
          <a href="#history">
            计算历史 <span>↗</span>
          </a>
          <span className="local-badge">
            <i />
            {online ? "本地存储 · 隐私优先" : "离线模式"}
          </span>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">LESS GUESSWORK. MORE DISCIPLINE.</span>
            <h1>
              每一笔交易，
              <br className="mobile-break" />
              都心中有数<span>。</span>
            </h1>
            <p>先定义风险，再决定仓位。让理性成为你的交易习惯。</p>
          </div>
          <div className="hero-mark" aria-hidden="true">
            <span>RISK</span>
            <strong>
              ≤ 2<small>%</small>
            </strong>
            <span>每笔风险 · 建议上限</span>
          </div>
        </section>
        <GreetingBar
          hasResult={!!result}
          hasDanger={hasDanger}
          hasWarn={hasWarn}
        />
        {(history.error || symbols.error) && (
          <div className="notice danger" role="alert">
            {history.error || symbols.error}
          </div>
        )}
        <div className="workspace">
          <CalculatorForm
            form={form}
            setForm={setForm}
            symbols={symbols.value}
            saveSymbols={symbols.save}
            onCalculate={onCalculate}
            onReset={() => {
              setForm({ ...defaults });
              setResult(null);
              setError("");
            }}
            notify={notify}
            error={error}
          />
          <Results
            result={result}
            stale={!!result && JSON.stringify(form) !== calculatedForm}
          />
        </div>
        <History records={history.value} save={history.save} notify={notify} />
        <section className="principles" aria-label="策略核心规则">
          <div className="principles-heading" data-reveal>
            <span className="eyebrow">THE DISCIPLINE BEHIND THE NUMBERS</span>
            <h2>让规则先于情绪。</h2>
          </div>
          <div className="principles-grid">
            <article data-reveal>
              <span>01</span>
              <h3>看真实杠杆</h3>
              <p>
                真实杠杆 = 名义仓位 ÷ 账户总额。
                <br />
                表面倍数，并不等于真实风险。
              </p>
              <strong>
                {result ? `${fmt(result.realLeverage)}x` : "仓位决定风险"}
              </strong>
            </article>
            <article data-reveal>
              <span>02</span>
              <h3>小额承担亏损</h3>
              <p>
                单笔最大亏损建议控制在 1%～2%。
                <br />
                为下一次机会留出余地。
              </p>
              <strong>
                {result ? `${fmt(result.maxLossAmount)} USDT` : "1%–2%"}
              </strong>
            </article>
            <article data-reveal>
              <span>03</span>
              <h3>关注盈亏比</h3>
              <p>
                预期净盈利 ÷ 最大亏损。
                <br />
                建议至少达到 3:1。
              </p>
              <strong>
                {result ? `${fmt(result.riskRewardRatio)}:1` : "≥ 3:1"}
              </strong>
            </article>
            <article data-reveal>
              <span>04</span>
              <h3>理解交易期望</h3>
              <p>
                胜率 30%、盈亏比 3:1 时，
                <br />
                10 次交易的理论净收益为 2R。
              </p>
              <strong>
                {result
                  ? result.riskRewardRatio >= 3
                    ? "达到盈亏比标准"
                    : result.riskRewardRatio >= 2.3
                      ? "斟酌后交易"
                      : "不建议交易"
                  : "坚持长期纪律"}
              </strong>
            </article>
          </div>
        </section>
        <div className="loss-reminder" data-reveal>
          <strong>亏损越大，回本越难。</strong>
          <div>
            {[
              ["10%", "11.1%"],
              ["20%", "25%"],
              ["50%", "100%"],
              ["90%", "900%"],
            ].map(([loss, recovery]) => (
              <span key={loss}>
                亏 {loss} <b>→</b> 涨 {recovery} 回本
              </span>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      <PwaUpdate />
    </div>
  );
}
