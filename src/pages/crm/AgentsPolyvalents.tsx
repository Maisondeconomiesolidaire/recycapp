import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, ListChecks, Pencil, Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { SITE_LABELS, Site } from "../../lib/constants";
import { initials } from "../../lib/format";
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
  const removeWorker = useMutation(api.polyvalents.deleteWorker);
  const [deleting, setDeleting] = useState<WorkerList[number] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerList[number] | null>(null);
  const [scheduleWorkerId, setScheduleWorkerId] = useState<Id<"polyvalentWorkers"> | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="grid gap-5">
      {canCreate ? (
        <div className="flex justify-end">
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4" /> Nouveau membre
          </Button>
        </div>
      ) : null}

      {workers.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-10 w-10" />}
          title="Aucun salarié"
          description="Ajoutez des membres pour pouvoir leur attribuer des demandes et des tâches."
          action={
            canCreate ? (
              <Button onClick={openNew}>
                <UserPlus className="h-4 w-4" /> Nouveau membre
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)]">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Salarié</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Recyclerie</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Créé</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {workers.map((worker) => (
                <tr key={worker._id} className="bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-2)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--crm-surface-3)] text-xs font-semibold text-zinc-300">
                        {initials(worker.firstName, worker.lastName)}
                      </span>
                      <span className="font-medium text-zinc-100">
                        {worker.firstName} {worker.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{worker.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {worker.sites?.length ? worker.sites.map((site) => SITE_LABELS[site]).join(" · ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {worker.employmentType === "permanent" ? "Agent permanent" : "Agent polyvalent"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        worker.active === false ? "bg-zinc-700 text-zinc-100" : "bg-brand-500 text-white"
                      }`}
                    >
                      {worker.active === false ? "Inactif" : "Actif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(worker.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => setScheduleWorkerId(worker._id)}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-brand-300"
                        >
                          Horaires
                        </button>
                      ) : null}
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(worker);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                          aria-label="Modifier le salarié"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeleting(worker)}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-red-400"
                          aria-label="Supprimer le salarié"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <WorkerForm
          key={editing?._id ?? "new"}
          worker={editing}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

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
          if (deleting) await removeWorker({ id: deleting._id });
          setDeleting(null);
        }}
        title="Supprimer ce salarié ?"
        description={
          deleting
            ? `${deleting.firstName} ${deleting.lastName} ne pourra plus être attribué aux demandes, et ses affectations planifiées seront supprimées.`
            : undefined
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}

/** Création / modification d'une fiche salarié (mêmes champs que l'ancienne équipe). */
function WorkerForm({
  worker,
  onClose,
}: {
  worker: WorkerList[number] | null;
  onClose: () => void;
}) {
  const createWorker = useMutation(api.polyvalents.createWorker);
  const updateWorker = useMutation(api.polyvalents.updateWorker);
  const [firstName, setFirstName] = useState(worker?.firstName ?? "");
  const [lastName, setLastName] = useState(worker?.lastName ?? "");
  const [email, setEmail] = useState(worker?.email ?? "");
  const [sites, setSites] = useState<Site[]>(worker?.sites ?? []);
  const [employmentType, setEmploymentType] = useState<"permanent" | "polyvalent">(
    worker?.employmentType ?? "polyvalent",
  );
  const [active, setActive] = useState(worker?.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSite(site: Site) {
    setSites((current) =>
      current.includes(site) ? current.filter((value) => value !== site) : [...current, site],
    );
  }

  async function save() {
    if (!firstName.trim() && !lastName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const profile = {
        firstName,
        lastName,
        email: email.trim() || undefined,
        sites: sites.length ? sites : undefined,
        employmentType,
      };
      if (worker) await updateWorker({ id: worker._id, ...profile, active });
      else await createWorker(profile);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={worker ? "Modifier le salarié" : "Nouveau membre"}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Jean" />
          </Field>
          <Field label="Nom" required>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Dupont" />
          </Field>
        </div>
        <Field label="Adresse email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jean.dupont@eco-solidaire.fr"
          />
        </Field>
        <Field label="Recyclerie">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SITE_LABELS) as Site[]).map((site) => (
              <Checkbox
                key={site}
                label={SITE_LABELS[site]}
                variant="inline"
                checked={sites.includes(site)}
                onChange={() => toggleSite(site)}
              />
            ))}
          </div>
        </Field>
        <Field label="Type de contrat">
          <Select
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value as "permanent" | "polyvalent")}
          >
            <option value="polyvalent">Agent polyvalent</option>
            <option value="permanent">Agent permanent</option>
          </Select>
        </Field>
        {worker ? (
          <Checkbox
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            label="Actif"
            description="Attribuable aux demandes et aux tâches"
          />
        ) : null}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || (!firstName.trim() && !lastName.trim())}
          >
            {saving ? "Enregistrement…" : worker ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Modal>
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
    <Modal open onClose={onClose} title={`Horaires de ${worker.firstName} ${worker.lastName}`} className="max-w-2xl">
      <div className="space-y-3">
        <p className="text-xs text-zinc-500">
          Les créneaux servent à repérer les salariés disponibles lors d’une affectation.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {days.map((label, index) => {
            const weekday = index + 1; const value = slots[weekday];
            return <div key={weekday} className="grid grid-cols-[minmax(130px,1fr)_1fr_1fr] items-center gap-3 rounded-lg border border-[var(--crm-border)] p-2 text-sm"><Checkbox label={label} variant="inline" checked={Boolean(value)} onChange={() => setSlots((current) => { const next = { ...current }; if (next[weekday]) delete next[weekday]; else next[weekday] = { start: "09:00", end: "17:00" }; return next; })} /><input type="time" disabled={!value} value={value?.start ?? "09:00"} onChange={(event) => setSlots((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? { end: "17:00" }), start: event.target.value } }))} className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2 py-2 disabled:opacity-40" /><input type="time" disabled={!value} value={value?.end ?? "17:00"} onChange={(event) => setSlots((current) => ({ ...current, [weekday]: { ...(current[weekday] ?? { start: "09:00" }), end: event.target.value } }))} className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-2 py-2 disabled:opacity-40" /></div>;
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les horaires"}</Button>
        </div>
      </div>
    </Modal>
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
