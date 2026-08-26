import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  addMonths,
  subMonths,
  format,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarCog,
  ListChecks,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Checkbox, Field, Select } from "../../components/ui/Field";
import { DateTimePicker } from "../../components/ui/DateTimePicker";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { FullSpinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";
import {
  DEPOT_SITE_LABELS,
  DEPOT_VEHICLE_LABELS,
  REQUEST_TYPES,
  TYPE_COLORS,
  TYPE_LABELS,
  type DepotSite,
} from "../../lib/constants";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type CalView = "demandes" | "depots";
type ActivityList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listActivities>>
>;
type Activity = ActivityList[number];
type WorkerList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>>;
type TaskList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>>;
type ScheduleList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkerSchedules>>>;

const RESOURCE_DAY_START_HOUR = 6;
const RESOURCE_DAY_END_HOUR = 20;
const RESOURCE_HOUR_HEIGHT = 72;
const RESOURCE_DAY_HEIGHT = (RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR) * RESOURCE_HOUR_HEIGHT;

export function Calendrier() {
  const [view, setView] = useState<CalView>("demandes");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  return (
    <div>
      <PageHeader
        title="Calendrier"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-semibold capitalize">
              {format(month, "MMMM yyyy", { locale: fr })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
              Aujourd'hui
            </Button>
          </div>
        }
      />

      <div className="px-4 pt-4 sm:px-6">
        <UnderlineTabs
          items={[
            { key: "demandes", label: "Demandes" },
            { key: "depots", label: "Dépôts" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "demandes" ? (
        <RequestsCalendar month={month} />
      ) : <DepotCalendar month={month} />}
    </div>
  );
}

/* ─── Dépôts en recyclerie ───────────────────────────────────────────────── */

type DepotSiteFilter = "all" | DepotSite;

const DEPOT_SITE_FILTERS: { key: DepotSiteFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "60", label: "Pays de Bray 60" },
  { key: "76", label: "Gournay 76" },
];

/**
 * Calendrier des rendez-vous de dépôt, au même format que celui des demandes.
 *
 * Les dépôts n'apparaissent pas dans le calendrier des demandes : ils ont leur
 * propre vue, filtrable par recyclerie, avec la gestion des créneaux ouverts.
 */
function DepotCalendar({ month }: { month: Date }) {
  const access = useCrmAccess();
  const canManage = canAccess(access, "calendrier", "update");
  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [siteFilter, setSiteFilter] = useState<DepotSiteFilter>("all");
  const [slotsOpen, setSlotsOpen] = useState(false);

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return { from: from.getTime(), to: to.getTime() };
  }, [month]);

  const depots = useQuery(api.requests.scheduledDepots, {
    ...range,
    ...(siteFilter === "all" ? {} : { site: siteFilter }),
  });
  const days = useMonthDays(month);

  const byDay = useMemo(() => {
    const map = new Map<string, Doc<"requests">[]>();
    for (const depot of depots ?? []) {
      if (!depot.depot) continue;
      const key = format(new Date(depot.depot.slotStart), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(depot);
      map.set(key, list);
    }
    return map;
  }, [depots]);

  const selectedDayDepots = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-1">
          {DEPOT_SITE_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setSiteFilter(option.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                siteFilter === option.key
                  ? "bg-brand-500 text-white"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setSlotsOpen(true)}>
            <CalendarCog className="h-4 w-4" />
            Gérer les créneaux
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              return (
                <DayCell
                  key={key}
                  day={day}
                  inMonth={isSameMonth(day, month)}
                  isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                  onClick={() => setSelectedDay(day)}
                >
                  {items.map((depot) => (
                    <button
                      key={depot._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenId(depot._id);
                      }}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: TYPE_COLORS.depot }}
                    >
                      {format(new Date(depot.depot!.slotStart), "HH'h'mm")} ·{" "}
                      {depot.customer.lastName}
                    </button>
                  ))}
                </DayCell>
              );
            })}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        variant="left"
        title={selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) : ""}
        bodyClassName="p-0"
      >
        {selectedDay ? (
          <DepotDayPanel depots={selectedDayDepots} onOpenDepot={setOpenId} />
        ) : null}
      </Drawer>

      {slotsOpen ? <DepotSlotsModal onClose={() => setSlotsOpen(false)} /> : null}

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Détail d'une journée de dépôts (panneau latéral). */
function DepotDayPanel({
  depots,
  onOpenDepot,
}: {
  depots: Doc<"requests">[];
  onOpenDepot: (id: Id<"requests">) => void;
}) {
  if (depots.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<PackagePlus className="h-9 w-9" />}
          title="Aucun dépôt ce jour"
          description="Les créneaux réservés depuis le formulaire de dépôt apparaîtront ici."
        />
      </div>
    );
  }
  return (
    <ul className="divide-y divide-[var(--crm-border)]">
      {depots.map((depot) => {
        const detail = depot.depot!;
        return (
          <li key={depot._id}>
            <button
              type="button"
              onClick={() => onOpenDepot(depot._id)}
              className="grid w-full grid-cols-[64px_1fr] items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--crm-surface-2)]"
            >
              <span className="text-sm font-bold tabular-nums text-zinc-100">
                {format(new Date(detail.slotStart), "HH'h'mm")}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-100">
                  {depot.customer.firstName} {depot.customer.lastName}
                </span>
                <span className="block truncate text-xs text-zinc-400">
                  {DEPOT_SITE_LABELS[detail.site]} · {DEPOT_VEHICLE_LABELS[detail.vehicleType]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Gestion des créneaux ouverts : fermer une journée entière ou des horaires
 * précis, par recyclerie. Un créneau déjà réservé ne peut pas être fermé — il
 * faut d'abord traiter le rendez-vous avec le client.
 */
function DepotSlotsModal({ onClose }: { onClose: () => void }) {
  const [site, setSite] = useState<DepotSite>("60");
  const [dateIndex, setDateIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const days = useQuery(api.requests.depotSlots, { site });
  const setAvailability = useMutation(api.requests.setDepotAvailability);

  const day = days?.[Math.min(dateIndex, (days?.length ?? 1) - 1)];

  async function toggle(next: boolean, slotStart?: number) {
    if (!day) return;
    setSaving(true);
    try {
      await setAvailability({ site, date: day.date, slotStart, blocked: next });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Gérer les créneaux de dépôt">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3">
          <Field label="Recyclerie">
            <Select
              value={site}
              onChange={(event) => {
                setSite(event.target.value as DepotSite);
                setDateIndex(0);
              }}
            >
              <option value="60">{DEPOT_SITE_LABELS["60"]}</option>
              <option value="76">{DEPOT_SITE_LABELS["76"]}</option>
            </Select>
          </Field>
          <Field label="Lundi">
            <Select
              value={String(dateIndex)}
              onChange={(event) => setDateIndex(Number(event.target.value))}
            >
              {(days ?? []).map((option, index) => (
                <option key={option.date} value={index}>
                  {format(new Date(`${option.date}T12:00:00`), "EEEE d MMMM yyyy", {
                    locale: fr,
                  })}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {days === undefined ? (
          <FullSpinner label="Chargement des créneaux..." />
        ) : !day ? (
          <EmptyState title="Aucun lundi à configurer" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  {day.dayBlocked ? "Journée fermée" : "Journée ouverte"}
                </p>
                <p className="text-xs text-zinc-400">
                  Fermer la journée retire tous ses créneaux du formulaire public.
                </p>
              </div>
              <Button
                variant={day.dayBlocked ? "secondary" : "outline"}
                size="sm"
                disabled={saving}
                onClick={() => void toggle(!day.dayBlocked)}
              >
                {day.dayBlocked ? "Rouvrir la journée" : "Fermer la journée"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {day.slots.map((slot) => {
                const state = slot.booked
                  ? "booked"
                  : slot.blocked
                    ? "blocked"
                    : "open";
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={saving || slot.booked}
                    onClick={() => void toggle(!slot.blocked, slot.start)}
                    title={
                      state === "booked"
                        ? "Créneau déjà réservé"
                        : state === "blocked"
                          ? "Cliquer pour rouvrir"
                          : "Cliquer pour fermer"
                    }
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-sm font-semibold transition",
                      state === "booked"
                        ? "cursor-not-allowed border-brand-500/40 bg-brand-500/15 text-brand-300"
                        : state === "blocked"
                          ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-500 line-through"
                          : "border-[var(--crm-border)] text-zinc-100 hover:border-brand-500 hover:text-brand-300",
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500/60" /> Réservé
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" /> Fermé
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ─── Calendrier des demandes ─────────────────────────────────────────────── */

function useMonthDays(month: Date) {
  return useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );
}

function RequestsCalendar({ month }: { month: Date }) {
  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const range = useMemo(() => {
    const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const to = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return { from: from.getTime(), to: to.getTime() };
  }, [month]);

  const requests = useQuery(api.requests.scheduled, range);
  const days = useMonthDays(month);

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
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-3">
        {REQUEST_TYPES.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] }} />
            {TYPE_LABELS[t]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              return (
                <DayCell
                  key={key}
                  day={day}
                  inMonth={inMonth}
                  isSelected={isSelected}
                  onClick={() => setSelectedDay(day)}
                >
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
                </DayCell>
              );
            })}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        variant="left"
        title={selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) : ""}
        bodyClassName="p-0"
      >
        {selectedDay && <RequestDayPanel requests={selectedDayRequests} onOpenRequest={setOpenId} />}
      </Drawer>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function RequestDayPanel({
  requests,
  onOpenRequest,
}: {
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <p className="text-sm text-zinc-500">Aucune demande planifiée pour ce jour.</p>
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
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[r.type] }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: TYPE_COLORS[r.type] }}>
              {TYPE_LABELS[r.type]}
            </span>
          </div>
          <p className="text-sm font-semibold text-zinc-100">
            {r.customer.firstName} {r.customer.lastName}
          </p>
          {r.customer.city && <p className="mt-0.5 text-xs text-zinc-500">{r.customer.city}</p>}
          <p className="mt-1.5 text-xs text-zinc-600">{r.customer.phone}</p>
        </button>
      ))}
    </div>
  );
}

/* ─── Gestion ressources : salariés affectés à des tâches ─────────────────── */

/**
 * Planning des agents polyvalents, à la semaine.
 *
 * Une affectation se lit sur quelques jours, pas sur un mois : la vue s'ouvre
 * toujours sur la semaine en cours, et la colonne de gauche permet de ne
 * garder que les agents dont on veut suivre les tâches.
 */
export function ResourceCalendar() {
  const access = useCrmAccess();
  const canRead = canAccess(access, "agents-polyvalents", "read");
  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  const workers = useQuery(api.polyvalents.listWorkers, canRead ? {} : "skip");
  const tasks = useQuery(api.polyvalents.listTasks, canRead ? {} : "skip");
  const schedules = useQuery(api.polyvalents.listWorkerSchedules, canRead ? {} : "skip");
  const activities = useQuery(api.polyvalents.listActivities, canRead ? {} : "skip");

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  /** Agents cochés. Vide = aucun filtre, tout le monde s'affiche. */
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [droppedTaskId, setDroppedTaskId] = useState<Id<"polyvalentTasks"> | null>(null);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      }),
    [weekStart],
  );

  const visibleActivities = useMemo(() => {
    const all = activities ?? [];
    if (selectedWorkerIds.size === 0) return all;
    return all.filter((activity) => selectedWorkerIds.has(String(activity.workerId)));
  }, [activities, selectedWorkerIds]);

  // Une activité s'affiche sur chaque jour compris entre sa date de début et sa
  // date de fin (créneaux multi-jours inclus).
  const byDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of visibleActivities) {
      let cursor = startOfDay(new Date(activity.startAt));
      const last = startOfDay(new Date(activity.endAt));
      while (cursor <= last) {
        const key = format(cursor, "yyyy-MM-dd");
        const arr = map.get(key) ?? [];
        arr.push(activity);
        map.set(key, arr);
        cursor = addDays(cursor, 1);
      }
    }
    return map;
  }, [visibleActivities]);

  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  /** Nombre d'affectations de la semaine, par agent (avant filtrage). */
  const weekCountByWorker = useMemo(() => {
    const counts = new Map<string, number>();
    const from = startOfDay(weekStart);
    const to = endOfWeek(weekStart, { weekStartsOn: 1 });
    for (const activity of activities ?? []) {
      if (activity.endAt < from.getTime() || activity.startAt > to.getTime()) continue;
      const key = String(activity.workerId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [activities, weekStart]);

  const assignedTaskIds = useMemo(
    () => new Set((activities ?? []).map((activity) => String(activity.taskId))),
    [activities],
  );

  function toggleWorker(workerId: string) {
    setSelectedWorkerIds((current) => {
      const next = new Set(current);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
  }

  if (!canRead) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-8 text-center text-sm text-zinc-400">
          Vous n'avez pas accès à la gestion des ressources (agents polyvalents).
        </div>
      </div>
    );
  }

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  return (
    // Le planning occupe la hauteur de l'écran : une semaine chargée se lit
    // d'un coup d'œil, sans faire défiler la page.
    <div className="flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col gap-3 p-4 sm:p-6">
      {/* Les tâches restent visibles au-dessus du calendrier : on les dépose
          simplement sur une journée pour préparer une affectation. */}
      <div className="shrink-0 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tâches à planifier</h3>
          <span className="text-xs text-zinc-500">Glissez une tâche sur un jour du planning.</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(tasks ?? []).map((task) => {
            const unassigned = !assignedTaskIds.has(String(task._id));
            return (
              <div
                key={task._id}
                draggable={canCreate}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-recycapp-task", String(task._id));
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="flex shrink-0 cursor-grab items-center gap-1.5 rounded-xl border border-brand-500/35 bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-200 active:cursor-grabbing"
              >
                <ListChecks className="h-4 w-4" />
                <span>{task.name}</span>
                {unassigned ? (
                  <span title="Aucun salarié affecté" aria-label="Aucun salarié affecté">
                    <TriangleAlert className="h-4 w-4 text-amber-400" />
                  </span>
                ) : null}
              </div>
            );
          })}
          {tasks?.length === 0 ? <p className="text-sm text-zinc-500">Créez d’abord une tâche dans l’onglet « Tâches ».</p> : null}
        </div>
      </div>
      {/* ── Agents : filtre d'affichage ─────────────────────────────────── */}
      <div className="shrink-0 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Agents
          </h3>
          {selectedWorkerIds.size > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedWorkerIds(new Set())}
              className="text-xs font-medium text-brand-400 hover:underline"
            >
              Tout afficher ({workers?.length ?? 0})
            </button>
          ) : (
            <span className="text-xs text-zinc-500">
              Cochez un agent pour ne voir que ses tâches
            </span>
          )}
        </div>

        {workers === undefined ? (
          <p className="px-1 py-1 text-xs text-zinc-500">Chargement…</p>
        ) : workers.length === 0 ? (
          <p className="px-1 py-1 text-xs text-zinc-500">
            Aucun agent. Ajoutez-en depuis « Agents polyvalents ».
          </p>
        ) : (
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {workers.map((worker) => {
              const id = String(worker._id);
              const count = weekCountByWorker.get(id) ?? 0;
              const name = `${worker.firstName} ${worker.lastName}`.trim();
              return (
                <Checkbox
                  key={id}
                  variant="inline"
                  label={count > 0 ? `${name} (${count})` : name}
                  checked={selectedWorkerIds.has(id)}
                  onChange={() => toggleWorker(id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Semaine ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[170px] text-center text-sm font-semibold capitalize">
          {weekLabel}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          Cette semaine
        </Button>
        <p className="ml-auto text-xs text-zinc-500">
          {selectedWorkerIds.size > 0
            ? `Affichage limité à ${selectedWorkerIds.size} agent${selectedWorkerIds.size > 1 ? "s" : ""} sur ${workers?.length ?? 0}.`
            : "Cliquez sur un jour pour affecter des agents à des tâches."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <div className="min-w-[980px]">
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(7,minmax(132px,1fr))] border-b border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-sm">
            <div className="border-r border-[var(--crm-border)]" />
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const today = isToday(day);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-14 items-center justify-center gap-2 border-r border-[var(--crm-border)] px-2 py-2 text-left last:border-r-0",
                    isSelected && "bg-brand-500/8",
                  )}
                >
                  <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-xs", today ? "bg-brand-600 font-semibold text-white" : "text-zinc-300")}>
                    {format(day, "d")}
                  </span>
                  <span className="text-xs font-semibold capitalize text-zinc-500">{format(day, "EEEE", { locale: fr })}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,minmax(132px,1fr))]">
            <div className="relative border-r border-[var(--crm-border)]" style={{ height: RESOURCE_DAY_HEIGHT }}>
              {Array.from({ length: RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR + 1 }, (_, index) => {
                const hour = RESOURCE_DAY_START_HOUR + index;
                return <span key={hour} className="absolute -top-2 right-2 text-[10px] font-medium text-zinc-500" style={{ top: index * RESOURCE_HOUR_HEIGHT }}>{`${String(hour).padStart(2, "0")}:00`}</span>;
              })}
            </div>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const items = byDay.get(key) ?? [];
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(day)}
                onDragOver={(event) => {
                  if (canCreate) event.preventDefault();
                }}
                onDrop={(event) => {
                  const taskId = event.dataTransfer.getData("application/x-recycapp-task") as Id<"polyvalentTasks">;
                  if (!canCreate || !taskId) return;
                  event.preventDefault();
                  setDroppedTaskId(taskId);
                  setSelectedDay(day);
                }}
                className={cn(
                  "relative cursor-pointer border-r border-[var(--crm-border)] transition-colors last:border-r-0",
                  isSelected
                    ? "bg-brand-500/8 ring-1 ring-inset ring-brand-500/30"
                    : "hover:bg-[var(--crm-surface-2)]",
                )}
                style={{ height: RESOURCE_DAY_HEIGHT }}
              >
                {Array.from({ length: RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR + 1 }, (_, index) => <div key={index} className="absolute left-0 right-0 border-t border-[var(--crm-border)]" style={{ top: index * RESOURCE_HOUR_HEIGHT }} />)}
                {items.map((activity) => {
                  const segment = resourceActivitySegment(activity, day);
                  if (!segment) return null;
                  return <button key={activity._id} type="button" onClick={(event) => { event.stopPropagation(); setSelectedDay(day); }} className="absolute left-1 right-1 z-10 overflow-hidden rounded-md border border-brand-400/40 bg-brand-500/25 px-1.5 py-1 text-left text-[11px] font-medium text-brand-100 shadow-sm transition hover:bg-brand-500/40" style={{ top: segment.top, height: segment.height }} title={`${activity.workerName} — ${activity.taskName} · ${segment.timeLabel}`}>
                    <p className="truncate font-semibold">{activity.workerName}</p>
                    <p className="truncate text-brand-100/80">{activity.taskName}</p>
                    {segment.height >= 46 ? <p className="mt-0.5 text-[10px] font-normal text-brand-100/70">{segment.timeLabel}</p> : null}
                  </button>;
                })}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <Drawer
        open={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        variant="side"
        title={selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) : ""}
        bodyClassName="p-0"
      >
        {selectedDay ? (
          <ResourceDayPanel
            day={selectedDay}
            activities={selectedDayActivities}
            workers={workers ?? []}
            tasks={tasks ?? []}
            schedules={schedules ?? []}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            droppedTaskId={droppedTaskId}
            onDroppedTaskConsumed={() => setDroppedTaskId(null)}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

/** Portion d'une activité visible sur une journée, calée sur la grille horaire. */
function resourceActivitySegment(activity: Activity, day: Date) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const visibleStart = Math.max(activity.startAt, dayStart);
  const visibleEnd = Math.min(activity.endAt, dayEnd);
  if (visibleEnd <= visibleStart) return null;
  const gridStart = dayAtHour(day, RESOURCE_DAY_START_HOUR);
  const gridEnd = dayAtHour(day, RESOURCE_DAY_END_HOUR);
  const start = Math.max(visibleStart, gridStart);
  const end = Math.min(visibleEnd, gridEnd);
  if (end <= start) return null;
  return {
    top: ((start - gridStart) / 3_600_000) * RESOURCE_HOUR_HEIGHT,
    height: Math.max(26, ((end - start) / 3_600_000) * RESOURCE_HOUR_HEIGHT),
    timeLabel: `${format(new Date(visibleStart), "HH:mm")} – ${format(new Date(visibleEnd), "HH:mm")}`,
  };
}

function dayAtHour(day: Date, hour: number) {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function ResourceDayPanel({
  day,
  activities,
  workers,
  tasks,
  schedules,
  canCreate,
  canUpdate,
  canDelete,
  droppedTaskId,
  onDroppedTaskConsumed,
}: {
  day: Date;
  activities: Activity[];
  workers: WorkerList;
  tasks: TaskList;
  schedules: ScheduleList;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  droppedTaskId: Id<"polyvalentTasks"> | null;
  onDroppedTaskConsumed: () => void;
}) {
  const createActivity = useMutation(api.polyvalents.createActivity);
  const createActivities = useMutation(api.polyvalents.createActivities);
  const updateActivity = useMutation(api.polyvalents.updateActivity);
  const removeActivity = useMutation(api.polyvalents.deleteActivity);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [workerId, setWorkerId] = useState<Id<"polyvalentWorkers"> | "">("");
  const [taskId, setTaskId] = useState<Id<"polyvalentTasks"> | "">("");
  const [startAt, setStartAt] = useState<number | undefined>(undefined);
  const [endAt, setEndAt] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Id<"polyvalentActivities"> | null>(null);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [repeatDays, setRepeatDays] = useState<Set<number>>(new Set());
  const [repeatTimes, setRepeatTimes] = useState<Record<number, { start: string; end: string }>>({});

  useEffect(() => {
    if (!droppedTaskId) return;
    setEditing(null);
    setTaskId(droppedTaskId);
    setWorkerId("");
    setStartAt(dayAtHour(day, 8));
    setEndAt(dayAtHour(day, 17));
    setRepeatUntil("");
    setRepeatDays(new Set([day.getDay() || 7]));
    setRepeatTimes({ [day.getDay() || 7]: { start: "08:00", end: "17:00" } });
    setError(null);
    setFormOpen(true);
    onDroppedTaskConsumed();
  }, [day, droppedTaskId, onDroppedTaskConsumed]);

  function openCreate() {
    setEditing(null);
    setWorkerId("");
    setTaskId("");
    setStartAt(dayAtHour(day, 8));
    setEndAt(dayAtHour(day, 17));
    setRepeatUntil("");
    setRepeatDays(new Set([day.getDay() || 7]));
    setRepeatTimes({ [day.getDay() || 7]: { start: "08:00", end: "17:00" } });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(activity: Activity) {
    setEditing(activity);
    setWorkerId(activity.workerId);
    setTaskId(activity.taskId);
    setStartAt(activity.startAt);
    setEndAt(activity.endAt);
    setError(null);
    setFormOpen(true);
  }

  async function save() {
    setError(null);
    if (!workerId) return setError("Sélectionne un agent.");
    if (!taskId) return setError("Sélectionne une tâche.");
    if (startAt == null) return setError("Renseigne la date de début.");
    if (endAt == null) return setError("Renseigne la date de fin.");
    if (endAt < startAt) return setError("La fin doit être après le début.");
    setSaving(true);
    try {
      if (editing) {
        await updateActivity({ id: editing._id, workerId, taskId, startAt, endAt });
      } else if (repeatUntil) {
        const until = new Date(`${repeatUntil}T23:59:59`);
        const slots = recurringSlots(day, until, repeatDays, repeatTimes);
        if (slots.length === 0) return setError("Choisissez au moins un jour de récurrence.");
        await createActivities({ workerId, taskId, slots });
      } else {
        await createActivity({ workerId, taskId, startAt, endAt });
      }
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Aucun agent affecté ce jour.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity._id}
              className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                    <UsersRound className="h-3.5 w-3.5 shrink-0 text-brand-300" />
                    <span className="truncate">{activity.workerName}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-brand-300">
                    <ListChecks className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{activity.taskName}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canUpdate ? (
                    <button
                      type="button"
                      onClick={() => openEdit(activity)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-brand-300"
                      aria-label="Modifier l'affectation"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(activity._id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-red-400"
                      aria-label="Supprimer l'affectation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                {format(new Date(activity.startAt), "HH:mm", { locale: fr })} →{" "}
                {format(new Date(activity.endAt), "HH:mm", { locale: fr })}
              </p>
            </div>
          ))
        )}

        {formOpen ? (
          <div className="grid gap-3 rounded-2xl border border-brand-500/40 bg-[var(--crm-surface)] p-4">
            <p className="text-sm font-semibold text-zinc-100">
              {editing ? "Modifier l'affectation" : "Ajouter un salarié"}
            </p>
            <Field label="Agent">
              <Select value={workerId} onChange={(e) => setWorkerId(e.target.value as Id<"polyvalentWorkers">)}>
                <option value="">Sélectionner un agent</option>
                {workers.map((worker) => (
                  <option key={worker._id} value={worker._id}>
                    {worker.firstName} {worker.lastName}{availabilityLabel(schedules, worker._id, day)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tâche">
              <Select value={taskId} onChange={(e) => setTaskId(e.target.value as Id<"polyvalentTasks">)}>
                <option value="">Sélectionner une tâche</option>
                {tasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Début">
              <DateTimePicker value={startAt} onChange={setStartAt} placeholder="Date et heure de début" />
            </Field>
            <Field label="Fin">
              <DateTimePicker value={endAt} onChange={setEndAt} placeholder="Date et heure de fin" />
            </Field>
            {!editing ? (
              <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
                <Field label="Répéter jusqu’au (facultatif)">
                  <input
                    type="date"
                    value={repeatUntil}
                    min={format(day, "yyyy-MM-dd")}
                    onChange={(event) => setRepeatUntil(event.target.value)}
                    className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm"
                  />
                </Field>
                {repeatUntil ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-zinc-400">Jours et horaires de la récurrence</p>
                    {[{ key: 1, label: "Lun" }, { key: 2, label: "Mar" }, { key: 3, label: "Mer" }, { key: 4, label: "Jeu" }, { key: 5, label: "Ven" }, { key: 6, label: "Sam" }, { key: 7, label: "Dim" }].map(({ key, label }) => {
                      const active = repeatDays.has(key);
                      const times = repeatTimes[key] ?? { start: "08:00", end: "17:00" };
                      return (
                        <div key={key} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-sm">
                          <label className="flex items-center gap-1.5"><input type="checkbox" checked={active} onChange={() => setRepeatDays((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} /> {label}</label>
                          <input disabled={!active} type="time" value={times.start} onChange={(event) => setRepeatTimes((current) => ({ ...current, [key]: { ...times, start: event.target.value } }))} className="rounded-md border border-[var(--crm-border)] bg-[var(--crm-surface)] px-2 py-1 disabled:opacity-40" />
                          <input disabled={!active} type="time" value={times.end} onChange={(event) => setRepeatTimes((current) => ({ ...current, [key]: { ...times, end: event.target.value } }))} className="rounded-md border border-[var(--crm-border)] bg-[var(--crm-surface)] px-2 py-1 disabled:opacity-40" />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {canCreate && !formOpen ? (
        <div className="border-t border-[var(--crm-border)] p-4">
          <Button className="w-full" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un salarié
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeActivity({ id: deleting });
          setDeleting(null);
        }}
        title="Supprimer l'affectation ?"
        description="Cet agent ne sera plus affecté à cette tâche sur ce créneau."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

function recurringSlots(
  firstDay: Date,
  until: Date,
  weekdays: Set<number>,
  times: Record<number, { start: string; end: string }>,
) {
  const slots: { startAt: number; endAt: number }[] = [];
  for (let cursor = startOfDay(firstDay); cursor <= until && slots.length <= 100; cursor = addDays(cursor, 1)) {
    const weekday = cursor.getDay() || 7;
    if (!weekdays.has(weekday)) continue;
    const time = times[weekday] ?? { start: "08:00", end: "17:00" };
    const [startHour, startMinute] = time.start.split(":").map(Number);
    const [endHour, endMinute] = time.end.split(":").map(Number);
    const start = new Date(cursor);
    const end = new Date(cursor);
    start.setHours(startHour, startMinute, 0, 0);
    end.setHours(endHour, endMinute, 0, 0);
    if (end > start) slots.push({ startAt: start.getTime(), endAt: end.getTime() });
  }
  return slots;
}

function availabilityLabel(schedules: ScheduleList, workerId: Id<"polyvalentWorkers">, day: Date) {
  const weekday = day.getDay() || 7;
  const slot = schedules.find((schedule) => schedule.workerId === workerId)?.availability.find((item) => item.weekday === weekday);
  return slot ? ` — disponible ${slot.start}–${slot.end}` : " — aucun horaire renseigné";
}

/* ─── Primitives calendrier partagées ─────────────────────────────────────── */

function WeekdayHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-[var(--crm-border)]">
      {WEEKDAYS.map((d) => (
        <div key={d} className="px-3 py-2 text-center text-xs font-semibold text-zinc-500">
          {d}
        </div>
      ))}
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isSelected,
  onClick,
  children,
}: {
  day: Date;
  inMonth: boolean;
  isSelected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const today = isToday(day);
  return (
    <div
      onClick={onClick}
      className={cn(
        "min-h-[104px] cursor-pointer border-b border-r border-[var(--crm-border)] p-1.5 transition-colors last:border-r-0",
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
            ? "bg-brand-600 font-semibold text-white"
            : isSelected
              ? "bg-brand-500/20 font-semibold text-brand-300"
              : inMonth
                ? "text-zinc-300"
                : "text-zinc-500",
        )}
      >
        {format(day, "d")}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
