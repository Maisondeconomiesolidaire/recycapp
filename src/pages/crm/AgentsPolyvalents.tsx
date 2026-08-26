import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ListChecks, Pencil, Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Checkbox, Field, Input } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";
import { ResourceCalendar } from "./Calendrier";

type Tab = "planning" | "ouvriers" | "taches";
type WorkerList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>>;
type TaskList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>>;
type ScheduleList = NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkerSchedules>>>;

/**
 * Espace unique des tâches : planning, équipe et catalogue de tâches.
 */
export function Taches() {
  const access = useCrmAccess();
  const workers = useQuery(api.polyvalents.listWorkers);
  const tasks = useQuery(api.polyvalents.listTasks);
  const schedules = useQuery(api.polyvalents.listWorkerSchedules);
  const [tab, setTab] = useState<Tab>("planning");

  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  if (workers === undefined || tasks === undefined || schedules === undefined) {
    return <FullSpinner label="Chargement des tâches…" />;
  }

  return (
    <div className="pb-16">
      <PageHeader
        title="Tâches"
        subtitle="Planifiez les tâches, gérez l’équipe et suivez les disponibilités."
      />

      <div className="px-4 py-4 sm:px-6">
        <UnderlineTabs
          className="mb-1"
          items={[
            { key: "planning", label: "Planning" },
            { key: "ouvriers", label: "Équipe" },
            { key: "taches", label: "Tâches" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "planning" ? (
          <ResourceCalendar />
        ) : tab === "ouvriers" ? (
          <WorkersTab
            workers={workers}
            schedules={schedules}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ) : (
          <TasksTab tasks={tasks} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
        )}
      </div>
    </div>
  );
}

/* ─── Agents ──────────────────────────────────────────────────────────────── */

function WorkersTab({
  workers,
  schedules,
  canCreate,
  canUpdate,
  canDelete,
}: {
  workers: WorkerList;
  schedules: ScheduleList;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const createWorker = useMutation(api.polyvalents.createWorker);
  const updateWorker = useMutation(api.polyvalents.updateWorker);
  const removeWorker = useMutation(api.polyvalents.deleteWorker);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"polyvalentWorkers"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"polyvalentWorkers"> | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [scheduleWorkerId, setScheduleWorkerId] = useState<Id<"polyvalentWorkers"> | null>(null);

  async function add() {
    if (!firstName.trim() && !lastName.trim()) return;
    setSaving(true);
    try {
      await createWorker({ firstName, lastName });
      setFirstName("");
      setLastName("");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(worker: WorkerList[number]) {
    setEditingId(worker._id);
    setEditFirst(worker.firstName);
    setEditLast(worker.lastName);
  }

  async function saveEdit() {
    if (!editingId || (!editFirst.trim() && !editLast.trim())) return;
    await updateWorker({ id: editingId, firstName: editFirst, lastName: editLast });
    setEditingId(null);
  }

  return (
    <div className="grid gap-5">
      {canCreate ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
          className="grid gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Field label="Prénom">
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Prénom" />
          </Field>
          <Field label="Nom">
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Nom" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saving || (!firstName.trim() && !lastName.trim())} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </form>
      ) : null}

      {workers.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-10 w-10" />}
          title="Aucun agent"
          description="Ajoute un agent polyvalent (nom et prénom)."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {workers.map((worker) =>
            editingId === worker._id ? (
              <div
                key={worker._id}
                className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-[var(--crm-surface)] px-3 py-2"
              >
                <Input value={editFirst} onChange={(event) => setEditFirst(event.target.value)} placeholder="Prénom" />
                <Input
                  value={editLast}
                  onChange={(event) => setEditLast(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveEdit();
                    }
                  }}
                  placeholder="Nom"
                />
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  className="rounded-lg p-1.5 text-emerald-400 transition hover:bg-[var(--crm-surface-2)]"
                  aria-label="Enregistrer"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)]"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                key={worker._id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3"
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-100">
                  <UsersRound className="h-4 w-4 shrink-0 text-brand-300" />
                  <span className="truncate">
                    {worker.firstName} {worker.lastName}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canUpdate ? (
                    <button type="button" onClick={() => setScheduleWorkerId(worker._id)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-brand-300">
                      Horaires
                    </button>
                  ) : null}
                  {canUpdate ? (
                    <button
                      type="button"
                      onClick={() => startEdit(worker)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-brand-300"
                      aria-label="Modifier l'agent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(worker._id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-red-400"
                      aria-label="Supprimer l'agent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {scheduleWorkerId ? (
        <WorkerScheduleEditor
          worker={workers.find((worker) => worker._id === scheduleWorkerId)!}
          schedule={schedules.find((schedule) => schedule.workerId === scheduleWorkerId)?.availability ?? []}
          onClose={() => setScheduleWorkerId(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeWorker({ id: deleting });
          setDeleting(null);
        }}
        title="Supprimer l'agent ?"
        description="Ses affectations planifiées seront également supprimées."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

function WorkerScheduleEditor({
  worker,
  schedule,
  onClose,
}: {
  worker: WorkerList[number];
  schedule: { weekday: number; start: string; end: string }[];
  onClose: () => void;
}) {
  const setSchedule = useMutation(api.polyvalents.setWorkerSchedule);
  const initial = Object.fromEntries(schedule.map((slot) => [slot.weekday, { start: slot.start, end: slot.end }]));
  const [slots, setSlots] = useState<Record<number, { start: string; end: string }>>(initial);
  const [saving, setSaving] = useState(false);
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  async function save() {
    setSaving(true);
    try {
      await setSchedule({ workerId: worker._id, availability: Object.entries(slots).map(([weekday, time]) => ({ weekday: Number(weekday), ...time })) });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-brand-500/40 bg-[var(--crm-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-semibold">Horaires de {worker.firstName} {worker.lastName}</p><p className="text-xs text-zinc-500">Les créneaux servent à repérer les salariés disponibles lors d’une affectation.</p></div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-[var(--crm-surface-2)]"><X className="h-4 w-4" /></button></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {days.map((label, index) => {
          const weekday = index + 1; const value = slots[weekday];
          return <div key={weekday} className="grid grid-cols-[minmax(130px,1fr)_1fr_1fr] items-center gap-3 rounded-lg border border-[var(--crm-border)] p-2 text-sm"><Checkbox label={label} variant="inline" checked={Boolean(value)} onChange={() => setSlots((current) => { const next = { ...current }; if (next[weekday]) delete next[weekday]; else next[weekday] = { start: "09:00", end: "17:00" }; return next; })} /><input type="time" disabled={!value} value={value?.start ?? "09:00"} onChange={(event) => setSlots((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? { end: "17:00" }), start: event.target.value } }))} className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2 py-2 disabled:opacity-40" /><input type="time" disabled={!value} value={value?.end ?? "17:00"} onChange={(event) => setSlots((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? { start: "09:00" }), end: event.target.value } }))} className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2 py-2 disabled:opacity-40" /></div>;
        })}
      </div>
      <div className="mt-3 flex justify-end"><Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les horaires"}</Button></div>
    </div>
  );
}

/* ─── Tâches ──────────────────────────────────────────────────────────────── */

function TasksTab({
  tasks,
  canCreate,
  canUpdate,
  canDelete,
}: {
  tasks: TaskList;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const createTask = useMutation(api.polyvalents.createTask);
  const updateTask = useMutation(api.polyvalents.updateTask);
  const removeTask = useMutation(api.polyvalents.deleteTask);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"polyvalentTasks"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"polyvalentTasks"> | null>(null);
  const [editName, setEditName] = useState("");

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createTask({ name });
      setName("");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    await updateTask({ id: editingId, name: editName });
    setEditingId(null);
  }

  return (
    <div className="grid gap-5">
      {canCreate ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
          className="grid gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 sm:grid-cols-[1fr_auto]"
        >
          <Field label="Nom de la tâche">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex : Tri textile, Réparation vélos…" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={saving || !name.trim()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </form>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="Aucune tâche"
          description="Crée les tâches confiées aux agents polyvalents."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) =>
            editingId === task._id ? (
              <div
                key={task._id}
                className="flex items-center gap-2 rounded-xl border border-brand-500/40 bg-[var(--crm-surface)] px-3 py-2"
              >
                <Input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveEdit();
                    }
                  }}
                  placeholder="Nom de la tâche"
                />
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  className="rounded-lg p-1.5 text-emerald-400 transition hover:bg-[var(--crm-surface-2)]"
                  aria-label="Enregistrer"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)]"
                  aria-label="Annuler"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                key={task._id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3"
              >
                <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-100">
                  <ListChecks className="h-4 w-4 shrink-0 text-brand-300" />
                  <span className="truncate">{task.name}</span>
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canUpdate ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(task._id);
                        setEditName(task.name);
                      }}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-brand-300"
                      aria-label="Modifier la tâche"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(task._id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-red-400"
                      aria-label="Supprimer la tâche"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeTask({ id: deleting });
          setDeleting(null);
        }}
        title="Supprimer la tâche ?"
        description="Les affectations liées à cette tâche seront également supprimées."
        confirmLabel="Supprimer"
      />
    </div>
  );
}
