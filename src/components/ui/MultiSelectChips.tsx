import { cn } from "../../lib/cn";

export function MultiSelectChips({
  options,
  selected,
  onChange,
  dark = false,
  orientation = "horizontal",
  className,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  dark?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  return (
    <div
      className={cn(
        orientation === "vertical"
          ? "flex flex-col gap-2"
          : "flex flex-wrap gap-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          orientation === "vertical" && "w-full justify-start text-left",
          selected.length === 0
            ? dark
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-brand-300 bg-brand-50 text-brand-700"
            : dark
              ? "border-border bg-card text-foreground hover:bg-accent"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
        )}
      >
        Toutes
      </button>

      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              orientation === "vertical" && "w-full justify-start text-left",
              active
                ? dark
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-brand-300 bg-brand-50 text-brand-700"
                : dark
                  ? "border-border bg-card text-foreground hover:bg-accent"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
