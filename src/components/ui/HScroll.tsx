import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Conteneur à défilement horizontal avec une présentation soignée :
 * scrollbar native masquée, flèches au survol et une barre de progression
 * arrondie (cliquable + déplaçable) plus jolie que la scrollbar du navigateur.
 */
export function HScroll({
  children,
  className = "",
  contentClassName = "",
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    thumbWidth: 100,
    thumbLeft: 0,
    scrollable: false,
    atStart: true,
    atEnd: false,
  });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const scrollable = maxScroll > 1;
    const thumbWidth = scrollable ? Math.max((clientWidth / scrollWidth) * 100, 10) : 100;
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumbWidth) : 0;
    setMetrics({
      thumbWidth,
      thumbLeft,
      scrollable,
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft >= maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function scrollByDir(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  function startThumbDrag(e: React.PointerEvent) {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    const trackWidth = el.clientWidth;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      el.scrollLeft = startScroll + (dx / trackWidth) * el.scrollWidth;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className={`group/hscroll relative ${className}`}>
      {metrics.scrollable && !metrics.atStart && (
        <button
          type="button"
          aria-label="Défiler vers la gauche"
          onClick={() => scrollByDir(-1)}
          className="absolute left-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/95 text-zinc-700 shadow-[0_8px_24px_rgba(24,24,27,0.16)] backdrop-blur transition hover:scale-105 hover:text-brand-600 group-hover/hscroll:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {metrics.scrollable && !metrics.atEnd && (
        <button
          type="button"
          aria-label="Défiler vers la droite"
          onClick={() => scrollByDir(1)}
          className="absolute right-1 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white/95 text-zinc-700 shadow-[0_8px_24px_rgba(24,24,27,0.16)] backdrop-blur transition hover:scale-105 hover:text-brand-600 group-hover/hscroll:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={ref}
        onScroll={update}
        className={`hide-scrollbar flex gap-4 overflow-x-auto scroll-smooth ${contentClassName}`}
      >
        {children}
      </div>

      {metrics.scrollable && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
          <div
            role="scrollbar"
            aria-orientation="horizontal"
            onPointerDown={startThumbDrag}
            className="h-full cursor-grab rounded-full bg-brand-500/70 transition-colors hover:bg-brand-500 active:cursor-grabbing"
            style={{ width: `${metrics.thumbWidth}%`, marginLeft: `${metrics.thumbLeft}%` }}
          />
        </div>
      )}
    </div>
  );
}
