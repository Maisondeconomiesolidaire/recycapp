import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  ListChecks,
  Plus,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Field, Input, Select } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DateTimePicker } from "../../components/ui/DateTimePicker";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { useCrmAccess } from "../../components/crm/RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";

type Tab = "planning" | "ouvriers" | "taches";

function formatRange(startAt: number, endAt: number) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const startLabel = format(start, "EEE d MMM 'à' HH:mm", { locale: fr });
  const endLabel = sameDay
    ? format(end, "HH:mm", { locale: fr })
    : format(end, "EEE d MMM 'à' HH:mm", { locale: fr });
  return `${startLabel} → ${endLabel}`;
}

export function AgentsPolyvalents() {
  const access = useCrmAccess();
  const tasks = useQuery(api.polyvalents.listTasks);
  const workers = useQuery(api.polyvalents.listWorkers);
  const activities = useQuery(api.polyvalents.listActivities);

  const [tab, setTab] = useState<Tab>("planning");
  const [activityOpen, setActivityOpen] = useState(false);

  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  const workersWithoutActivity = useMemo(() => {
    if (!workers || !activities) return [];
    const assigned = new Set(activities.map((activity) => String(activity.workerId)));
    return workers.filter((worker) => !assigned.has(String(worker._id)));
  }, [workers, activities]);

  if (tasks === undefined || workers === undefined || activities === undefined) {
    return <FullSpinner label="Chargement des agents polyvalents…" />;
  }

  return (
    <div className="pb-16">
      <PageHeader
        title="Agents polyvalents"
        subtitle="Ouvriers polyvalents : tâches, ouvriers et planning des activités."
        actions={
          canCreate ? (
            <Button onClick={() => setActivityOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle activité
            </Button>
          ) : null
        }
      />

      <div className="px-4 py-4 sm:px-6">
        <UnderlineTabs
          className="mb-5"
          items={[
            { key: "planning", label: "Planning" },
            { key: "ouvriers", label: "Ouvriers" },
            { key: "taches", label: "Tâches" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "planning" ? (
          <PlanningTab
            activities={activities}
            workersWithoutActivity={workersWithoutActivity}
            canDelete={canDelete}
          />
        ) : tab === "ouvriers" ? (
          <WorkersTab workers={workers} canCreate={canCreate} canDelete={canDelete} />
        ) : (
          <TasksTab tasks={tasks} canCreate={canCreate} canDelete={canDelete} />
        )}
      </div>

      {activityOpen ? (
        <NewActivityModal
          tasks={tasks}
          workers={workers}
          canCreate={canCreate}
          onClose={() => setActivityOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* ─── Planning ────────────────────────────────────────────────────────────── */

function PlanningTab({
  activities,
  workersWithoutActivity,
  canDelete,
}: {
  activities: NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listActivities>>>;
  workersWithoutActivity: NonNullable<
    ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>
  >;
  canDelete: boolean;
}) {
  const removeActivity = useMutation(api.polyvalents.deleteActivity);
  const [deleting, setDeleting] = useState<Id<"polyvalentActivities"> | null>(null);

  return (
    <div className="grid gap-6">
      {workersWithoutActivity.length > 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-amber-500">
            Ouvriers sans activité ({workersWithoutActivity.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {workersWithoutActivity.map((worker) => (
              <span
                key={worker._id}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-[var(--crm-surface-2)] px-3 py-1 text-sm text-zinc-200"
              >
                <UsersRound className="h-3.5 w-3.5 text-amber-500" />
                {worker.firstName} {worker.lastName}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
          Activités ({activities.length})
        </h2>
        {activities.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10" />}
            title="Aucune activité planifiée"
            description="Crée une activité pour affecter un ouvrier à une tâche sur un créneau."
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {activity.workerName}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-brand-300">
                      <ListChecks className="h-3.5 w-3.5" />
                      {activity.taskName}
                    </p>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setDeleting(activity._id)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-red-400"
                      aria-label="Supprimer l'activité"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatRange(activity.startAt, activity.endAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeActivity({ id: deleting });
          setDeleting(null);
        }}
        title="Supprimer l'activité ?"
        description="Cette affectation sera retirée du planning."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

/* ─── Ouvriers ────────────────────────────────────────────────────────────── */

function WorkersTab({
  workers,
  canCreate,
  canDelete,
}: {
  workers: NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>>;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const createWorker = useMutation(api.polyvalents.createWorker);
  const removeWorker = useMutation(api.polyvalents.deleteWorker);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"polyvalentWorkers"> | null>(null);

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
          title="Aucun ouvrier"
          description="Ajoute un ouvrier polyvalent (nom et prénom)."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {workers.map((worker) => (
            <div
              key={worker._id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <UsersRound className="h-4 w-4 text-brand-300" />
                {worker.firstName} {worker.lastName}
              </span>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleting(worker._id)}
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-[var(--crm-surface-2)] hover:text-red-400"
                  aria-label="Supprimer l'ouvrier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeWorker({ id: deleting });
          setDeleting(null);
        }}
        title="Supprimer l'ouvrier ?"
        description="Ses activités planifiées seront également supprimées."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

/* ─── Tâches ──────────────────────────────────────────────────────────────── */

function TasksTab({
  tasks,
  canCreate,
  canDelete,
}: {
  tasks: NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>>;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const createTask = useMutation(api.polyvalents.createTask);
  const removeTask = useMutation(api.polyvalents.deleteTask);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"polyvalentTasks"> | null>(null);

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
          description="Crée les tâches confiées aux ouvriers polyvalents."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="flex items-center justify-between gap-2 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <ListChecks className="h-4 w-4 text-brand-300" />
                {task.name}
              </span>
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
          ))}
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
        description="Les activités liées à cette tâche seront également supprimées."
        confirmLabel="Supprimer"
      />
    </div>
  );
}

/* ─── Nouvelle activité ───────────────────────────────────────────────────── */

function NewActivityModal({
  tasks,
  workers,
  canCreate,
  onClose,
}: {
  tasks: NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listTasks>>>;
  workers: NonNullable<ReturnType<typeof useQuery<typeof api.polyvalents.listWorkers>>>;
  canCreate: boolean;
  onClose: () => void;
}) {
  const createActivity = useMutation(api.polyvalents.createActivity);
  const createTask = useMutation(api.polyvalents.createTask);
  const createWorker = useMutation(api.polyvalents.createWorker);

  const [taskId, setTaskId] = useState<Id<"polyvalentTasks"> | "">("");
  const [workerId, setWorkerId] = useState<Id<"polyvalentWorkers"> | "">("");
  const [startAt, setStartAt] = useState<number | undefined>(undefined);
  const [endAt, setEndAt] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Raccourcis de création inline depuis ce popup.
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newWorkerOpen, setNewWorkerOpen] = useState(false);
  const [newWorkerFirst, setNewWorkerFirst] = useState("");
  const [newWorkerLast, setNewWorkerLast] = useState("");

  async function addTaskInline() {
    if (!newTaskName.trim()) return;
    const id = await createTask({ name: newTaskName });
    setTaskId(id);
    setNewTaskName("");
    setNewTaskOpen(false);
  }

  async function addWorkerInline() {
    if (!newWorkerFirst.trim() && !newWorkerLast.trim()) return;
    const id = await createWorker({ firstName: newWorkerFirst, lastName: newWorkerLast });
    setWorkerId(id);
    setNewWorkerFirst("");
    setNewWorkerLast("");
    setNewWorkerOpen(false);
  }

  async function save() {
    setError(null);
    if (!taskId) return setError("Sélectionne une tâche.");
    if (!workerId) return setError("Sélectionne un ouvrier.");
    if (startAt == null) return setError("Renseigne la date de début.");
    if (endAt == null) return setError("Renseigne la date de fin.");
    if (endAt < startAt) return setError("La fin doit être après le début.");
    setSaving(true);
    try {
      await createActivity({ taskId, workerId, startAt, endAt });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Nouvelle activité" className="max-w-lg">
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Tâche</span>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setNewTaskOpen((value) => !value)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                {newTaskOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                Nouvelle tâche
              </button>
            ) : null}
          </div>
          {newTaskOpen ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newTaskName}
                onChange={(event) => setNewTaskName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addTaskInline();
                  }
                }}
                placeholder="Nom de la nouvelle tâche"
              />
              <Button type="button" onClick={() => void addTaskInline()} disabled={!newTaskName.trim()}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Select value={taskId} onChange={(event) => setTaskId(event.target.value as Id<"polyvalentTasks">)}>
              <option value="">Sélectionner une tâche</option>
              {tasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Ouvrier</span>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setNewWorkerOpen((value) => !value)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                {newWorkerOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                Nouvel agent
              </button>
            ) : null}
          </div>
          {newWorkerOpen ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={newWorkerFirst}
                onChange={(event) => setNewWorkerFirst(event.target.value)}
                placeholder="Prénom"
              />
              <Input
                value={newWorkerLast}
                onChange={(event) => setNewWorkerLast(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addWorkerInline();
                  }
                }}
                placeholder="Nom"
              />
              <Button
                type="button"
                onClick={() => void addWorkerInline()}
                disabled={!newWorkerFirst.trim() && !newWorkerLast.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Select
              value={workerId}
              onChange={(event) => setWorkerId(event.target.value as Id<"polyvalentWorkers">)}
            >
              <option value="">Sélectionner un ouvrier</option>
              {workers.map((worker) => (
                <option key={worker._id} value={worker._id}>
                  {worker.firstName} {worker.lastName}
                </option>
              ))}
            </Select>
          )}
        </div>

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

        <div className="flex justify-end gap-2 border-t border-[var(--crm-border)] pt-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Enregistrement…" : "Créer l'activité"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
