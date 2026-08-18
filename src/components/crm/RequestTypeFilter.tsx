import { RequestType, TYPE_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const TYPES: RequestType[] = ["aerogommage", "collecte", "article", "velo", "livraison"];

export type RequestTypeFilterValue = RequestType | "all";

/** Filtre par type de demande (Tous / Aérogommage / Collecte / …). */
export function RequestTypeFilter({
  value,
  onChange,
}: {
  value: RequestTypeFilterValue;
  onChange: (value: RequestTypeFilterValue) => void;
}) {
  const items: { key: RequestTypeFilterValue; label: string }[] = [
    { key: "all", label: "Tous" },
    ...TYPES.map((type) => ({ key: type, label: TYPE_LABELS[type] })),
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition",
            value === item.key
              ? "border-brand-500 bg-brand-500/15 text-brand-300"
              : "border-[var(--crm-border)] text-zinc-400 hover:text-zinc-200",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
