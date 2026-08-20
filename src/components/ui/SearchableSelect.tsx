import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  /** Libellé affiché une fois l'option choisie. */
  label: string;
  /** Texte secondaire, affiché dans la liste sous le libellé. */
  hint?: string;
}

/**
 * Liste déroulante avec champ de recherche.
 *
 * Sur un stock qui compte des dizaines de caisses, un `<select>` natif oblige à
 * faire défiler : ici on tape les chiffres du code (« 07 ») et la liste se
 * réduit immédiatement. Entrée valide la première correspondance, ce qui rend
 * la saisie au clavier aussi rapide qu'un scan.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "— Sélectionner —",
  searchPlaceholder = "Rechercher…",
  emptyLabel = "Aucun résultat.",
  clearable = true,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-left text-sm text-[var(--foreground)] shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-[var(--muted-foreground)]"}`}>
          {selected?.label ?? placeholder}
        </span>
        {clearable && selected && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Effacer"
            onClick={(e) => {
              e.stopPropagation();
              pick("");
            }}
            className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-xl">
          <div className="relative border-b border-[var(--border)]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) pick(filtered[0].value);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[var(--muted-foreground)]">
                {emptyLabel}
              </p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    option.value === value
                      ? "bg-brand-500/15 text-brand-200"
                      : "text-[var(--foreground)] hover:bg-[var(--crm-surface-2)]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-xs text-[var(--muted-foreground)]">
                        {option.hint}
                      </span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check className="h-4 w-4 shrink-0 text-brand-300" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
