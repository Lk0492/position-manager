import { useCallback, useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
export default function PwaUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(
    undefined,
  );
  const lastCheck = useRef(0);
  const checking = useRef(false);
  const checkForUpdates = useCallback(() => {
    const registration = registrationRef.current;
    if (
      !registration ||
      !navigator.onLine ||
      document.visibilityState !== "visible" ||
      checking.current ||
      Date.now() - lastCheck.current < 60_000
    )
      return;
    lastCheck.current = Date.now();
    checking.current = true;
    void registration
      .update()
      .catch(() => {})
      .finally(() => {
        checking.current = false;
      });
  }, []);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration;
      checkForUpdates();
    },
  });
  useEffect(() => {
    const timer = setInterval(checkForUpdates, 60 * 60 * 1000);
    window.addEventListener("focus", checkForUpdates);
    window.addEventListener("online", checkForUpdates);
    document.addEventListener("visibilitychange", checkForUpdates);
    // Remove only this application's obsolete hand-written cache after the new worker activates.
    const cleanLegacy = () => {
      void caches.delete("position-manager-v1").catch(() => {});
    };
    if (navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js")) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        cleanLegacy,
        { once: true },
      );
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", checkForUpdates);
      window.removeEventListener("online", checkForUpdates);
      document.removeEventListener("visibilitychange", checkForUpdates);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        cleanLegacy,
      );
    };
  }, [checkForUpdates]);
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>有新版本可用。更新会刷新页面，请先完成当前输入。</span>
      <button
        className="button primary small"
        onClick={() => {
          void updateServiceWorker(true);
        }}
      >
        更新
      </button>
      <button className="text-button" onClick={() => setNeedRefresh(false)}>
        稍后
      </button>
    </div>
  );
}
