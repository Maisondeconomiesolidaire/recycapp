import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/**
 * Ancre une carte flottante (calendrier, liste déroulante) sur son champ.
 *
 * La carte est destinée à être rendue dans un portail : posée dans le flux,
 * elle est rognée par tout parent défilant — typiquement l'`overflow-y-auto`
 * d'une modale, d'où les calendriers qui « sortaient » du modal évènement.
 * Elle bascule au-dessus du champ quand il n'y a pas la place en dessous et
 * suit son ancre au défilement comme au redimensionnement.
 */
export function useAnchoredPopover<A extends HTMLElement = HTMLDivElement>(
  open: boolean,
  { align = "end", matchWidth = false }: { align?: "start" | "end"; matchWidth?: boolean } = {},
) {
  const anchorRef = useRef<A | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    width?: number;
  }>();

  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const popover = popoverRef.current?.getBoundingClientRect();
    const width = matchWidth ? anchor.width : (popover?.width ?? 320);
    const height = popover?.height ?? 320;
    const margin = 8;
    const below = anchor.bottom + margin;
    const top =
      below + height > window.innerHeight && anchor.top - margin - height > 0
        ? anchor.top - margin - height
        : Math.min(
            below,
            Math.max(margin, window.innerHeight - height - margin),
          );
    const rawLeft = align === "end" ? anchor.right - width : anchor.left;
    const left = Math.min(
      Math.max(margin, rawLeft),
      Math.max(margin, window.innerWidth - width - margin),
    );
    setPlacement({ top, left, ...(matchWidth ? { width } : null) });
  }, [align, matchWidth]);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(undefined);
      return;
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Tant que la carte n'est pas mesurée, elle est posée hors écran : on évite
  // le saut d'un premier rendu au mauvais endroit.
  const style: CSSProperties = {
    position: "fixed",
    top: placement?.top ?? -9999,
    left: placement?.left ?? -9999,
    width: placement?.width,
    visibility: placement ? "visible" : "hidden",
  };

  return { anchorRef, popoverRef, place, style };
}
