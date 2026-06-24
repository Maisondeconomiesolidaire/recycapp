import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export type SlideDirection = "forward" | "back";

/**
 * Coquille commune des formulaires en étapes (wizard) : en-tête avec titre,
 * compteur d'étapes, barre de progression, animation de slide et bouton retour.
 */
export function WizardShell({
  eyebrow,
  title,
  stepIndex,
  stepCount,
  direction,
  onBack,
  children,
}: {
  eyebrow: string;
  title: string;
  stepIndex: number; // index 0-based
  stepCount: number;
  direction: SlideDirection;
  onBack?: () => void;
  children: ReactNode;
}) {
  const progress = ((stepIndex + 1) / stepCount) * 100;
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <style>{`
        @keyframes wizardSlideForward { from { opacity: 0; transform: translateX(-34px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes wizardSlideBack { from { opacity: 0; transform: translateX(34px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div className="border-b border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface-2)_70%,transparent)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-100">{title}</h2>
          </div>
          <span className="rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-1 text-xs font-semibold text-zinc-400">
            {stepIndex + 1}/{stepCount}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--crm-surface)]">
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div
        key={stepIndex}
        className="min-h-[430px] p-5"
        style={{
          animation: `${direction === "forward" ? "wizardSlideForward" : "wizardSlideBack"} 240ms cubic-bezier(.2,.8,.2,1) both`,
        }}
      >
        {onBack && stepIndex > 0 && (
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-brand-500/40 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function WizardStepIntro({
  eyebrow,
  title,
  helper,
  children,
}: {
  eyebrow: string;
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-300">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-bold text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">{helper}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function WizardOption({
  selected,
  title,
  helper,
  onClick,
}: {
  selected: boolean;
  title: string;
  helper?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-brand-500/60 bg-brand-500/15 text-brand-300 shadow-[0_14px_32px_rgba(241,16,79,0.16)]"
          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/35 hover:text-zinc-100"
      }`}
    >
      <span className="block text-base font-bold">{title}</span>
      {helper && <span className="mt-1 block text-xs leading-5 text-zinc-500">{helper}</span>}
    </button>
  );
}

export function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-1.5 text-xs text-zinc-400">
      {label} : <span className="font-semibold text-zinc-200">{value || "—"}</span>
    </span>
  );
}
