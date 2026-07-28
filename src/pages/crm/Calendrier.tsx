import { useMemo, useState, type ReactNode } from "react";
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
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Field, Select } from "../../components/ui/Field";
import { DateTimePicker } from "../../components/ui/DateTimePicker";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";
import { TYPE_COLORS, TYPE_LABELS } from "../../lib/constants";
import { cn } from "../../lib/cn";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type CalView = "demandes" | "ressources";
type ActivityList = NonNullable<
  ReturnType<typeof useQuery<typeof api.polyvalents.listActivities>>
>;
type Activity = ActivityList[number];
type WorkerList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>>;
type TaskList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>>;

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
            { key: "ressources", label: "Gestion ressources" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "demandes" ? (
        <RequestsCalendar month={month} />
      ) : (
        <ResourceCalendar month={month} />
      )}
    </div>
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
        {(Object.keys(TYPE_COLORS) as (keyof typeof TYPE_COLORS)[]).map((t) => (
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

function ResourceCalendar({ month }: { month: Date }) {
  const access = useCrmAccess();
  const canRead = canAccess(access, "agents-polyvalents", "read");
  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  const workers = useQuery(api.polyvalents.listWorkers, canRead ? {} : "skip");
  const tasks = useQuery(api.polyvalents.listTasks, canRead ? {} : "skip");
  const activities = useQuery(api.polyvalents.listActivities, canRead ? {} : "skip");

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const days = useMonthDays(month);

  // Une activité s'affiche sur chaque jour compris entre sa date de début et sa
  // date de fin (créneaux multi-jours inclus).
  const byDay = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const activity of activities ?? []) {
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
  }, [activities]);

  const selectedDayActivities = useMemo(() => {
    if (!selectedDay) return [];
    return byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];
  }, [selectedDay, byDay]);

  if (!canRead) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-8 text-center text-sm text-zinc-400">
          Vous n'avez pas accès à la gestion des ressources (agents polyvalents).
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <p className="mb-4 text-xs text-zinc-500">
        Cliquez sur un jour pour affecter des agents à des tâches.
      </p>

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
                  {items.map((activity) => (
                    <div
                      key={activity._id}
                      className="truncate rounded-md bg-brand-500/20 px-1.5 py-1 text-[11px] font-medium text-brand-200"
                      title={`${activity.workerName} — ${activity.taskName}`}
                    >
                      {activity.workerName} · {activity.taskName}
                    </div>
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
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ) : null}
      </Drawer>
    </div>
  );
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
  canCreate,
  canUpdate,
  canDelete,
}: {
  day: Date;
  activities: Activity[];
  workers: WorkerList;
  tasks: TaskList;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const createActivity = useMutation(api.polyvalents.createActivity);
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

  function openCreate() {
    setEditing(null);
    setWorkerId("");
    setTaskId("");
    setStartAt(dayAtHour(day, 8));
    setEndAt(dayAtHour(day, 17));
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
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                    <UsersRound className="h-3.5 w-3.5 text-brand-300" />
                    {activity.workerName}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand-300">
                    <ListChecks className="h-3.5 w-3.5" />
                    {activity.taskName}
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
                {format(new Date(activity.startAt), "d MMM HH:mm", { locale: fr })} →{" "}
                {format(new Date(activity.endAt), "d MMM HH:mm", { locale: fr })}
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
                    {worker.firstName} {worker.lastName}
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
