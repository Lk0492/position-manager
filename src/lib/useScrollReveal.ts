import { useEffect, useRef } from "react";

/** Observe entry/exit without intercepting touch or wheel events. */
export function useScrollReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !("IntersectionObserver" in window)) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = new WeakSet<Element>();
    let observer: IntersectionObserver | undefined;
    const clearAnimation = (event: Event) => {
      if (event.target instanceof Element)
        event.target.removeAttribute("data-revealing");
    };
    const setup = () => {
      observer?.disconnect();
      visible = new WeakSet();
      container
        .querySelectorAll("[data-revealing]")
        .forEach((el) => el.removeAttribute("data-revealing"));
      if (preference.matches) return;
      observer = new IntersectionObserver(
        (entries) => {
          if (preference.matches) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (
                !visible.has(entry.target) &&
                !entry.target.contains(document.activeElement)
              )
                entry.target.setAttribute("data-revealing", "");
              visible.add(entry.target);
            } else {
              visible.delete(entry.target);
              entry.target.removeAttribute("data-revealing");
            }
          }
        },
        { rootMargin: "0px 0px -12px 0px", threshold: 0 },
      );
      container.querySelectorAll("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) visible.add(el);
        observer!.observe(el);
      });
    };
    const focus = (event: FocusEvent) => {
      // Moving the parent during a pointer press would move the click target.
      if (!(event.target as Element).matches(":focus-visible")) return;
      const section = (event.target as Element).closest("[data-reveal]");
      if (section) {
        visible.add(section);
        section.removeAttribute("data-revealing");
      }
    };
    setup();
    preference.addEventListener("change", setup);
    container.addEventListener("animationend", clearAnimation);
    container.addEventListener("animationcancel", clearAnimation);
    container.addEventListener("focusin", focus);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", setup);
      container.removeEventListener("animationend", clearAnimation);
      container.removeEventListener("animationcancel", clearAnimation);
      container.removeEventListener("focusin", focus);
      container
        .querySelectorAll("[data-revealing]")
        .forEach((el) => el.removeAttribute("data-revealing"));
    };
  }, []);
  return root;
}
