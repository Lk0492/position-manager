import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./theme.css";
import "./styles.css";
import "./appearance.css";
import "./motion.css";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="app">
          <div className="panel">
            <h1>页面暂时无法显示</h1>
            <p>本地记录仍保存在浏览器中，请刷新页面重试。</p>
            <button onClick={() => location.reload()}>刷新页面</button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
