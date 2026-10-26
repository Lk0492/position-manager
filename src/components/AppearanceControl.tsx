import { useEffect, useState } from "react";

type Appearance = "system" | "light" | "dark";
const key = "positionAppearance";
function readAppearance(): Appearance {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
function applyAppearance(value: Appearance) {
  const resolved =
    value === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : value;
  document.documentElement.dataset.appearance = resolved;
  document.documentElement.style.colorScheme = resolved;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = resolved === "dark" ? "#111113" : "#f5f5f7";
    });
}

export default function AppearanceControl() {
  const [appearance, setAppearance] = useState(readAppearance);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyAppearance(appearance);
    update();
    media.addEventListener("change", update);
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null)
        setAppearance(readAppearance());
    };
    window.addEventListener("storage", sync);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("storage", sync);
    };
  }, [appearance]);
  return (
    <label className="appearance-control">
      <span>外观</span>
      <select
        aria-label="页面外观"
        value={appearance}
        onChange={(event) => {
          const next = event.target.value as Appearance;
          applyAppearance(next);
          setAppearance(next);
          try {
            localStorage.setItem(key, next);
          } catch {
            /* Session choice still works. */
          }
        }}
      >
        <option value="system">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  );
}
