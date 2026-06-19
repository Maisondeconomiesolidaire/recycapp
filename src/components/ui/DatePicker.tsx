import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  className,
}: {
  value?: number;
  onChange: (value?: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const selectedDate = useMemo(
    () => (value ? new Date(value) : undefined),
    [value],
  );
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), {
      locale: fr,
      weekStartsOn: 1,
    });
    const end = endOfWeek(endOfMonth(month), {
      locale: fr,
      weekStartsOn: 1,
    });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-input/40 px-3 text-left text-sm text-foreground shadow-sm transition-colors",
          "hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/25",
          open && "border-primary ring-2 ring-primary/25",
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn(!selectedDate && "text-muted-foreground")}>
            {selectedDate
              ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
              : placeholder}
          </span>
        </span>
        {selectedDate ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            role="button"
            tabIndex={0}
          >
            Effacer
          </span>
        ) : null}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[320px] rounded-[24px] border border-border bg-card p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMonth((current) => subMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-sm font-semibold text-foreground">
              {format(month, "MMMM yyyy", { locale: fr })}
            </div>
            <button
              type="button"
              onClick={() => setMonth((current) => addMonths(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {WEEK_DAYS.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const active = selectedDate ? isSameDay(day, selectedDate) : false;
              const inMonth = isSameMonth(day, month);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    const iso = format(day, "yyyy-MM-dd");
                    onChange(parseISO(iso).getTime());
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm transition-colors",
                    active
                      ? "bg-primary font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(255,119,0,0.24)]"
                      : inMonth
                        ? "text-foreground hover:bg-accent"
                        : "text-muted-foreground/45 hover:bg-accent/60",
                    isToday(day) && !active && "border border-primary/30 text-primary",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
