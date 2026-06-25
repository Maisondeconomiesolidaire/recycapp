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
import { CalendarDays, ChevronLeft, ChevronRight, Check, Truck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { TYPE_COLORS, TYPE_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const KIND_LABELS: Record<string, string> = {
  utilitaire: "Utilitaire",
  camionnette: "Camionnette",
  camion: "Camion",
  voiture: "Voiture",
};

export function ScheduleCalendarModal({
  open,
  onClose,
  value,
  onChange,
  vehicleSelection = false,
  vehicleId = null,
}: {
  open: boolean;
  onClose: () => void;
  value?: number;
  onChange: (value: number, vehicleId?: Id<"vehicles"> | null) => void;
  /** Active la sélection d'un véhicule disponible (collecte / livraison). */
  vehicleSelection?: boolean;
  vehicleId?: Id<"vehicles"> | null;
}) {
  const [month, setMonth] = useState(() =>
    value ? startOfMonth(new Date(value)) : startOfMonth(new Date()),
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(
    value ? new Date(value) : null,
  );
  const [selectedVehicle, setSelectedVehicle] = useState<Id<"vehicles"> | null>(
    vehicleId,
  );

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return { from: from.getTime(), to: to.getTime() };
  }, [month]);

  const requests = useQuery(api.requests.scheduled, open ? range : "skip");
  const takenVehicles = useQuery(
    api.fleet.takenInRange,
    open && vehicleSelection ? range : "skip",
  );
  const availableVehicles = useQuery(
    api.fleet.availableOn,
    open && vehicleSelection && selectedDay
      ? {
          date: selectedDay.getTime(),
          includeVehicleId: vehicleId ?? undefined,
        }
      : "skip",
  );

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

  const vehiclesByDay = useMemo(() => {
    const map = new Map<
      string,
      { vehicleName: string; source: string; label: string }[]
    >();
    for (const entry of takenVehicles ?? []) {
      const key = format(new Date(entry.date), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    return map;
  }, [takenVehicles]);

  const dayRequests = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  const dayVehicles = useMemo(() => {
    if (!selectedDay) return [];
    return vehiclesByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, vehiclesByDay]);

  function handleConfirm() {
    if (!selectedDay) return;
    onChange(
      selectedDay.getTime(),
      vehicleSelection ? selectedVehicle : undefined,
    );
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
                const vehicles = vehiclesByDay.get(key) ?? [];
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
                      {vehicleSelection && vehicles.length > 0 && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-amber-400">
                          <Truck className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {vehicles.length} pris
                          </span>
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
        <div className="flex w-80 shrink-0 flex-col border-l border-[var(--crm-border)]">
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

              <div className="flex-1 space-y-4 overflow-y-auto p-3">
                {/* Demandes du jour */}
                <div className="space-y-2">
                  {dayRequests.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">
                      Aucune demande planifiée ce jour.
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

                {/* Sélection de véhicule */}
                {vehicleSelection && (
                  <div>
                    {dayVehicles.length > 0 && (
                      <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                          Véhicules déjà pris ce jour
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dayVehicles.map((veh, i) => (
                            <span
                              key={`${veh.vehicleName}-${i}`}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                            >
                              <Truck className="h-3 w-3" />
                              {veh.vehicleName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Véhicule disponible
                    </p>
                    {availableVehicles === undefined ? (
                      <p className="text-xs text-zinc-500">Chargement…</p>
                    ) : availableVehicles.length === 0 ? (
                      <p className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3 text-xs text-zinc-500">
                        Aucun véhicule disponible ce jour.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicle(null)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                            selectedVehicle === null
                              ? "border-brand-500 bg-brand-500/10 text-zinc-100"
                              : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:border-zinc-600",
                          )}
                        >
                          <span className="flex-1">Aucun véhicule</span>
                          {selectedVehicle === null && (
                            <Check className="h-4 w-4 text-brand-400" />
                          )}
                        </button>
                        {availableVehicles.map((veh) => {
                          const active = selectedVehicle === veh._id;
                          return (
                            <button
                              key={veh._id}
                              type="button"
                              onClick={() => setSelectedVehicle(veh._id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition",
                                active
                                  ? "border-brand-500 bg-brand-500/10"
                                  : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] hover:border-zinc-600",
                              )}
                            >
                              {veh.photoUrl ? (
                                <img
                                  src={veh.photoUrl}
                                  alt={veh.name}
                                  className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-[var(--crm-border)]"
                                />
                              ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--crm-surface-3)] text-zinc-400">
                                  <Truck className="h-4 w-4" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-zinc-100">
                                  {veh.name}
                                </p>
                                <p className="truncate text-[11px] text-zinc-500">
                                  {KIND_LABELS[veh.kind] ?? veh.kind}
                                  {veh.plate ? ` · ${veh.plate}` : ""}
                                </p>
                              </div>
                              {active && (
                                <Check className="h-4 w-4 shrink-0 text-brand-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
