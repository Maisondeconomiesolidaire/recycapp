import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";
import { useAnchoredPopover } from "../../lib/useAnchoredPopover";

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

/**
 * Sélecteur date + heure custom : calendrier mensuel façon `DatePicker`, plus
 * deux colonnes défilantes heures/minutes (pas de 5 min). La valeur est un
 * timestamp epoch en millisecondes. Choisir un jour sans heure préalable
 * initialise à 08:00 pour éviter minuit par défaut.
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Choisir une date et une heure",
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
  // La carte est rendue dans un portail : posée dans le flux, elle était
  // rognée par les modales (`overflow-y-auto`) et sortait de leur cadre.
  const { anchorRef: ref, popoverRef, place, style } = useAnchoredPopover(open);

  useEffect(() => {
    if (selectedDate) setMonth(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Changer de mois ou d'heure fait varier la hauteur de la carte : elle est
  // repositionnée pour ne pas déborder de l'écran.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, month, value, place]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { locale: fr, weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { locale: fr, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const currentHour = selectedDate?.getHours() ?? 8;
  const currentMinute = selectedDate?.getMinutes() ?? 0;

  function pickDay(day: Date) {
    const base = selectedDate ?? new Date();
    const next = new Date(day);
    next.setHours(selectedDate ? base.getHours() : 8, selectedDate ? base.getMinutes() : 0, 0, 0);
    onChange(next.getTime());
  }

  function pickTime(hour: number, minute: number) {
    const next = selectedDate ? new Date(selectedDate) : new Date();
    next.setHours(hour, minute, 0, 0);
    onChange(next.getTime());
  }

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
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !selectedDate && "text-muted-foreground")}>
            {selectedDate
              ? format(selectedDate, "EEE d MMM yyyy 'à' HH:mm", { locale: fr })
              : placeholder}
          </span>
        </span>
        {selectedDate ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            role="button"
            tabIndex={0}
          >
            Effacer
          </span>
        ) : null}
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={style}
            className="z-[300] flex w-[min(440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-[24px] border border-border bg-card p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] sm:flex-row"
          >
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMonth((current) => subMonths(current, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-foreground">
                {format(month, "MMMM yyyy", { locale: fr })}
              </div>
              <button
                type="button"
                onClick={() => setMonth((current) => addMonths(current, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {WEEK_DAYS.map((day, index) => (
                <div key={`${day}-${index}`} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const active = selectedDate ? isSameDay(day, selectedDate) : false;
                const inMonth = isSameMonth(day, month);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
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

          <div className="flex w-full shrink-0 flex-col sm:w-[132px]">
            <div className="mb-3 text-center text-sm font-semibold text-foreground">Heure</div>
            <div className="grid grid-cols-2 gap-2">
              <TimeColumn
                label="Heures"
                values={HOURS}
                selected={currentHour}
                onPick={(hour) => pickTime(hour, currentMinute)}
              />
              <TimeColumn
                label="Min."
                values={MINUTES}
                selected={currentMinute}
                onPick={(minute) => pickTime(currentHour, minute)}
              />
            </div>
          </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  onPick,
}: {
  label: string;
  values: number[];
  selected: number;
  onPick: (value: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="max-h-[236px] space-y-1 overflow-y-auto rounded-xl border border-border bg-background/40 p-1">
        {values.map((entry) => {
          const active = entry === selected;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => onPick(entry)}
              className={cn(
                "flex h-8 w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground hover:bg-accent",
              )}
            >
              {String(entry).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
