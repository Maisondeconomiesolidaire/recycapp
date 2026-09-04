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
  CalendarPlus,
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
  type Site,
} from "../../lib/constants";
import { cn } from "../../lib/cn";
import { useUpload } from "../../lib/useUpload";

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

const RESOURCE_DAY_START_HOUR = 6;
const RESOURCE_DAY_END_HOUR = 20;
const RESOURCE_HOUR_HEIGHT = 72;
const RESOURCE_DAY_HEIGHT =
  (RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR) * RESOURCE_HOUR_HEIGHT;

export function Calendrier() {
  const [view, setView] = useState<CalView>("tout");
  const [eventOpen, setEventOpen] = useState(false);
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
              <Button size="sm">
                <Plus className="h-4 w-4" /> Nouvelle demande
              </Button>
            ) : null}
            {view === "tout" || view === "depots" ? (
              <Button variant="outline" size="sm">
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
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
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
  const events = useQuery((api as any).recycappCalendar.list, range) as
    | Array<{
        _id: string;
        title: string;
        startAt: number;
        endAt: number;
        urls?: string[];
        attachmentUrls?: Array<string | null>;
      }>
    | undefined;
  const [detail, setDetail] = useState<{ title: string; content: ReactNode } | null>(null);
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
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-orange-600" />
          Dépôt
        </span>
        <span className="text-zinc-500">
          <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-lime-600" />
          Évènement
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {useMonthDays(month).map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                inMonth={isSameMonth(day, month)}
                isSelected={false}
                onClick={() => {}}
              >
                {(requests ?? [])
                  .filter(
                    (item) =>
                      item.scheduledDate &&
                      isSameDay(new Date(item.scheduledDate), day),
                  )
                  .map((item) => (
                    <button
                      key={item._id}
                      onClick={() =>
                        setDetail({
                          title: "Demande",
                          content: (
                            <>
                              <p className="font-semibold">
                                {item.customer.firstName}{" "}
                                {item.customer.lastName}
                              </p>
                              <p>{TYPE_LABELS[item.type]}</p>
                              <p>{item.customer.phone}</p>
                            </>
                          ),
                        })
                      }
                      className="mb-1 w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[item.type] }}
                    >
                      {item.customer.lastName} · {TYPE_LABELS[item.type]}
                    </button>
                  ))}
                {(depots ?? [])
                  .filter(
                    (item) =>
                      item.depot &&
                      isSameDay(new Date(item.depot.slotStart), day),
                  )
                  .map((item) => (
                    <button
                      key={item._id}
                      onClick={() =>
                        setDetail({
                          title: `Dépôt ${item.depot!.site}`,
                          content: (
                            <>
                              <p className="font-semibold">
                                {item.customer.firstName}{" "}
                                {item.customer.lastName}
                              </p>
                              <p>
                                Créneau :{" "}
                                {format(
                                  new Date(item.depot!.slotStart),
                                  "HH:mm",
                                )}{" "}
                                –{" "}
                                {format(new Date(item.depot!.slotEnd), "HH:mm")}
                              </p>
                            </>
                          ),
                        })
                      }
                      className="mb-1 w-full truncate rounded-md bg-orange-600 px-1.5 py-1 text-left text-[11px] font-medium text-white"
                    >
                      {format(new Date(item.depot!.slotStart), "HH:mm")} · Dépôt{" "}
                      {item.depot!.site}
                    </button>
                  ))}
                {(events ?? [])
                  .filter((item) => isSameDay(new Date(item.startAt), day))
                  .map((item) => (
                    <button
                      key={item._id}
                      onClick={() =>
                        setDetail({
                          title: item.title,
                          content: (
                            <>
                              <p>
                                {format(
                                  new Date(item.startAt),
                                  "EEEE d MMMM HH:mm",
                                  { locale: fr },
                                )}{" "}
                                – {format(new Date(item.endAt), "HH:mm")}
                              </p>
                              {item.urls?.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-brand-600 underline"
                                >
                                  {url}
                                </a>
                              ))}
                            </>
                          ),
                        })
                      }
                      className="mb-1 w-full truncate rounded-md bg-lime-600 px-1.5 py-1 text-left text-[11px] font-medium text-white"
                    >
                      {format(new Date(item.startAt), "HH:mm")} · {item.title}
                    </button>
                  ))}
              </DayCell>
            ))}
          </div>
        </div>
      </div>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? "Détail"}
      >
        {detail?.content}
      </Modal>
    </div>
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
  const events = useQuery((api as any).recycappCalendar.list, range) as
    | Array<{ _id: string; title: string; startAt: number }>
    | undefined;
  return (
    <div className="p-4 sm:p-6">
      <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
        <div className="min-w-[720px]">
          <WeekdayHeader />
          <div className="grid grid-cols-7">
            {useMonthDays(month).map((day) => (
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
                    <div
                      key={event._id}
                      className="mb-1 truncate rounded-md bg-fuchsia-600 px-1.5 py-1 text-[11px] font-medium text-white"
                    >
                      {format(new Date(event.startAt), "HH:mm")} · {event.title}
                    </div>
                  ))}
              </DayCell>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useMutation((api as any).recycappCalendar.create);
  const upload = useUpload();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<number>();
  const [end, setEnd] = useState<number>();
  const [urls, setUrls] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function save() {
    const attachments = file ? [await upload(file)] : [];
    await create({
      title,
      startAt: start!,
      endAt: end!,
      attachments,
      urls: urls
        .split(/\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
    });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="Nouvel évènement">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 text-sm text-[var(--foreground)]">
          Planifiez un évènement, joignez ses documents et centralisez les liens
          utiles.
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
        <Field label="Pièce jointe">
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
            disabled={!title || !start || !end}
          >
            Créer l'évènement
          </Button>
        </div>
      </div>
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
  const removeRecurrence = useMutation(api.polyvalents.deleteRecurrence);

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
        (task) => !siteFilter || task.site === siteFilter,
      ),
    [allTasks, siteFilter],
  );

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [droppedTask, setDroppedTask] = useState<DroppedTask | null>(null);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      }),
    [weekStart],
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
      if (!matchesSite(recurrence.taskSite)) continue;
      for (const day of days) {
        const weekday = day.getDay() || 7;
        for (const slot of recurrence.slots.filter(
          (item) => item.weekday === weekday,
        )) {
          const [startHour, startMinute] = slot.start.split(":").map(Number);
          const [endHour, endMinute] = slot.end.split(":").map(Number);
          const start = new Date(day);
          start.setHours(startHour, startMinute, 0, 0);
          const end = new Date(day);
          end.setHours(endHour, endMinute, 0, 0);
          const key = format(day, "yyyy-MM-dd");
          const arr = map.get(key) ?? [];
          arr.push({
            _id: `${recurrence._id}-${weekday}` as Activity["_id"],
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
  }, [activities, days, recurrences, siteFilter]);

  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return [];
    return (byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []).filter(
      (activity): activity is Activity => !activity.recurrenceId,
    );
  }, [selectedDay, byDay]);

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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Tâches à planifier
          </h3>
          <span className="text-xs text-zinc-500">
            Glissez une tâche sur un jour du planning.
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(tasks ?? []).map((task) => {
            return (
              <div
                key={task._id}
                draggable={canCreate}
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "application/x-recycapp-task",
                    String(task._id),
                  );
                  event.dataTransfer.effectAllowed = "copy";
                }}
                className="flex shrink-0 cursor-grab items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm active:cursor-grabbing"
              >
                <ListChecks className="h-4 w-4" />
                <span>{task.name}</span>
              </div>
            );
          })}
          {tasks?.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Créez d’abord une tâche dans l’onglet « Tâches ».
            </p>
          ) : null}
        </div>
        {(recurrences?.length ?? 0) > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--crm-border)] pt-3">
            {recurrences?.map((recurrence) => (
              <div
                key={recurrence._id}
                className="flex items-center gap-2 rounded-lg bg-[var(--crm-surface-2)] px-2 py-1.5 text-xs"
              >
                <span>Récurrente : {recurrence.taskName}</span>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() =>
                      void removeRecurrence({ id: recurrence._id })
                    }
                    className="font-semibold text-red-400 hover:underline"
                  >
                    Annuler
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {/* ── Semaine ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[170px] text-center text-sm font-semibold capitalize">
          {weekLabel}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
          }
        >
          Cette semaine
        </Button>
        <p className="ml-auto text-xs text-zinc-500">
          Déposez une tâche sur le créneau souhaité, puis renseignez-la si
          besoin.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
        <div className="min-w-[980px]">
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(7,minmax(132px,1fr))] border-b border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-sm">
            <div className="border-r border-[var(--crm-border)]" />
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const isSelected = selectedDay
                ? isSameDay(day, selectedDay)
                : false;
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
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs",
                      today
                        ? "bg-brand-600 font-semibold text-white"
                        : "text-zinc-300",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span className="text-xs font-semibold capitalize text-zinc-500">
                    {format(day, "EEEE", { locale: fr })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,minmax(132px,1fr))]">
            <div
              className="relative border-r border-[var(--crm-border)]"
              style={{ height: RESOURCE_DAY_HEIGHT }}
            >
              {Array.from(
                { length: RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR + 1 },
                (_, index) => {
                  const hour = RESOURCE_DAY_START_HOUR + index;
                  return (
                    <span
                      key={hour}
                      className="absolute -top-2 right-2 text-[10px] font-medium text-zinc-500"
                      style={{ top: index * RESOURCE_HOUR_HEIGHT }}
                    >{`${String(hour).padStart(2, "0")}:00`}</span>
                  );
                },
              )}
            </div>
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = byDay.get(key) ?? [];
              const isSelected = selectedDay
                ? isSameDay(day, selectedDay)
                : false;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  onDragOver={(event) => {
                    if (canCreate) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    const taskId = event.dataTransfer.getData(
                      "application/x-recycapp-task",
                    ) as Id<"polyvalentTasks">;
                    if (!canCreate || !taskId) return;
                    event.preventDefault();
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const hour = Math.max(
                      RESOURCE_DAY_START_HOUR,
                      Math.min(
                        RESOURCE_DAY_END_HOUR - 1,
                        RESOURCE_DAY_START_HOUR +
                          Math.floor(
                            (event.clientY - bounds.top) / RESOURCE_HOUR_HEIGHT,
                          ),
                      ),
                    );
                    setDroppedTask({
                      taskId,
                      startAt: dayAtHour(day, hour),
                      endAt: dayAtHour(day, hour + 1),
                    });
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
                  {Array.from(
                    {
                      length:
                        RESOURCE_DAY_END_HOUR - RESOURCE_DAY_START_HOUR + 1,
                    },
                    (_, index) => (
                      <div
                        key={index}
                        className="absolute left-0 right-0 border-t border-[var(--crm-border)]"
                        style={{ top: index * RESOURCE_HOUR_HEIGHT }}
                      />
                    ),
                  )}
                  {items.map((activity) => {
                    const segment = resourceActivitySegment(activity, day);
                    if (!segment) return null;
                    return (
                      <button
                        key={activity._id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDay(day);
                        }}
                        className="absolute left-1 right-1 z-10 overflow-hidden rounded-md border border-brand-400/40 bg-brand-500/25 px-1.5 py-1 text-left text-[11px] font-medium text-brand-100 shadow-sm transition hover:bg-brand-500/40"
                        style={{ top: segment.top, height: segment.height }}
                        title={`${activity.workerName} — ${activity.taskName} · ${segment.timeLabel}`}
                      >
                        <p className="flex items-center gap-1 truncate font-semibold">
                          <span className="truncate">{activity.taskName}</span>
                          {!activity.workerId ? (
                            <span
                              title="Aucun salarié affecté"
                              aria-label="Aucun salarié affecté"
                            >
                              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-brand-100/80">
                          {activity.workerName}
                        </p>
                        {segment.height >= 46 ? (
                          <p className="mt-0.5 text-[10px] font-normal text-brand-100/70">
                            {segment.timeLabel}
                          </p>
                        ) : null}
                      </button>
                    );
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
        title={
          selectedDay
            ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })
            : ""
        }
        bodyClassName="p-0"
        panelClassName="max-w-4xl"
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
            droppedTask={droppedTask}
            onDroppedTaskConsumed={() => setDroppedTask(null)}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

/** Portion d'une activité visible sur une journée, calée sur la grille horaire. */
function resourceActivitySegment(activity: DisplayActivity, day: Date) {
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
    setError(null);
    setFormOpen(true);
  }

  async function save() {
    setError(null);
    if (!taskId) return setError("Sélectionne une tâche.");
    if (startAt == null) return setError("Renseigne la date de début.");
    if (endAt == null) return setError("Renseigne la date de fin.");
    if (endAt < startAt) return setError("La fin doit être après le début.");
    setSaving(true);
    const shared = { workerId: workerId || undefined, taskId };
    try {
      if (editing) {
        await updateActivity({ id: editing._id, ...shared, startAt, endAt });
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
          slots: [{ startAt, endAt }, ...extraSlots],
        });
      } else {
        await createActivity({ ...shared, startAt, endAt });
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
                <span className="text-zinc-500">
                  {" · "}
                  {formatHours(activityHours(activity))}
                </span>
              </p>
            </div>
          ))
        )}

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
            <Field label="Tâche">
              <Select
                value={taskId}
                onChange={(e) =>
                  setTaskId(e.target.value as Id<"polyvalentTasks">)
                }
              >
                <option value="">Sélectionner une tâche</option>
                {tasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Début">
              <DateTimePicker
                value={startAt}
                onChange={setStartAt}
                placeholder="Date et heure de début"
              />
            </Field>
            <Field label="Fin">
              <DateTimePicker
                value={endAt}
                onChange={setEndAt}
                placeholder="Date et heure de fin"
              />
            </Field>
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
                      "Dimanche",
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
                                else
                                  next[weekday] = {
                                    start: "09:00",
                                    end: "17:00",
                                  };
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
  const slot = schedules
    .find((schedule) => schedule.workerId === workerId)
    ?.availability.find((item) => item.weekday === weekday);
  return slot
    ? ` — disponible ${slot.start}–${slot.end}`
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
