import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { TYPE_COLORS, TYPE_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function Calendrier() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return { from: from.getTime(), to: to.getTime() };
  }, [month]);

  const requests = useQuery(api.requests.scheduled, range);

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

  const selectedDayRequests = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  return (
    <div>
      <PageHeader
        title="Calendrier"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-semibold capitalize">
              {format(month, "MMMM yyyy", { locale: fr })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMonth(startOfMonth(new Date()))}
            >
              Aujourd'hui
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        {/* Légende */}
        <div className="mb-4 flex flex-wrap gap-3">
          {(Object.keys(TYPE_COLORS) as (keyof typeof TYPE_COLORS)[]).map(
            (t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                />
                {TYPE_LABELS[t]}
              </span>
            ),
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-[var(--crm-border)]">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-xs font-semibold text-zinc-500 text-center"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const today = isToday(day);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-[104px] cursor-pointer border-b border-r border-[var(--crm-border)] p-1.5 last:border-r-0 transition-colors",
                    !inMonth && "bg-[var(--crm-surface-2)]",
                    isSelected
                      ? "bg-brand-500/8 ring-1 ring-inset ring-brand-500/30"
                      : "hover:bg-[var(--crm-surface-2)]",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      today
                        ? "bg-brand-600 text-white font-semibold"
                        : isSelected
                          ? "bg-brand-500/20 text-brand-300 font-semibold"
                          : inMonth
                            ? "text-zinc-300"
                            : "text-zinc-500",
                    )}
                  >
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {items.map((r) => (
                      <button
                        key={r._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(r._id);
                        }}
                        className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white hover:opacity-90"
                        style={{ backgroundColor: TYPE_COLORS[r.type] }}
                      >
                        {r.customer.lastName} · {TYPE_LABELS[r.type]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {/* Day panel (slides from left) */}
      <Drawer
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        variant="left"
        title={
          selectedDay
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
            : ""
        }
        bodyClassName="p-0"
      >
        {selectedDay && (
          <DayPanel
            requests={selectedDayRequests}
            onOpenRequest={(id) => {
              setOpenId(id);
            }}
          />
        )}
      </Drawer>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function DayPanel({
  requests,
  onOpenRequest,
}: {
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-zinc-500">
          Aucune demande planifiée pour ce jour.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {requests.map((r) => (
        <button
          key={r._id}
          type="button"
          onClick={() => onOpenRequest(r._id)}
          className="w-full rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 text-left transition-colors hover:border-[var(--crm-border-strong)] hover:bg-[var(--crm-surface-2)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[r.type] }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: TYPE_COLORS[r.type] }}
            >
              {TYPE_LABELS[r.type]}
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-100">
            {r.customer.firstName} {r.customer.lastName}
          </p>
          {r.customer.city && (
            <p className="mt-0.5 text-xs text-zinc-500">{r.customer.city}</p>
          )}
          <p className="mt-1.5 text-xs text-zinc-600">
            {r.customer.phone}
          </p>
        </button>
      ))}
    </div>
  );
}
