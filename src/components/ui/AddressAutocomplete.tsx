import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { searchAddresses, AddressSuggestion } from "../../lib/address";
import { Input } from "./Field";
import { cn } from "../../lib/cn";

/**
 * Champ de saisie d'adresse avec autocomplétion (Base Adresse Nationale,
 * proximité de Lachapelle-aux-Pots 60650). À la sélection, remonte l'adresse
 * complète (rue, code postal, ville) via `onSelect`.
 */
export function AddressAutocomplete({
  value,
  onValueChange,
  onSelect,
  placeholder,
  id,
}: {
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (a: AddressSuggestion) => void;
  placeholder?: string;
  id?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const query = value.trim();
    if (!isFocused || query.length < 3) {
      setOpen(false);
      setSuggestions([]);
      return;
    }

    const t = setTimeout(async () => {
      const r = await searchAddresses(query);
      setSuggestions(r);
      setOpen(r.length > 0);
    }, 250);
    return () => clearTimeout(t);
  }, [isFocused, value]);

  function pick(s: AddressSuggestion) {
    skipNext.current = true;
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? "Commencez à saisir l'adresse…"}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() =>
          setTimeout(() => {
            setIsFocused(false);
            setOpen(false);
          }, 150)
        }
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                  "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>
                  <span className="font-medium">{s.address}</span>
                  <span className="block text-xs text-zinc-500">
                    {s.postalCode} {s.city}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
