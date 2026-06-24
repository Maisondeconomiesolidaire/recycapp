import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
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
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { TYPE_COLORS, TYPE_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function ScheduleCalendarModal({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value?: number;
  onChange: (value: number) => void;
}) {
  const [month, setMonth] = useState(() =>
    value ? startOfMonth(new Date(value)) : startOfMonth(new Date()),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(
    value ? new Date(value) : null,
  );

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return { from: from.getTime(), to: to.getTime() };
  }, [month]);

  const requests = useQuery(api.requests.scheduled, open ? range : "skip");

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Doc<"requests">[]>();
    for (const r of requests ?? []) {
      if (!r.scheduledDate) continue;
      const key = format(new Date(r.scheduledDate), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [requests]);

  const dayRequests = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  function handleConfirm() {
    if (!selectedDay) return;
    onChange(selectedDay.getTime());
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="modal"
      title={
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-brand-400" />
          <span>Programmer une date</span>
        </div>
      }
      bodyClassName="p-0 flex overflow-hidden"
    >
      <div className="flex flex-1 overflow-hidden">
        {/* ── Calendar ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--crm-border)] px-6 py-3">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--crm-border-strong)] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold capitalize text-zinc-100">
              {format(month, "MMMM yyyy", { locale: fr })}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--crm-border-strong)] text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-semibold text-zinc-500"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const items = byDay.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const today = isToday(day);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex min-h-[80px] flex-col rounded-xl border p-1.5 text-left transition-colors",
                      isSelected
                        ? "border-brand-500 bg-brand-500/10"
                        : today
                          ? "border-brand-500/30 bg-[var(--crm-surface-2)] hover:border-brand-500/60"
                          : inMonth
                            ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] hover:border-zinc-600 hover:bg-[var(--crm-surface-3)]"
                            : "border-transparent bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isSelected
                          ? "bg-brand-500 font-semibold text-white"
                          : today
                            ? "bg-brand-600 font-semibold text-white"
                            : inMonth
                              ? "text-zinc-300"
                              : "text-zinc-600",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="space-y-0.5">
                      {items.slice(0, 2).map((r) => (
                        <div
                          key={r._id}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: TYPE_COLORS[r.type] }}
                        >
                          {r.customer.lastName}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div className="text-[10px] text-zinc-500">
                          +{items.length - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Day panel ── */}
        <div className="flex w-72 shrink-0 flex-col border-l border-[var(--crm-border)]">
          {selectedDay ? (
            <>
              <div className="border-b border-[var(--crm-border)] px-4 py-4">
                <p className="font-semibold capitalize text-zinc-100">
                  {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {dayRequests.length} demande
                  {dayRequests.length !== 1 ? "s" : ""} planifiée
                  {dayRequests.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {dayRequests.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    Aucune demande planifiée pour le jour sélectionné.
                  </p>
                ) : (
                  dayRequests.map((r) => (
                    <div
                      key={r._id}
                      className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: TYPE_COLORS[r.type] }}
                        />
                        <span className="text-xs font-medium text-zinc-400">
                          {TYPE_LABELS[r.type]}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {r.customer.firstName} {r.customer.lastName}
                      </p>
                      {r.customer.city && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {r.customer.city}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[var(--crm-border)] p-3">
                <Button onClick={handleConfirm} className="w-full">
                  Sélectionner cette date
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="text-sm text-zinc-500">
                Cliquez sur un jour du calendrier pour le sélectionner.
              </p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
