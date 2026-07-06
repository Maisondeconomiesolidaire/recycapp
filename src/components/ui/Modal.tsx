import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  headerClassName,
  hideClose,
  dark: _dark,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  /** Modal obligatoire : masque la croix et empêche la fermeture (Échap/fond). */
  hideClose?: boolean;
  /** @deprecated theme is now inherited from document.body class */
  dark?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !hideClose) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, hideClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[260] bg-black/50 animate-fade-in"
        onClick={hideClose ? undefined : onClose}
      />
      <div className="fixed inset-0 z-[261] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full max-w-lg animate-fade-in overflow-y-auto rounded-[28px] border border-[var(--border)] bg-[var(--background)] shadow-2xl max-h-[90vh]",
            className,
          )}
        >
          {title && (
            <div className={cn("sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-6 py-4", headerClassName)}>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              {!hideClose && (
                <button
                  onClick={onClose}
                  className="rounded-xl p-1.5 text-zinc-400 hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}
