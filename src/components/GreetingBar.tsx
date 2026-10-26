import { memo, useEffect, useState } from "react";

function greeting(hour: number) {
  if (hour < 5 || hour >= 23)
    return "夜深了，注意休息。每一个决定，都值得清醒对待。";
  if (hour < 9) return "早上好。新的一天，从一份清晰的交易计划开始。";
  if (hour < 12) return "上午好。保持专注，也记得控制每一笔风险。";
  if (hour < 14) return "中午好。休息一下，给思考留一点空间。";
  if (hour < 18) return "下午好。耐心等待机会，理性规划仓位。";
  return "晚上好。保持节奏，让交易有计划地进行。";
}

// Keep the once-per-second clock update out of the form, results and history.
const GreetingBar = memo(function GreetingBar({
  hasResult,
  hasDanger,
  hasWarn,
}: {
  hasResult: boolean;
  hasDanger: boolean;
  hasWarn: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={`greeting ${hasDanger ? "danger" : hasWarn ? "warn" : ""}`}>
      <span className="greeting-dot" />
      <p>
        {hasResult
          ? hasDanger
            ? "检测到风险问题，请逐条检查后再决定是否开仓。"
            : hasWarn
              ? "存在需要留意的风险，请仔细确认交易计划。"
              : "所有风险检查通过，交易计划符合当前检查标准。"
          : greeting(now.getHours())}
      </p>
      <time>{now.toLocaleTimeString("zh-CN", { hour12: false })}</time>
    </div>
  );
});

export default GreetingBar;
