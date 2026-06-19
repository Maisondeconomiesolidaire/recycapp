import { type CSSProperties, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

/** Conteneur overlay CRM: panneau latéral ou grand modal. */
export function Drawer({
  open,
  onClose,
  title,
  headerContent,
  children,
  footer,
  variant = "side",
  bodyClassName,
  headerClassName,
  headerStyle,
  closeButtonClassName,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  headerContent?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "side" | "left" | "modal";
  bodyClassName?: string;
  headerClassName?: string;
  headerStyle?: CSSProperties;
  closeButtonClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "z-50 flex flex-col bg-[var(--crm-surface)] shadow-2xl",
          variant === "side" &&
            "fixed inset-y-0 right-0 w-full max-w-2xl border-l border-[var(--crm-border)] animate-slide-in-right",
          variant === "left" &&
            "fixed inset-y-0 left-0 w-full max-w-sm border-r border-[var(--crm-border)] animate-slide-in-left",
          variant === "modal" &&
            "fixed inset-3 overflow-hidden rounded-[30px] border border-[var(--crm-border)] animate-fade-in sm:inset-5 lg:inset-7",
        )}
      >
        <div
          className={cn("border-b border-[var(--crm-border)]", headerClassName)}
          style={headerStyle}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="min-w-0 flex-1 text-zinc-100 font-semibold">{title}</div>
            <button
              onClick={onClose}
              className={cn(
                "rounded-lg p-1.5 text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-200",
                closeButtonClassName,
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {headerContent && <div className="px-5 pb-4">{headerContent}</div>}
        </div>
        <div className={cn("flex-1 overflow-y-auto p-5 text-zinc-200", bodyClassName)}>
          {children}
        </div>
        {footer && (
          <div className="border-t border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
