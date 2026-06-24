import { Scale } from "lucide-react";

/**
 * Champ de poids très visible, façon écran de pesée / balance.
 * Gros chiffres, unité kg, et une réglette décorative type balance.
 */
export function WeightField({
  value,
  onChange,
  label = "Poids",
  unit = "kg",
  placeholder = "0.0",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  unit?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
      <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500">
        <Scale className="h-4 w-4 text-brand-400" />
        {label}
      </div>
      <label className="relative block cursor-text rounded-2xl border border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-surface-2)_80%,#000)] px-6 py-7 shadow-inner transition focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/25">
        <div className="flex items-baseline justify-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-[6ch] bg-transparent text-center text-6xl font-extrabold leading-none tabular-nums tracking-tight text-brand-300 placeholder-zinc-700 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-2xl font-bold text-zinc-400">{unit}</span>
        </div>
        <div className="mx-auto mt-5 flex max-w-[220px] items-end justify-between">
          {Array.from({ length: 11 }).map((_, i) => (
            <span
              key={i}
              className={`w-px ${i % 5 === 0 ? "h-3 bg-zinc-500" : "h-2 bg-zinc-700"}`}
            />
          ))}
        </div>
      </label>
    </div>
  );
}
