import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
  Check,
  ChevronDown,
  Search,
  Share2,
  ChevronLeft,
  ChevronRight,
  CalendarCog,
  ListChecks,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
  CalendarPlus,
  Users,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { DateTimePicker } from "../../components/ui/DateTimePicker";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { FullSpinner } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { NewRequestDrawer } from "../../components/crm/NewRequestDrawer";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";
import {
  DEPOT_SITE_LABELS,
  DEPOT_VEHICLE_LABELS,
  REQUEST_TYPES,
  SITE_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
  type DepotSite,
  type Site,
} from "../../lib/constants";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";
import { useUpload } from "../../lib/useUpload";
import { useAnchoredPopover } from "../../lib/useAnchoredPopover";
import { EventCalendar } from "../../components/reui/event-calendar/event-calendar";
import { PLANNER_FRENCH } from "../../components/reui/event-calendar/planner-french";
import { EventCalendarContent } from "../../components/reui/event-calendar/event-calendar-content";
import { EventCalendarNav, EventCalendarToolbar } from "../../components/reui/event-calendar/event-calendar-nav";
import type {
  CalendarEvent as ReuiCalendarEvent,
  EventCalendarProposedUpdate,
} from "../../components/reui/event-calendar/event-calendar-types";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Heures affichées à l'unité près quand c'est rond, sinon avec une décimale. */
function formatHours(hours: number) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} h`;
}

/** Heures de main d'œuvre d'un créneau : sa durée. */
function activityHours(activity: { startAt: number; endAt: number }) {
  return Math.max(0, activity.endAt - activity.startAt) / 3_600_000;
}

type CalView = "tout" | "demandes" | "depots" | "evenements";
type ActivityList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listActivities>>
>;
type Activity = ActivityList[number];
type WorkerList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>
>;
type TaskList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>
>;
type ScheduleList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listWorkerSchedules>>
>;
type DroppedTask = {
  taskId: Id<"polyvalentTasks">;
  startAt: number;
  endAt: number;
};
type PlannerEventData = {
  activity: DisplayActivity;
  activities: DisplayActivity[];
  assignedWorkers: number;
  requiredWorkers: number;
};
type DisplayActivity = Pick<
  Activity,
  | "_id"
  | "_creationTime"
  | "taskId"
  | "workerId"
  | "startAt"
  | "endAt"
  | "taskName"
  | "workerName"
> & {
  recurrenceId?: Id<"polyvalentTaskRecurrences">;
  /** Recyclerie de la tâche planifiée (filtre principal de la page). */
  taskSite?: Site | null;
};

const RESOURCE_DAY_START_HOUR = 8;
const RESOURCE_DAY_END_HOUR = 18;

export function Calendrier() {
  const [view, setView] = useState<CalView>("tout");
  const [eventOpen, setEventOpen] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [globalSlotsOpen, setGlobalSlotsOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

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
            {view === "tout" || view === "demandes" ? (
              <Button size="sm" onClick={() => setNewRequestOpen(true)}>
                <Plus className="h-4 w-4" /> Nouvelle demande
              </Button>
            ) : null}
            {view === "tout" || view === "depots" ? (
              <Button variant="outline" size="sm" onClick={() => setGlobalSlotsOpen(true)}>
                <CalendarCog className="h-4 w-4" /> Gérer les créneaux de dépôt
              </Button>
            ) : null}
            {view === "tout" || view === "evenements" ? (
              <Button size="sm" onClick={() => setEventOpen(true)}>
                <CalendarPlus className="h-4 w-4" /> Nouvel évènement
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="px-4 pt-4 sm:px-6">
        <UnderlineTabs
          items={[
            { key: "tout", label: "Tout" },
            { key: "demandes", label: "Demandes" },
            { key: "depots", label: "Dépôts" },
            { key: "evenements", label: "Évènements" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "tout" ? (
        <AllCalendar month={month} />
      ) : view === "demandes" ? (
        <RequestsCalendar month={month} />
      ) : view === "depots" ? (
        <DepotCalendar month={month} />
      ) : (
        <EventsCalendar month={month} />
      )}
      <EventModal open={eventOpen} onClose={() => setEventOpen(false)} />
      <NewRequestDrawer open={newRequestOpen} onClose={() => setNewRequestOpen(false)} />
      {globalSlotsOpen ? <DepotSlotsModal onClose={() => setGlobalSlotsOpen(false)} /> : null}
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
      if (depot.outcome === "perdue" || !depot.depot) continue;
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSlotsOpen(true)}
          >
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
        title={
          selectedDay
            ? format(selectedDay as Date, "EEEE d MMMM yyyy", { locale: fr })
            : ""
        }
        bodyClassName="p-0"
      >
        {selectedDay ? (
          <DepotDayPanel depots={selectedDayDepots} onOpenDepot={setOpenId} />
        ) : null}
      </Drawer>

      {slotsOpen ? (
        <DepotSlotsModal onClose={() => setSlotsOpen(false)} />
      ) : null}

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
                  {DEPOT_SITE_LABELS[detail.site]} ·{" "}
                  {DEPOT_VEHICLE_LABELS[detail.vehicleType]}
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
                  {format(
                    new Date(`${option.date}T12:00:00`),
                    "EEEE d MMMM yyyy",
                    {
                      locale: fr,
                    },
                  )}
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
                  Fermer la journée retire tous ses créneaux du formulaire
                  public.
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
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500/60" />{" "}
                Réservé
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

/** Couleur des évènements internes, commune à la vue « Tout » et à l'onglet. */
const EVENT_COLOR = "#65a30d";

type CalendarEventList = NonNullable<
  ReturnType<typeof useQuery<typeof api.recycappCalendar.list>>
>;
type CalendarEvent = CalendarEventList[number];

/** Ce qui est prévu un jour donné, tous types confondus. */
type DayEntries = {
  requests: Doc<"requests">[];
  depots: Doc<"requests">[];
  events: CalendarEvent[];
};

/**
 * Vue « Tout » : demandes, dépôts et évènements sur le même mois.
 *
 * Chaque pastille ouvre le même détail que dans son onglet dédié (tiroir de
 * demande pour une demande ou un dépôt, fiche évènement pour un évènement), et
 * cliquer sur une journée fait glisser le panneau du jour, comme dans les
 * calendriers « Demandes » et « Dépôts ».
 */
function AllCalendar({ month }: { month: Date }) {
  const range = useMemo(
    () => ({
      from: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }).getTime(),
      to: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }).getTime(),
    }),
    [month],
  );
  const requests = useQuery(api.requests.scheduled, range);
  const depots = useQuery(api.requests.scheduledDepots, range);
  const events = useQuery(api.recycappCalendar.list, range);
  const days = useMonthDays(month);

  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [openEventId, setOpenEventId] =
    useState<Id<"recycappCalendarEvents"> | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, DayEntries>();
    const bucket = (time: number) => {
      const key = format(new Date(time), "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) return existing;
      const created: DayEntries = { requests: [], depots: [], events: [] };
      map.set(key, created);
      return created;
    };
    for (const request of requests ?? []) {
      if (request.outcome === "perdue" || !request.scheduledDate) continue;
      bucket(request.scheduledDate).requests.push(request);
    }
    for (const depot of depots ?? []) {
      if (depot.outcome === "perdue" || !depot.depot) continue;
      bucket(depot.depot.slotStart).depots.push(depot);
    }
    for (const event of events ?? []) bucket(event.startAt).events.push(event);
    for (const entries of map.values()) {
      entries.requests.sort(
        (a, b) => (a.scheduledDate ?? 0) - (b.scheduledDate ?? 0),
      );
      entries.depots.sort(
        (a, b) => (a.depot?.slotStart ?? 0) - (b.depot?.slotStart ?? 0),
      );
      entries.events.sort((a, b) => a.startAt - b.startAt);
    }
    return map;
  }, [requests, depots, events]);

  const selectedEntries = selectedDay
    ? byDay.get(format(selectedDay, "yyyy-MM-dd"))
    : undefined;
  // L'évènement ouvert est relu dans la liste : il reste à jour après une
  // modification et disparaît de lui-même s'il vient d'être supprimé.
  const openEvent =
    (events ?? []).find((event) => event._id === openEventId) ?? null;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {REQUEST_TYPES.map((type) => (
          <span key={type} className="text-zinc-500">
            <i
              className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] }}
            />
            {TYPE_LABELS[type]}
          </span>
        ))}
        <span className="text-zinc-500">
          <i
            className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: TYPE_COLORS.depot }}
          />
          Dépôt
        </span>
        <span className="text-zinc-500">
          <i
            className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: EVENT_COLOR }}
          />
          Évènement
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const entries = byDay.get(key);
              return (
                <DayCell
                  key={key}
                  day={day}
                  inMonth={isSameMonth(day, month)}
                  isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                  onClick={() => setSelectedDay(day)}
                >
                  {entries?.requests.map((request) => (
                    <button
                      key={request._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenId(request._id);
                      }}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: TYPE_COLORS[request.type] }}
                    >
                      {request.customer.lastName} · {TYPE_LABELS[request.type]}
                    </button>
                  ))}
                  {entries?.depots.map((depot) => (
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
                  {entries?.events.map((item) => (
                    <button
                      key={item._id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenEventId(item._id);
                      }}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: EVENT_COLOR }}
                    >
                      {format(new Date(item.startAt), "HH'h'mm")} · {item.title}
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
        title={
          selectedDay
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
            : ""
        }
        bodyClassName="p-0"
      >
        {selectedDay ? (
          <AllDayPanel
            entries={selectedEntries}
            onOpenRequest={setOpenId}
            onOpenEvent={setOpenEventId}
          />
        ) : null}
      </Drawer>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
      <EventDetailModal
        event={openEvent}
        onClose={() => setOpenEventId(null)}
      />
    </div>
  );
}

/** Détail d'une journée toutes catégories confondues (panneau latéral). */
function AllDayPanel({
  entries,
  onOpenRequest,
  onOpenEvent,
}: {
  entries?: DayEntries;
  onOpenRequest: (id: Id<"requests">) => void;
  onOpenEvent: (id: Id<"recycappCalendarEvents">) => void;
}) {
  const total =
    (entries?.requests.length ?? 0) +
    (entries?.depots.length ?? 0) +
    (entries?.events.length ?? 0);
  if (!entries || total === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<CalendarPlus className="h-9 w-9" />}
          title="Rien de prévu ce jour"
          description="Les demandes planifiées, les dépôts réservés et les évènements de la journée apparaîtront ici."
        />
      </div>
    );
  }
  return (
    <div className="space-y-6 p-4">
      {entries.requests.length > 0 ? (
        <DaySection title="Demandes" count={entries.requests.length}>
          {entries.requests.map((request) => (
            <DayRow
              key={request._id}
              color={TYPE_COLORS[request.type]}
              label={TYPE_LABELS[request.type]}
              title={`${request.customer.firstName} ${request.customer.lastName}`}
              subtitle={
                [request.customer.city, request.customer.phone]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              time={
                request.scheduledDate
                  ? format(new Date(request.scheduledDate), "HH'h'mm")
                  : undefined
              }
              onClick={() => onOpenRequest(request._id)}
            />
          ))}
        </DaySection>
      ) : null}

      {entries.depots.length > 0 ? (
        <DaySection title="Dépôts" count={entries.depots.length}>
          {entries.depots.map((depot) => (
            <DayRow
              key={depot._id}
              color={TYPE_COLORS.depot}
              label="Dépôt"
              title={`${depot.customer.firstName} ${depot.customer.lastName}`}
              subtitle={`${DEPOT_SITE_LABELS[depot.depot!.site]} · ${DEPOT_VEHICLE_LABELS[depot.depot!.vehicleType]}`}
              time={format(new Date(depot.depot!.slotStart), "HH'h'mm")}
              onClick={() => onOpenRequest(depot._id)}
            />
          ))}
        </DaySection>
      ) : null}

      {entries.events.length > 0 ? (
        <DaySection title="Évènements" count={entries.events.length}>
          {entries.events.map((event) => (
            <DayRow
              key={event._id}
              color={EVENT_COLOR}
              label={event.animationType || "Évènement"}
              title={event.title}
              subtitle={
                [
                  event.location,
                  `${format(new Date(event.startAt), "HH'h'mm")} – ${format(new Date(event.endAt), "HH'h'mm")}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              }
              time={format(new Date(event.startAt), "HH'h'mm")}
              onClick={() => onOpenEvent(event._id)}
            />
          ))}
        </DaySection>
      ) : null}
    </div>
  );
}

function DaySection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title} · {count}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DayRow({
  color,
  label,
  title,
  subtitle,
  time,
  onClick,
}: {
  color: string;
  label: string;
  title: string;
  subtitle?: string;
  time?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 text-left transition-colors hover:border-[var(--crm-border-strong)] hover:bg-[var(--crm-surface-2)]"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
        {time ? (
          <span className="ml-auto text-xs font-bold tabular-nums text-zinc-400">
            {time}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      ) : null}
    </button>
  );
}

/** Fiche d'un évènement interne : détails, pièces jointes, liens, suppression. */
function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  const access = useCrmAccess();
  const canDelete = canAccess(access, "calendrier", "delete");
  const canUpdate = canAccess(access, "calendrier", "update");
  const remove = useMutation(api.recycappCalendar.remove);
  const setWorkers = useMutation(api.recycappCalendar.setWorkers);
  const setShared = useMutation(api.recycappCalendar.setShared);
  const [sharing, setSharing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const assignable = useQuery(
    api.recycappCalendar.assignableWorkers,
    editingTeam ? {} : "skip",
  );
  const hours = event ? eventHours(event) : 0;

  // La fiche se rouvre sur un autre évènement : l'édition d'équipe repart à zéro.
  useEffect(() => {
    setEditingTeam(false);
    setEditingEvent(false);
  }, [event?._id]);

  async function saveTeam(next: Id<"polyvalentWorkers">[]) {
    if (!event) return;
    setSavingTeam(true);
    try {
      await setWorkers({ id: event._id, workerIds: next });
      setEditingTeam(false);
    } finally {
      setSavingTeam(false);
    }
  }

  async function destroy() {
    if (!event) return;
    setDeleting(true);
    try {
      await remove({ id: event._id });
      setConfirmOpen(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const details = event
    ? ([
        ["Type d'animation", event.animationType],
        ["Structure MES", event.structure],
        ["Activité", event.activity],
        ["Où ?", event.location],
        ["Évènement rattaché", event.relatedEvent],
        ["Public(s) ciblé(s)", event.targetAudience],
        ["Référent / organisateur", event.organizer],
      ] as const).filter(([, value]) => Boolean(value && value.trim()))
    : [];
  const attachments = (event?.attachmentUrls ?? []).filter(
    (url): url is string => Boolean(url),
  );

  return (
    <Modal
      open={event !== null}
      onClose={onClose}
      title={event?.title ?? "Évènement"}
      className="max-w-2xl"
    >
      {event ? (
        <div className="space-y-5">
          {canUpdate ? (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditingEvent(true)}>
                <Pencil className="h-4 w-4" /> Modifier l'évènement
              </Button>
            </div>
          ) : null}
          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
            <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
              {format(new Date(event.startAt), "EEEE d MMMM yyyy", {
                locale: fr,
              })}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {format(new Date(event.startAt), "HH'h'mm")} –{" "}
              {format(new Date(event.endAt), "HH'h'mm")}
              {isSameDay(new Date(event.startAt), new Date(event.endAt))
                ? ""
                : ` (jusqu'au ${format(new Date(event.endAt), "d MMMM", { locale: fr })})`}
            </p>
          </div>

          {details.length > 0 ? (
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--foreground)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Salariés mobilisés · {formatHours(hours)}
              </p>
              {canUpdate && !editingTeam ? (
                <button
                  type="button"
                  onClick={() => setEditingTeam(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
              ) : null}
            </div>
            <WorkerAllocations workers={event.workers} hours={hours} />
          </div>

          {attachments.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Pièces jointes
              </p>
              <ul className="space-y-1.5">
                {attachments.map((url, index) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 underline underline-offset-2"
                    >
                      Ouvrir la pièce jointe {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {event.urls.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Liens utiles
              </p>
              <ul className="space-y-1.5">
                {event.urls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sm font-medium text-brand-500 underline underline-offset-2"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Absent vaut partagé : l'évènement figure dans l'espace partagé de
              Mes Outils tant qu'on ne l'en retire pas. */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {event.sharedInMesOutils === false
                  ? "Non partagé dans Mes Outils"
                  : "Partagé dans Mes Outils"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                L'évènement apparaît au calendrier de l'espace partagé, lu directement
                ici — aucune copie à tenir à jour.
              </p>
            </div>
            {canUpdate ? (
              <Button
                variant={event.sharedInMesOutils === false ? "primary" : "outline"}
                size="sm"
                disabled={sharing}
                onClick={() => {
                  setSharing(true);
                  void setShared({
                    id: event._id,
                    shared: event.sharedInMesOutils === false,
                  }).finally(() => setSharing(false));
                }}
              >
                <Share2 className="h-4 w-4" />
                {event.sharedInMesOutils === false
                  ? "Partager dans Mes Outils"
                  : "Ne plus partager"}
              </Button>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            {canDelete ? (
              <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            ) : null}
            <Button onClick={onClose}>Fermer</Button>
          </div>

          <WorkerPickerModal
            open={editingTeam}
            onClose={() => setEditingTeam(false)}
            workers={assignable}
            value={event.workers.map((worker) => worker._id)}
            hours={hours}
            saving={savingTeam}
            onValidate={(next) => void saveTeam(next)}
          />

          <EventModal
            open={editingEvent}
            event={event}
            onClose={() => setEditingEvent(false)}
          />

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => void destroy()}
            title="Supprimer cet évènement ?"
            description="L'évènement disparaîtra du calendrier pour toute l'équipe."
            confirmLabel={deleting ? "Suppression..." : "Supprimer"}
          />
        </div>
      ) : null}
    </Modal>
  );
}

function EventsCalendar({ month }: { month: Date }) {
  const range = useMemo(
    () => ({
      from: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }).getTime(),
      to: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }).getTime(),
    }),
    [month],
  );
  const events = useQuery(api.recycappCalendar.list, range);
  const days = useMonthDays(month);
  const [openEventId, setOpenEventId] =
    useState<Id<"recycappCalendarEvents"> | null>(null);
  const openEvent =
    (events ?? []).find((event) => event._id === openEventId) ?? null;
  return (
    <div className="p-4 sm:p-6">
      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                inMonth={isSameMonth(day, month)}
                isSelected={false}
                onClick={() => {}}
              >
                {(events ?? [])
                  .filter((event) => isSameDay(new Date(event.startAt), day))
                  .map((event) => (
                    <button
                      key={event._id}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setOpenEventId(event._id);
                      }}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white hover:opacity-90"
                      style={{ backgroundColor: EVENT_COLOR }}
                    >
                      {format(new Date(event.startAt), "HH'h'mm")} ·{" "}
                      {event.title}
                    </button>
                  ))}
              </DayCell>
            ))}
          </div>
        </div>
      </div>
      <EventDetailModal
        event={openEvent}
        onClose={() => setOpenEventId(null)}
      />
    </div>
  );
}

type AssignableWorker = NonNullable<
  ReturnType<typeof useQuery<typeof api.recycappCalendar.assignableWorkers>>
>[number];

/** Durée d'un évènement, en heures. */
function eventHours(event: { startAt: number; endAt: number }) {
  return Math.max(0, event.endAt - event.startAt) / 3_600_000;
}

/**
 * Part de la semaine d'un salarié que représente l'évènement.
 *
 * `null` quand sa durée hebdomadaire est inconnue (ni contrat RH ni planning) :
 * afficher 0 % laisserait croire à un salarié disponible.
 */
function allocationPercent(hours: number, weekly: number | null) {
  if (!weekly) return null;
  return Math.round((hours / weekly) * 100);
}

/** Case à cocher du sélecteur de salariés (le rendu natif jure avec le CRM). */
function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)]",
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

/**
 * Sélecteur des salariés mobilisés, calqué sur « Attribuer la demande » :
 * filtre par recyclerie, recherche, cartes avec initiales. À la différence
 * d'une demande, un évènement mobilise plusieurs salariés : les cartes se
 * cochent, et chacune annonce la part de semaine que l'évènement représente.
 */
function WorkerPickerModal({
  open,
  onClose,
  workers,
  value,
  onValidate,
  hours,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  workers: AssignableWorker[] | undefined;
  value: Id<"polyvalentWorkers">[];
  onValidate: (next: Id<"polyvalentWorkers">[]) => void;
  hours: number;
  saving?: boolean;
}) {
  const [selected, setSelected] = useState(value);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState<Site | null>(null);

  // Le modal se rouvre sur une sélection à jour, sans garder un brouillon
  // abandonné à la fermeture précédente. La dépendance porte sur les
  // identifiants et non sur le tableau : la fiche évènement en reconstruit un
  // à chaque rendu, ce qui écraserait les cases cochées à chaque clic.
  const valueKey = value.join(",");
  useEffect(() => {
    if (!open) return;
    setSelected(valueKey ? (valueKey.split(",") as Id<"polyvalentWorkers">[]) : []);
    setSearch("");
  }, [open, valueKey]);

  const normalized = search.trim().toLocaleLowerCase("fr-FR");
  const visible = (workers ?? [])
    // Un salarié sans recyclerie renseignée reste proposé quel que soit le filtre.
    .filter(
      (worker) =>
        !siteFilter || !worker.sites?.length || worker.sites.includes(siteFilter),
    )
    .filter(
      (worker) =>
        !normalized ||
        `${worker.name} ${worker.email ?? ""}`
          .toLocaleLowerCase("fr-FR")
          .includes(normalized),
    );

  function toggle(workerId: Id<"polyvalentWorkers">) {
    setSelected((current) =>
      current.includes(workerId)
        ? current.filter((id) => id !== workerId)
        : [...current, workerId],
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Salariés mobilisés"
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {([null, "60", "76"] as Array<Site | null>).map((site) => (
            <button
              key={site ?? "all"}
              type="button"
              onClick={() => setSiteFilter(site)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                siteFilter === site
                  ? "bg-brand-500 text-white"
                  : "bg-[var(--crm-surface-2)] text-zinc-300 hover:bg-[var(--crm-surface-3)]",
              )}
            >
              {site ? SITE_LABELS[site] : "Toutes les recycleries"}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un salarié…"
            className="pl-9"
          />
        </div>

        {workers === undefined ? (
          <FullSpinner label="Chargement de l'équipe..." />
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-6 text-center text-sm text-zinc-500">
            Aucun salarié ne correspond à cette recherche.
          </p>
        ) : (
          <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {visible.map((worker) => {
              const checked = selected.includes(worker._id);
              const percent = allocationPercent(hours, worker.weeklyHours);
              return (
                <button
                  key={worker._id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(worker._id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                    checked
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-[var(--crm-border)] bg-[var(--crm-surface)] hover:border-brand-500/60",
                  )}
                >
                  <CheckMark checked={checked} />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--crm-surface-3)] text-xs font-semibold text-zinc-300">
                    {initials(worker.firstName, worker.lastName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {worker.name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {[
                        worker.employmentType === "permanent"
                          ? "Ouvrier permanent"
                          : worker.employmentType === "polyvalent"
                            ? "Ouvrier polyvalent"
                            : null,
                        worker.sites?.length
                          ? worker.sites
                              .map((site) => SITE_LABELS[site])
                              .join(" · ")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    <span className="block">
                      {worker.weeklyHours
                        ? `${formatHours(worker.weeklyHours)}/sem.`
                        : "durée inconnue"}
                    </span>
                    {percent !== null && hours > 0 ? (
                      <span className="block font-semibold text-brand-400">
                        {percent} %
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            {selected.length === 0
              ? "Aucun salarié sélectionné"
              : `${selected.length} salarié${selected.length > 1 ? "s" : ""} sélectionné${selected.length > 1 ? "s" : ""}`}
            {hours > 0 ? ` · évènement de ${formatHours(hours)}` : ""}
          </p>
          <div className="flex gap-2">
            {selected.length > 0 ? (
              <Button variant="outline" onClick={() => setSelected([])}>
                Tout décocher
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={saving} onClick={() => onValidate(selected)}>
              {saving ? "Enregistrement..." : "Valider"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Temps que l'évènement représente pour chaque salarié affecté. */
function WorkerAllocations({
  workers,
  hours,
}: {
  workers: { _id: Id<"polyvalentWorkers">; name: string; weeklyHours: number | null }[];
  hours: number;
}) {
  if (workers.length === 0) {
    return (
      <p className="text-sm text-zinc-500">Aucun salarié affecté à ce jour.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {workers.map((worker) => {
        const percent = allocationPercent(hours, worker.weeklyHours);
        return (
          <li
            key={worker._id}
            className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-[var(--foreground)]">
                {worker.name}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-brand-500">
                {percent === null ? "—" : `${percent} %`}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-500">
              <span>
                {formatHours(hours)} sur{" "}
                {worker.weeklyHours
                  ? `${formatHours(worker.weeklyHours)} par semaine`
                  : "une durée hebdomadaire inconnue"}
              </span>
            </div>
            {percent !== null ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--crm-surface)]">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Champs d'un évènement saisis dans une liste déroulante. */
type EventOptionField =
  | "animationType"
  | "structure"
  | "activity"
  | "targetAudience";

/**
 * Options livrées d'origine. Celles ajoutées à la main vivent dans
 * `recycappCalendarOptions` et complètent ces listes pour toute l'équipe.
 */
const DEFAULT_EVENT_OPTIONS: Record<EventOptionField, string[]> = {
  animationType: [
    "Atelier réparation",
    "Atelier rencontre",
    "Formation",
    "Vente à thèmes",
  ],
  structure: [
    "Recyclerie",
    "Maison d'Economie Solidaire",
    "Alicias",
    "Pays de bray emploi",
    "Pays de bray service",
    "Les sens du bray",
    "Materiosol",
  ],
  activity: [
    "Repair Café",
    "Connect en Bray",
    "Formation",
    "Cycle en Bray",
    "Animations autres",
  ],
  targetAudience: ["Tout public", "Professionnels", "Particulier"],
};

/**
 * Liste déroulante d'un champ d'évènement, avec ajout d'option à la volée.
 *
 * Le menu est rendu dans un portail : la modale défile, et une liste posée
 * dans son flux serait rognée par son cadre. « Nouvelle option » enregistre le
 * libellé côté serveur : il est ensuite proposé à toute l'équipe.
 */
function OptionSelect({
  field,
  value,
  onChange,
  extraOptions,
}: {
  field: EventOptionField;
  value: string;
  onChange: (value: string) => void;
  extraOptions: string[];
}) {
  const addOption = useMutation(api.recycappCalendar.addOption);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const {
    anchorRef,
    popoverRef,
    place,
    style,
  } = useAnchoredPopover<HTMLDivElement>(open, {
    align: "start",
    matchWidth: true,
  });

  const options = useMemo(() => {
    const seen = new Set<string>();
    const all: string[] = [];
    for (const label of [
      ...DEFAULT_EVENT_OPTIONS[field],
      ...extraOptions,
      // Une valeur déjà enregistrée reste proposée même si l'option a disparu.
      ...(value ? [value] : []),
    ]) {
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(label);
    }
    return all;
  }, [field, extraOptions, value]);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setDraft("");
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
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
  }, [open, anchorRef, popoverRef]);

  // Ouvrir la saisie ou allonger la liste change la hauteur du menu.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, creating, options.length, place]);

  async function create() {
    const label = draft.trim();
    if (!label) return;
    setSaving(true);
    try {
      await addOption({ field, label });
      onChange(label);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 text-left text-sm text-[var(--foreground)] transition-colors hover:border-brand-500/50",
          open && "border-brand-500 ring-2 ring-brand-500/25",
        )}
      >
        <span
          className={cn("min-w-0 truncate", !value && "text-zinc-500")}
        >
          {value || "Sélectionner…"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              style={style}
              className="z-[300] overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            >
              <div className="max-h-64 overflow-y-auto">
                {value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-500 hover:bg-[var(--crm-surface-2)]"
                  >
                    Aucune valeur
                  </button>
                ) : null}
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--crm-surface-2)]",
                      option === value && "bg-brand-500/10 text-brand-400",
                    )}
                  >
                    <span className="truncate">{option}</span>
                    {option === value ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="mt-1 border-t border-[var(--crm-border)] pt-1">
                {creating ? (
                  <div className="flex items-center gap-2 p-1">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void create();
                        }
                      }}
                      placeholder="Libellé de l'option"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2 text-sm text-[var(--foreground)] outline-none focus:border-brand-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => void create()}
                      disabled={saving || !draft.trim()}
                    >
                      Ajouter
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-500 hover:bg-[var(--crm-surface-2)]"
                  >
                    <Plus className="h-4 w-4" /> Nouvelle option
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Champs libres d'un évènement, remis à zéro entre deux créations. */
const EMPTY_EVENT_META = {
  animationType: "",
  structure: "",
  activity: "",
  location: "",
  relatedEvent: "",
  targetAudience: "",
  organizer: "",
};

function EventModal({
  open,
  onClose,
  event = null,
}: {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
}) {
  const create = useMutation(api.recycappCalendar.create);
  const update = useMutation(api.recycappCalendar.update);
  const upload = useUpload();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<number>();
  const [end, setEnd] = useState<number>();
  const [urls, setUrls] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState(EMPTY_EVENT_META);
  const [workerIds, setWorkerIds] = useState<Id<"polyvalentWorkers">[]>([]);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const assignable = useQuery(
    api.recycappCalendar.assignableWorkers,
    open ? {} : "skip",
  );
  const hours = start && end ? eventHours({ startAt: start, endAt: end }) : 0;
  const customOptions = useQuery(
    api.recycappCalendar.options,
    open ? {} : "skip",
  );
  const optionsByField = useMemo(() => {
    const map: Record<EventOptionField, string[]> = {
      animationType: [],
      structure: [],
      activity: [],
      targetAudience: [],
    };
    for (const option of customOptions ?? []) {
      if (option.field in map) {
        map[option.field as EventOptionField].push(option.label);
      }
    }
    return map;
  }, [customOptions]);
  const setMetaField = (key: keyof typeof EMPTY_EVENT_META, value: string) =>
    setMeta((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setStart(event?.startAt);
    setEnd(event?.endAt);
    setUrls(event?.urls.join("\n") ?? "");
    setFile(null);
    setMeta({
      animationType: event?.animationType ?? "",
      structure: event?.structure ?? "",
      activity: event?.activity ?? "",
      location: event?.location ?? "",
      relatedEvent: event?.relatedEvent ?? "",
      targetAudience: event?.targetAudience ?? "",
      organizer: event?.organizer ?? "",
    });
    setWorkerIds(event?.workerIds ?? []);
  }, [open, event]);
  async function save() {
    setSaving(true);
    try {
      await submit();
    } finally {
      setSaving(false);
    }
  }
  async function submit() {
    const attachments = [
      ...(event?.attachments ?? []),
      ...(file ? [await upload(file)] : []),
    ];
    const values = {
      title,
      ...Object.fromEntries(
        Object.entries(meta).filter(([, value]) => value.trim()),
      ),
      startAt: start!,
      endAt: end!,
      workerIds,
      attachments,
      urls: urls
        .split(/\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
    };
    if (event) await update({ id: event._id, ...values });
    else await create(values);
    reset();
    onClose();
  }
  function reset() {
    setTitle("");
    setStart(undefined);
    setEnd(undefined);
    setUrls("");
    setFile(null);
    setMeta(EMPTY_EVENT_META);
    setWorkerIds([]);
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Modifier l'évènement" : "Nouvel évènement"}
      className="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 text-sm text-[var(--foreground)]">
          {event
            ? "Modifiez les informations, les documents et les liens de cet évènement."
            : "Planifiez un évènement, joignez ses documents et centralisez les liens utiles."}
        </div>
        <Field label="Intitulé" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Atelier réparation vélo"
            className="h-11 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 text-[var(--foreground)] shadow-sm outline-none focus:border-brand-500"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["animationType", "Type d'animation"],
              ["structure", "Structure MES"],
              ["activity", "Activité"],
              ["targetAudience", "Public(s) ciblé(s)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <OptionSelect
                field={key}
                value={meta[key]}
                onChange={(value) => setMetaField(key, value)}
                extraOptions={optionsByField[key]}
              />
            </Field>
          ))}
          {(
            [
              ["location", "Où ?"],
              ["relatedEvent", "Évènement rattaché"],
              ["organizer", "Référent / organisateur"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                value={meta[key]}
                onChange={(event) => setMetaField(key, event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 text-[var(--foreground)]"
              />
            </Field>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date et heure de début" required>
            <DateTimePicker
              value={start}
              onChange={setStart}
              placeholder="Choisir le début"
            />
          </Field>
          <Field label="Date et heure de fin" required>
            <DateTimePicker
              value={end}
              onChange={setEnd}
              placeholder="Choisir la fin"
            />
          </Field>
        </div>
        <Field label="Salariés mobilisés">
          <button
            type="button"
            onClick={() => setTeamPickerOpen(true)}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 text-left text-sm text-[var(--foreground)] transition hover:border-brand-500/60"
          >
            <span className={cn("truncate", workerIds.length === 0 && "text-zinc-500")}>
              {workerIds.length === 0
                ? "Aucun salarié"
                : (assignable ?? [])
                    .filter((worker) => workerIds.includes(worker._id))
                    .map((worker) => worker.name)
                    .join(", ")}
            </span>
            <Users className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
        </Field>
        <Field label="Pièce jointe">
          {event?.attachmentUrls.filter((url): url is string => Boolean(url)).length ? (
            <p className="mb-2 text-xs text-zinc-500">
              Les pièces jointes existantes sont conservées. Vous pouvez ajouter un fichier.
            </p>
          ) : null}
          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-brand-400 bg-[var(--crm-surface-2)] px-4 py-4 text-sm font-semibold text-brand-600 transition hover:bg-[var(--crm-surface)]">
            <span>{file ? file.name : "Ajouter un fichier"}</span>
            <span className="rounded-lg bg-[var(--crm-surface)] px-3 py-1.5 text-xs shadow-sm">
              Parcourir
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        <Field label="URLs">
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            className="min-h-24 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3 text-[var(--foreground)] shadow-sm outline-none focus:border-brand-500"
            placeholder="Une URL par ligne"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !title || !start || !end}
          >
            {saving ? "Enregistrement..." : event ? "Enregistrer les modifications" : "Créer l'évènement"}
          </Button>
        </div>
      </div>

      <WorkerPickerModal
        open={teamPickerOpen}
        onClose={() => setTeamPickerOpen(false)}
        workers={assignable}
        value={workerIds}
        hours={hours}
        onValidate={(next) => {
          setWorkerIds(next);
          setTeamPickerOpen(false);
        }}
      />
    </Modal>
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
      if (r.outcome === "perdue" || !r.scheduledDate) continue;
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
              const isSelected = selectedDay
                ? isSameDay(day, selectedDay)
                : false;
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
        title={
          selectedDay
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
            : ""
        }
        bodyClassName="p-0"
      >
        {selectedDay && (
          <RequestDayPanel
            requests={selectedDayRequests}
            onOpenRequest={setOpenId}
          />
        )}
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
export function ResourceCalendar({ siteFilter }: { siteFilter: Site | null }) {
  const access = useCrmAccess();
  const canRead = canAccess(access, "agents-polyvalents", "read");
  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  const allWorkers = useQuery(
    api.polyvalents.listWorkers,
    canRead ? {} : "skip",
  );
  const allTasks = useQuery(api.polyvalents.listTasks, canRead ? {} : "skip");
  const schedules = useQuery(
    api.polyvalents.listWorkerSchedules,
    canRead ? {} : "skip",
  );
  const activities = useQuery(
    api.polyvalents.listActivities,
    canRead ? {} : "skip",
  );
  const recurrences = useQuery(
    api.polyvalents.listRecurrences,
    canRead ? {} : "skip",
  );
  const updatePlannerTiming = useMutation(api.polyvalents.updatePlannerTiming);
  const ensurePlannerTasks = useMutation(api.polyvalents.ensurePlannerTasks);

  // Le filtre principal de la page restreint tout le planning à une recyclerie :
  // les tâches à planifier, les salariés proposés et les créneaux affichés.
  const workers = useMemo(
    () =>
      (allWorkers ?? []).filter(
        (worker) => !siteFilter || worker.sites?.includes(siteFilter),
      ),
    [allWorkers, siteFilter],
  );
  const tasks = useMemo(
    () =>
      (allTasks ?? []).filter(
        (task) =>
          (!siteFilter || task.site === siteFilter) &&
          ["apports", "caisse magasin"].includes(task.name.trim().toLocaleLowerCase("fr")),
      ),
    [allTasks, siteFilter],
  );
  const taskById = useMemo(
    () => new Map((tasks ?? []).map((task) => [String(task._id), task])),
    [tasks],
  );

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [calendarView, setCalendarView] = useState<"week" | "day">("week");
  const [calendarDay, setCalendarDay] = useState(() => {
    const today = startOfDay(new Date());
    return today.getDay() === 0 ? addDays(today, 1) : today;
  });
  const [droppedTask, setDroppedTask] = useState<DroppedTask | null>(null);
  const [foregroundActivityId, setForegroundActivityId] = useState<string | null>(null);
  const [activityToEdit, setActivityToEdit] = useState<PlannerEventData | null>(null);
  const [timingError, setTimingError] = useState<string | null>(null);
  const [pendingTiming, setPendingTiming] = useState<Record<string, { start: Date; end: Date }>>({});

  useEffect(() => {
    if (siteFilter && canCreate) void ensurePlannerTasks({ site: siteFilter }).catch(() => undefined);
  }, [canCreate, ensurePlannerTasks, siteFilter]);

  const days = useMemo(() => {
    if (calendarView === "day") return [calendarDay];
    // La recyclerie ne planifie pas le dimanche : la vue semaine s'arrête au samedi.
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 5) });
  }, [calendarDay, calendarView, weekStart]);

  const recurrenceExceptions = useQuery(
    api.polyvalents.listRecurrenceExceptions,
    canRead ? { startAt: days[0].getTime(), endAt: addDays(days[days.length - 1], 1).getTime() } : "skip",
  );
  const excludedOccurrences = useMemo(
    () => new Set((recurrenceExceptions ?? []).map((item) => `${item.recurrenceId}:${item.originalStartAt}`)),
    [recurrenceExceptions],
  );

  // Une activité s'affiche sur chaque jour compris entre sa date de début et sa
  // date de fin (créneaux multi-jours inclus).
  const byDay = useMemo(() => {
    const map = new Map<string, DisplayActivity[]>();
    const matchesSite = (taskSite: Site | null | undefined) =>
      !siteFilter || taskSite === siteFilter;
    for (const activity of activities ?? []) {
      if (!matchesSite(activity.taskSite)) continue;
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
    for (const recurrence of recurrences ?? []) {
      if (!matchesSite(recurrence.taskSite) || recurrenceExceptions === undefined) continue;
      for (const day of days) {
        const weekday = day.getDay() || 7;
        for (const slot of recurrence.slots.filter(
          (item) => item.weekday === weekday,
        )) {
          const [startHour, startMinute] = slot.start.split(":").map(Number);
          const [endHour, endMinute] = slot.end.split(":").map(Number);
          const start = new Date(day);
          start.setHours(startHour, startMinute, 0, 0);
          if (excludedOccurrences.has(`${recurrence._id}:${start.getTime()}`)) continue;
          const end = new Date(day);
          end.setHours(endHour, endMinute, 0, 0);
          const key = format(day, "yyyy-MM-dd");
          const arr = map.get(key) ?? [];
          arr.push({
            _id: `${recurrence._id}-${start.getTime()}` as Activity["_id"],
            _creationTime: recurrence._creationTime,
            taskId: recurrence.taskId,
            workerId: recurrence.workerId,
            startAt: start.getTime(),
            endAt: end.getTime(),
            taskName: recurrence.taskName,
            workerName: recurrence.workerName,
            recurrenceId: recurrence._id,
            taskSite: recurrence.taskSite,
          });
          map.set(key, arr);
        }
      }
    }
    return map;
  }, [activities, days, recurrences, siteFilter, recurrenceExceptions, excludedOccurrences]);

  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return [];
    return (byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []).filter(
      (activity): activity is Activity => !activity.recurrenceId,
    );
  }, [selectedDay, byDay]);

  const plannerEvents = useMemo(() => {
    const uniqueActivities = new Map<string, DisplayActivity>();
    for (const dayActivities of byDay.values()) {
      for (const activity of dayActivities) {
        uniqueActivities.set(String(activity._id), activity);
      }
    }
    const grouped = new Map<string, DisplayActivity[]>();
    for (const activity of uniqueActivities.values()) {
      const key = `${activity.taskId}-${activity.startAt}-${activity.endAt}`;
      const group = grouped.get(key) ?? [];
      group.push(activity);
      grouped.set(key, group);
    }
    return Array.from(grouped.values()).map((group) => {
      const activity = group[0];
      const requiredWorkers = taskById.get(String(activity.taskId))?.requiredWorkers ?? 1;
      const assignedWorkers = group.filter((item) => Boolean(item.workerId)).length;
      const isCaisse = activity.taskName.toLocaleLowerCase("fr").includes("caisse");
      return {
        id: String(activity._id),
        title: activity.taskName,
        start: new Date(activity.startAt),
        end: new Date(activity.endAt),
        color: isCaisse ? "#7c3aed" : "#059669",
        draggable: canUpdate,
        resizable: canUpdate,
        zIndex: foregroundActivityId === String(activity._id) ? 50 : undefined,
        data: { activity, activities: group, assignedWorkers, requiredWorkers },
      } satisfies ReuiCalendarEvent<PlannerEventData>;
    });
  }, [byDay, taskById, canUpdate, foregroundActivityId]);

  if (!canRead) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-8 text-center text-sm text-zinc-400">
          Vous n'avez pas accès à la gestion des ressources (agents
          polyvalents).
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100dvh-7rem)] min-h-[520px] flex-col p-4 sm:p-6">
        <EventCalendar<PlannerEventData>
          events={plannerEvents.map((event) => ({ ...event, ...pendingTiming[event.id] }))}
          view={calendarView}
          date={calendarView === "week" ? weekStart : calendarDay}
          views={["week", "day"]}
          locale={fr}
          timeZone="Europe/Paris"
          weekStartsOn={1}
          weekendDays={[0]}
          viewSettings={{ weekends: false, nowIndicator: true }}
          dayStartHour={RESOURCE_DAY_START_HOUR}
          dayEndHour={RESOURCE_DAY_END_HOUR}
          slotDuration={30}
          snapDuration={30}
          i18n={PLANNER_FRENCH}
          interactions={{ drag: canUpdate, resize: canUpdate, selectSlot: canCreate }}
          className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--crm-border-strong)] bg-[var(--crm-surface)] text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
          classNames={{
            event: "items-start py-3 text-[var(--foreground)]",
            content: "min-h-0",
            timeGrid: "border-[var(--crm-border)]",
            timeGridHeader: "border-[var(--crm-border)]",
            timeGutter: "border-[var(--crm-border)]",
            dayColumn: "border-[var(--crm-border)] [--ec-slot-line-color:var(--crm-border)]",
            allDaySection: "border-[var(--crm-border)]",
            allDayCell: "border-[var(--crm-border)]",
            resizeHandle: "!h-3 !opacity-100 z-30",
            resizeGrip: "!w-6",
          }}
          onViewChange={(nextView) => {
            if (nextView === "week" || nextView === "day") setCalendarView(nextView);
          }}
          onDateChange={(date) => {
            if (calendarView === "week") setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
            else setCalendarDay(date);
          }}
          onSlotClick={(slot) => {
            const firstTask = tasks[0];
            if (!canCreate || !firstTask) return;
            const day = startOfDay(slot.date);
            setSelectedDay(day);
            setDroppedTask({
              taskId: firstTask._id,
              startAt: slot.date.getTime(),
              endAt: slot.end?.getTime() ?? slot.date.getTime() + 60 * 60_000,
            });
          }}
          onSelectSlot={(slot) => {
            if (!canCreate || !tasks[0]) return;
            setSelectedDay(startOfDay(slot.start));
            setDroppedTask({ taskId: tasks[0]._id, startAt: slot.start.getTime(), endAt: slot.end.getTime() });
          }}
          onEventClick={(occurrence) => {
            setForegroundActivityId(String(occurrence.event.data?.activity._id));
            setActivityToEdit(occurrence.event.data ?? null);
          }}
          onEventUpdate={(update: EventCalendarProposedUpdate<PlannerEventData>) => {
            const eventData = update.event.data;
            const activity = eventData?.activity;
            if (!eventData || !activity || !canUpdate || pendingTiming[update.event.id]) return false;
            setTimingError(null);
            setPendingTiming((current) => ({ ...current, [update.event.id]: { start: update.start, end: update.end } }));
            void updatePlannerTiming({
              activityIds: eventData.activities.filter(isStoredActivity).map((item) => item._id),
              recurrenceIds: eventData.activities.flatMap((item) => item.recurrenceId ? [item.recurrenceId] : []),
              originalStartAt: activity.startAt,
              startAt: update.start.getTime(),
              endAt: update.end.getTime(),
            }).catch((error: unknown) => {
              setTimingError(error instanceof Error ? error.message : "Impossible d’enregistrer le créneau.");
            }).finally(() => {
              setPendingTiming((current) => {
                const next = { ...current };
                delete next[update.event.id];
                return next;
              });
            });
            return true;
          }}
          renderEvent={({ occurrence }) => {
            const data = occurrence.event.data;
            if (!data) return null;
            const worker = data.activity.workerName;
            const workerInitials = worker
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("");
            return (
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden text-left leading-tight text-[var(--foreground)]">
                <span className="flex min-w-0 items-center gap-1 font-bold">
                  <span className="truncate">{occurrence.event.title}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-black/15 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--foreground)]">
                    {data.assignedWorkers}/{data.requiredWorkers}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1 text-[10px] font-medium opacity-85">
                  {data.activity.workerId ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--crm-surface)] text-[8px] font-extrabold text-[var(--foreground)]">
                      {workerInitials}
                    </span>
                  ) : null}
                  <span className="truncate">{worker}</span>
                </span>
                <span className="text-[10px] tabular-nums opacity-80">
                  {format(occurrence.start, "HH:mm")} – {format(occurrence.end, "HH:mm")}
                </span>
              </span>
            );
          }}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--crm-border)] px-3 py-2">
            <EventCalendarNav showViewSwitcher />
            {canCreate ? (
              <Button
                size="sm"
                onClick={() => {
                  const day = calendarView === "day" ? calendarDay : weekStart;
                  if (!tasks[0]) return;
                  setSelectedDay(day);
                  setDroppedTask({ taskId: tasks[0]._id, startAt: dayAtHour(day, 13), endAt: dayAtHour(day, 17) });
                }}
              >
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </Button>
            ) : null}
          </div>
          <EventCalendarToolbar className="hidden" />
          {timingError ? <p role="alert" className="px-4 py-2 text-red-600 dark:text-red-400">{timingError}</p> : null}
          <p className="px-4 py-1 text-xs text-muted-foreground">Glissez une tâche pour la déplacer, ou ses bords pour modifier sa durée. Seule l’occurrence sélectionnée est modifiée.</p>
          <EventCalendarContent />
        </EventCalendar>
      </div>
      <Drawer
        open={selectedDay !== null}
        onClose={() => {
          setSelectedDay(null);
          setActivityToEdit(null);
        }}
        variant="side"
        title={selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) : ""}
        bodyClassName="p-0"
        panelClassName="max-w-4xl"
      >
        {selectedDay ? <ResourceDayPanel day={selectedDay} activities={selectedDayActivities} workers={workers ?? []} tasks={tasks ?? []} schedules={schedules ?? []} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} droppedTask={droppedTask} onDroppedTaskConsumed={() => setDroppedTask(null)} /> : null}
      </Drawer>
      {activityToEdit ? (
        <ActivityWorkerModal
          key={activityToEdit.activity._id}
          activity={activityToEdit.activity}
          occurrenceActivities={activityToEdit.activities}
          workers={workers ?? []}
          requiredWorkers={activityToEdit.requiredWorkers}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onClose={() => setActivityToEdit(null)}
        />
      ) : null}
    </>
  );

}

function dayAtHour(day: Date, hour: number) {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

/** Les occurrences sont des projections calculées : seules les activités
 * enregistrées peuvent être modifiées ou redimensionnées. */
function isStoredActivity(activity: DisplayActivity): activity is Activity {
  return !activity.recurrenceId;
}

/** Édition rapide depuis la grille : l'évènement porte déjà sa tâche et son
 * créneau, il ne reste qu'à lui affecter (ou retirer) un salarié. */
function ActivityWorkerModal({
  activity,
  occurrenceActivities,
  workers,
  requiredWorkers,
  canCreate,
  canUpdate,
  canDelete,
  onClose,
}: {
  activity: DisplayActivity;
  occurrenceActivities: DisplayActivity[];
  workers: WorkerList;
  requiredWorkers: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onClose: () => void;
}) {
  const updateActivity = useMutation(api.polyvalents.updateActivity);
  const createActivity = useMutation(api.polyvalents.createActivity);
  const deletePlannerOccurrence = useMutation(api.polyvalents.deletePlannerOccurrence);
  const [workerId, setWorkerId] = useState<Id<"polyvalentWorkers"> | "">(
    "",
  );
  const [addingWorker, setAddingWorker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const assignedActivities = occurrenceActivities.filter((item) => item.workerId);

  async function save() {
    if (!workerId) return;
    setSaving(true);
    try {
      if (isStoredActivity(activity) && !activity.workerId) {
        await updateActivity({
          id: activity._id,
          taskId: activity.taskId,
          workerId,
          startAt: activity.startAt,
          endAt: activity.endAt,
        });
      } else {
        await createActivity({
          taskId: activity.taskId,
          workerId,
          startAt: activity.startAt,
          endAt: activity.endAt,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    setDeleting(true);
    try {
      await deletePlannerOccurrence({
        activityIds: occurrenceActivities.filter(isStoredActivity).map((item) => item._id),
        recurrenceIds: occurrenceActivities.flatMap((item) => item.recurrenceId ? [item.recurrenceId] : []),
        originalStartAt: activity.startAt,
      });
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Récapitulatif de la tâche" className="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
          <p className="font-semibold text-[var(--foreground)]">{activity.taskName}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {format(new Date(activity.startAt), "EEEE d MMMM · HH:mm", { locale: fr })} – {format(new Date(activity.endAt), "HH:mm", { locale: fr })}
          </p>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            Équipe affectée : <span className="font-semibold">{assignedActivities.length}/{requiredWorkers}</span>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {assignedActivities.map((item) => (
            <div key={item._id} className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
              {item.workerName}
            </div>
          ))}
          {assignedActivities.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun salarié n’est encore affecté.</p>
          ) : null}
        </div>
        {addingWorker ? (
          <Field label="Ajouter un salarié">
            <Select value={workerId} onChange={(event) => setWorkerId(event.target.value as Id<"polyvalentWorkers">)}>
              <option value="">Choisir un salarié</option>
              {workers.map((worker) => <option key={worker._id} value={worker._id}>{worker.firstName} {worker.lastName}</option>)}
            </Select>
          </Field>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          {canDelete ? <Button variant="outline" className="text-red-600 hover:text-red-700 dark:text-red-400" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Supprimer la tâche</Button> : null}
          {!addingWorker && canCreate && assignedActivities.length < requiredWorkers ? <Button onClick={() => setAddingWorker(true)}><Plus className="h-4 w-4" />Ajouter un salarié</Button> : null}
          {addingWorker ? <Button onClick={() => void save()} disabled={saving || !workerId}>{saving ? "Enregistrement…" : "Ajouter"}</Button> : null}
          {!addingWorker && !activity.workerId && isStoredActivity(activity) && canUpdate ? <Button onClick={() => setAddingWorker(true)}><Plus className="h-4 w-4" />Affecter un salarié</Button> : null}
        </div>
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => void destroy()}
          title="Supprimer cette tâche ?"
          description="Le créneau sélectionné et ses affectations seront supprimés. Si la tâche est récurrente, les autres semaines restent inchangées."
          confirmLabel={deleting ? "Suppression…" : "Supprimer"}
        />
      </div>
    </Modal>
  );
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
  droppedTask,
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
  droppedTask: DroppedTask | null;
  onDroppedTaskConsumed: () => void;
}) {
  const createActivity = useMutation(api.polyvalents.createActivity);
  const createActivities = useMutation(api.polyvalents.createActivities);
  const createRecurrence = useMutation(api.polyvalents.createRecurrence);
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
  const [deleting, setDeleting] = useState<Id<"polyvalentActivities"> | null>(
    null,
  );
  const [extraSlots, setExtraSlots] = useState<
    { startAt: number; endAt: number }[]
  >([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceSlots, setRecurrenceSlots] = useState<
    Record<number, { start: string; end: string }>
  >({});

  useEffect(() => {
    if (!droppedTask) return;
    setEditing(null);
    setTaskId(droppedTask.taskId);
    setWorkerId("");
    setStartAt(droppedTask.startAt);
    setEndAt(droppedTask.endAt);
    setExtraSlots([]);
    setIsRecurring(false);
    setRecurrenceSlots({});
    setError(null);
    setFormOpen(true);
    onDroppedTaskConsumed();
  }, [droppedTask, onDroppedTaskConsumed]);

  function openCreate() {
    setEditing(null);
    setWorkerId("");
    setTaskId("");
    setStartAt(dayAtHour(day, 8));
    setEndAt(dayAtHour(day, 17));
    setExtraSlots([]);
    setIsRecurring(false);
    setRecurrenceSlots({});
    setError(null);
    setFormOpen(true);
  }

  function openEdit(activity: Activity) {
    setEditing(activity);
    setWorkerId(activity.workerId ?? "");
    setTaskId(activity.taskId);
    setStartAt(activity.startAt);
    setEndAt(activity.endAt);
    setIsRecurring(false);
    setError(null);
    setFormOpen(true);
  }

  async function save() {
    setError(null);
    if (!taskId) return setError("Sélectionne une tâche.");
    if (isRecurring) {
      if (Object.keys(recurrenceSlots).length === 0) {
        return setError("Sélectionne au moins un jour.");
      }
    } else {
      if (startAt == null) return setError("Renseigne la date de début.");
      if (endAt == null) return setError("Renseigne la date de fin.");
      if (endAt < startAt) return setError("La fin doit être après le début.");
    }
    setSaving(true);
    const shared = { workerId: workerId || undefined, taskId };
    try {
      if (editing) {
        await updateActivity({ id: editing._id, ...shared, startAt: startAt!, endAt: endAt! });
      } else if (isRecurring) {
        await createRecurrence({
          ...shared,
          slots: Object.entries(recurrenceSlots).map(([weekday, slot]) => ({
            weekday: Number(weekday),
            ...slot,
          })),
        });
      } else if (extraSlots.length > 0) {
        await createActivities({
          ...shared,
          slots: [{ startAt: startAt!, endAt: endAt! }, ...extraSlots],
        });
      } else {
        await createActivity({ ...shared, startAt: startAt!, endAt: endAt! });
      }
      setFormOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {!editing && activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Aucun agent affecté ce jour.
          </p>
        ) : !editing ? (
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
                <span className="text-zinc-500">
                  {" · "}
                  {formatHours(activityHours(activity))}
                </span>
              </p>
            </div>
          ))
        ) : null}

        {formOpen ? (
          <div className="grid gap-3 rounded-2xl border border-brand-500/40 bg-[var(--crm-surface)] p-4">
            <p className="text-sm font-semibold text-zinc-100">
              {editing ? "Modifier le créneau" : "Planifier une tâche"}
            </p>
            <Field label="Salarié (facultatif)">
              <Select
                value={workerId}
                onChange={(e) =>
                  setWorkerId(e.target.value as Id<"polyvalentWorkers">)
                }
              >
                <option value="">Aucun salarié affecté</option>
                {workers.map((worker) => (
                  <option key={worker._id} value={worker._id}>
                    {worker.firstName} {worker.lastName}
                    {availabilityLabel(schedules, worker._id, day)}
                  </option>
                ))}
              </Select>
            </Field>
            {!editing ? <Field label="Tâche">
              <Select
                value={taskId}
                onChange={(e) => {
                  const nextId = e.target.value as Id<"polyvalentTasks">;
                  setTaskId(nextId);
                  const task = tasks.find((item) => item._id === nextId);
                  if (task?.name.toLocaleLowerCase("fr").includes("apports")) { setStartAt(dayAtHour(day, 13)); setEndAt(dayAtHour(day, 17)); }
                  if (task?.name.toLocaleLowerCase("fr").includes("caisse")) { setStartAt(dayAtHour(day, 14)); setEndAt(dayAtHour(day, 17)); }
                }}
              >
                <option value="">Sélectionner une tâche</option>
                {tasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.name}
                  </option>
                ))}
              </Select>
            </Field> : null}
            {!isRecurring && !editing ? <Field label="Début">
              <DateTimePicker
                value={startAt}
                onChange={setStartAt}
                placeholder="Date et heure de début"
              />
            </Field> : null}
            {!isRecurring && !editing ? <Field label="Fin">
              <DateTimePicker
                value={endAt}
                onChange={setEndAt}
                placeholder="Date et heure de fin"
              />
            </Field> : null}
            {!editing ? (
              <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
                <Checkbox
                  label="Cette tâche est-elle récurrente ?"
                  variant="inline"
                  checked={isRecurring}
                  onChange={(event) => {
                    setIsRecurring(event.target.checked);
                    if (
                      event.target.checked &&
                      Object.keys(recurrenceSlots).length === 0
                    ) {
                      const start = startAt
                        ? format(new Date(startAt), "HH:mm")
                        : "08:00";
                      const end = endAt
                        ? format(new Date(endAt), "HH:mm")
                        : "17:00";
                      setRecurrenceSlots({
                        [day.getDay() || 7]: { start, end },
                      });
                    }
                  }}
                />
                {isRecurring ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-zinc-500">
                      Choisissez les jours et leurs horaires. La règle reste
                      active jusqu’à son annulation dans l’onglet Tâches.
                    </p>
                    {[
                      "Lundi",
                      "Mardi",
                      "Mercredi",
                      "Jeudi",
                      "Vendredi",
                      "Samedi",
                    ].map((label, index) => {
                      const weekday = index + 1;
                      const slot = recurrenceSlots[weekday];
                      return (
                        <div
                          key={weekday}
                          className="grid grid-cols-[minmax(132px,1fr)_1fr_1fr] items-center gap-3 rounded-lg border border-[var(--crm-border)] p-2"
                        >
                          <Checkbox
                            label={label}
                            variant="inline"
                            checked={Boolean(slot)}
                            onChange={() =>
                              setRecurrenceSlots((current) => {
                                const next = { ...current };
                                if (next[weekday]) delete next[weekday];
                                else {
                                  const firstSlot = Object.values(next)[0];
                                  next[weekday] = firstSlot
                                    ? { ...firstSlot }
                                    : { start: "09:00", end: "17:00" };
                                }
                                return next;
                              })
                            }
                          />
                          <input
                            type="time"
                            disabled={!slot}
                            value={slot?.start ?? "09:00"}
                            onChange={(event) =>
                              setRecurrenceSlots((current) => ({
                                ...current,
                                [weekday]: {
                                  ...(current[weekday] ?? { end: "17:00" }),
                                  start: event.target.value,
                                },
                              }))
                            }
                            className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-2 py-2 text-sm disabled:opacity-40"
                          />
                          <input
                            type="time"
                            disabled={!slot}
                            value={slot?.end ?? "17:00"}
                            onChange={(event) =>
                              setRecurrenceSlots((current) => ({
                                ...current,
                                [weekday]: {
                                  ...(current[weekday] ?? { start: "09:00" }),
                                  end: event.target.value,
                                },
                              }))
                            }
                            className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-2 py-2 text-sm disabled:opacity-40"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">Autres créneaux</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExtraSlots((current) => [
                            ...current,
                            {
                              startAt: startAt ?? dayAtHour(day, 8),
                              endAt: endAt ?? dayAtHour(day, 9),
                            },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                    <p className="mb-3 text-xs text-zinc-500">
                      Ajoutez uniquement les jours nécessaires : chaque créneau
                      a sa propre date et ses propres horaires.
                    </p>
                    {extraSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2"
                      >
                        <DateTimePicker
                          value={slot.startAt}
                          onChange={(value) =>
                            setExtraSlots((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, startAt: value ?? item.startAt }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Début"
                        />
                        <DateTimePicker
                          value={slot.endAt}
                          onChange={(value) =>
                            setExtraSlots((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, endAt: value ?? item.endAt }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Fin"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExtraSlots((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          className="rounded-lg p-2 text-zinc-500 hover:bg-[var(--crm-surface)] hover:text-red-400"
                          aria-label="Retirer ce créneau"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFormOpen(false)}
              >
                Annuler
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer"
                    : "Ajouter"}
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

function availabilityLabel(
  schedules: ScheduleList,
  workerId: Id<"polyvalentWorkers">,
  day: Date,
) {
  const weekday = day.getDay() || 7;
  const slots = schedules
    .find((schedule) => schedule.workerId === workerId)
    ?.availability.filter((item) => item.weekday === weekday);
  return slots?.length
    ? ` — disponible ${slots.map((slot) => `${slot.start}–${slot.end}`).join(" · ")}`
    : " — aucun horaire renseigné";
}

/* ─── Primitives calendrier partagées ─────────────────────────────────────── */

function WeekdayHeader() {
  return (
    <div className="grid grid-cols-7 border-b border-[var(--crm-border)]">
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="px-3 py-2 text-center text-xs font-semibold text-zinc-500"
        >
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
