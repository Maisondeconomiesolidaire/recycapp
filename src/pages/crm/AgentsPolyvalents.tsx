import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ListChecks, Pencil, Plus, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
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

/** Durée mensuelle du contrat ramenée à la semaine (base RH : mois = 4 semaines). */
function formatWeeklyHours(monthlyHours: number) {
  const weekly = monthlyHours / 4;
  return `${Number.isInteger(weekly) ? weekly : weekly.toFixed(1).replace(".", ",")} h`;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: "Ouvrier permanent",
  polyvalent: "Ouvrier polyvalent",
  none: "À définir",
};
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
  // Filtre principal de la page : il pilote à la fois le planning, l'équipe et
  // le catalogue de tâches. `null` = les deux recycleries.
  const [siteFilter, setSiteFilter] = useState<Site | null>(null);

  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");

  if (workers === undefined || tasks === undefined || schedules === undefined) {
    return <FullSpinner label="Chargement des tâches…" />;
  }

  const visibleWorkers = workers.filter(
    (worker) => !siteFilter || worker.sites?.includes(siteFilter),
  );
  const visibleTasks = tasks.filter((task) => !siteFilter || task.site === siteFilter);

  return (
    <div className="pb-16">
      <PageHeader
        title="Tâches"
        subtitle="Planifiez les tâches, gérez l’équipe et suivez les disponibilités."
      />

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {([null, "60", "76"] as Array<Site | null>).map((site) => (
            <button
              key={site ?? "all"}
              type="button"
              onClick={() => setSiteFilter(site)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                siteFilter === site
                  ? "bg-brand-500 text-white"
                  : "bg-[var(--crm-surface-2)] text-zinc-300 hover:bg-[var(--crm-surface-3)]"
              }`}
            >
              {site ? SITE_LABELS[site] : "Tout"}
            </button>
          ))}
        </div>

        <WorkloadSummary tasks={tasks} workers={workers} siteFilter={siteFilter} />

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
          <ResourceCalendar siteFilter={siteFilter} />
        ) : tab === "ouvriers" ? (
          <WorkersTab
            workers={visibleWorkers}
            schedules={schedules}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ) : (
          <TasksTab
            tasks={visibleTasks}
            siteFilter={siteFilter}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Plan de charge par recyclerie : main d'œuvre requise par les tâches du site
 * face aux heures contractuelles de ses salariés actifs, à la semaine.
 */
function WorkloadSummary({
  tasks,
  workers,
  siteFilter,
}: {
  tasks: TaskList;
  workers: WorkerList;
  siteFilter: Site | null;
}) {
  const sites = siteFilter ? [siteFilter] : (["60", "76"] as Site[]);
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      {sites.map((site) => {
        const required = tasks
          .filter((task) => task.site === site)
          .reduce((total, task) => total + (task.requiredMonthlyHours ?? 0), 0);
        const available = workers
          .filter((worker) => worker.active !== false && worker.sites?.[0] === site)
          .reduce((total, worker) => total + (worker.monthlyHours ?? 0), 0);
        const missing = required - available;
        return (
          <div
            key={site}
            className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {SITE_LABELS[site]}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <p className="text-sm text-zinc-300">
                <span className="text-lg font-semibold text-zinc-100">{formatWeeklyHours(required)}</span>
                <span className="text-zinc-500"> de main d’œuvre requise / semaine</span>
              </p>
              <p className="text-sm text-zinc-300">
                <span
                  className={`text-lg font-semibold ${missing > 0 ? "text-amber-300" : "text-brand-300"}`}
                >
                  {formatWeeklyHours(available)}
                </span>
                <span className="text-zinc-500"> disponibles</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {required === 0
                ? "Renseignez les heures requises des tâches de ce site."
                : missing > 0
                  ? `Il manque ${formatWeeklyHours(missing)} par semaine pour couvrir les tâches.`
                  : `Marge de ${formatWeeklyHours(-missing)} par semaine.`}
            </p>
          </div>
        );
      })}
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
  const syncFromHr = useMutation(api.polyvalents.syncFromHr);
  const removeWorker = useMutation(api.polyvalents.deleteWorker);
  const setActive = useMutation(api.polyvalents.setWorkerActive);
  const setEmploymentType = useMutation(api.polyvalents.setWorkerEmploymentType);
  const [deleting, setDeleting] = useState<WorkerList[number] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerList[number] | null>(null);
  const [scheduleWorkerId, setScheduleWorkerId] = useState<Id<"polyvalentWorkers"> | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  // L'annuaire RH fait foi : on se réaligne à l'ouverture de l'onglet, puis
  // chaque nuit par cron. Sans écart, la synchro n'écrit rien.
  useEffect(() => {
    void syncFromHr({}).catch(() => undefined);
  }, [syncFromHr]);

  const normalized = search.trim().toLocaleLowerCase("fr-FR");
  const visible = workers
    .filter((worker) => (showInactive ? worker.active === false : worker.active !== false))
    .filter(
      (worker) =>
        !normalized ||
        `${worker.firstName} ${worker.lastName} ${worker.email ?? ""}`
          .toLocaleLowerCase("fr-FR")
          .includes(normalized),
    );
  const inactiveCount = workers.filter((worker) => worker.active === false).length;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un salarié…"
              className="w-full pl-9 sm:w-72"
            />
          </div>
          <Checkbox
            label={`Voir les salariés non actifs${inactiveCount ? ` (${inactiveCount})` : ""}`}
            variant="inline"
            checked={showInactive}
            onChange={() => setShowInactive((current) => !current)}
          />
        </div>
        {canCreate ? (
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4" /> Nouveau membre
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-10 w-10" />}
          title={showInactive ? "Aucun salarié non actif" : "Aucun salarié"}
          description={
            showInactive
              ? "Tous les salariés des recycleries 60 et 76 sont actifs."
              : "Les salariés rattachés aux recycleries 60 et 76 dans les ressources humaines apparaissent ici."
          }
          action={
            canCreate && !showInactive ? (
              <Button onClick={openNew}>
                <UserPlus className="h-4 w-4" /> Nouveau membre
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)]">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Salarié</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Recyclerie</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Heures / sem.</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {visible.map((worker) => (
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
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <Select
                        value={worker.employmentType ?? ""}
                        onChange={(event) =>
                          void setEmploymentType({
                            id: worker._id,
                            employmentType:
                              (event.target.value as "permanent" | "polyvalent") || undefined,
                          })
                        }
                        className="h-9 w-[190px] text-xs"
                      >
                        <option value="">À définir</option>
                        <option value="polyvalent">Ouvrier polyvalent</option>
                        <option value="permanent">Ouvrier permanent</option>
                      </Select>
                    ) : (
                      <span className="text-zinc-400">{EMPLOYMENT_TYPE_LABELS[worker.employmentType ?? "none"]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400" title="Durée mensuelle du contrat ramenée à la semaine">
                    {worker.monthlyHours ? formatWeeklyHours(worker.monthlyHours) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        worker.active === false ? "bg-zinc-700 text-zinc-100" : "bg-brand-500 text-white"
                      }`}
                    >
                      {worker.active === false ? "Non actif" : "Actif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && worker.active === false ? (
                        <button
                          type="button"
                          onClick={() => void setActive({ id: worker._id, active: true })}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-300 transition hover:bg-[var(--crm-surface-3)]"
                        >
                          Réactiver
                        </button>
                      ) : null}
                      {canUpdate && worker.active !== false ? (
                        <button
                          type="button"
                          onClick={() => void setActive({ id: worker._id, active: false })}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                        >
                          Désactiver
                        </button>
                      ) : null}
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
                      {/* Un salarié RH réapparaîtrait à la synchro suivante : seules
                          les fiches créées à la main sont supprimables. */}
                      {canDelete && !worker.hrEmployeeId ? (
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

/**
 * Création / modification d'une fiche salarié. Pour un salarié rattaché aux
 * ressources humaines, l'identité et la recyclerie viennent de sa fiche RH :
 * seuls l'email et le type de contrat, absents du référentiel RH, se saisissent
 * ici.
 */
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
  const [employmentType, setEmploymentType] = useState<"permanent" | "polyvalent" | "">(
    worker?.employmentType ?? "",
  );
  const fromHr = Boolean(worker?.hrEmployeeId);
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
        employmentType: employmentType || undefined,
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
        {fromHr ? (
          <p className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-xs text-zinc-400">
            Identité et recyclerie proviennent de la fiche RH de {firstName} {lastName} : elles
            se modifient dans Mes Outils · Ressources humaines.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" required>
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Jean" />
            </Field>
            <Field label="Nom" required>
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Dupont" />
            </Field>
          </div>
        )}
        <Field label="Adresse email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jean.dupont@eco-solidaire.fr"
          />
        </Field>
        {fromHr ? null : (
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
        )}
        <Field label="Type de contrat">
          <Select
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value as "permanent" | "polyvalent" | "")}
          >
            <option value="">À définir</option>
            <option value="polyvalent">Ouvrier polyvalent</option>
            <option value="permanent">Ouvrier permanent</option>
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
  siteFilter,
  canCreate,
  canUpdate,
  canDelete,
}: {
  tasks: TaskList;
  siteFilter: Site | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const removeTask = useMutation(api.polyvalents.deleteTask);
  const [deleting, setDeleting] = useState<TaskList[number] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskList[number] | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="grid gap-5">
      {canCreate ? (
        <div className="flex justify-end">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </Button>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-10 w-10" />}
          title="Aucune tâche"
          description="Créez les tâches confiées à l’équipe, avec leur recyclerie et la main d’œuvre qu’elles demandent."
          action={
            canCreate ? (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--crm-border)]">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tâche</th>
                <th className="px-4 py-3 text-left font-medium">Recyclerie</th>
                <th className="px-4 py-3 text-left font-medium">Main d’œuvre requise</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {tasks.map((task) => (
                <tr key={task._id} className="bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-2)]">
                  <td className="px-4 py-3">
                    <span className="inline-flex min-w-0 items-center gap-2 font-medium text-zinc-100">
                      <ListChecks className="h-4 w-4 shrink-0 text-brand-300" />
                      <span className="truncate">{task.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {task.site ? SITE_LABELS[task.site] : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {task.requiredMonthlyHours ? (
                      <>
                        {formatWeeklyHours(task.requiredMonthlyHours)}
                        <span className="text-zinc-500"> / semaine</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(task);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                          aria-label="Modifier la tâche"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeleting(task)}
                          className="rounded-lg p-2 text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-red-400"
                          aria-label="Supprimer la tâche"
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
        <TaskForm
          key={editing?._id ?? "new"}
          task={editing}
          defaultSite={siteFilter}
          onClose={() => setFormOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeTask({ id: deleting._id });
          setDeleting(null);
        }}
        title="Supprimer la tâche ?"
        description={
          deleting
            ? `Les affectations liées à « ${deleting.name} » seront également supprimées.`
            : undefined
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}

/** Fiche d'une tâche : nom, site de traitement et main d'œuvre requise. */
function TaskForm({
  task,
  defaultSite,
  onClose,
}: {
  task: TaskList[number] | null;
  defaultSite: Site | null;
  onClose: () => void;
}) {
  const createTask = useMutation(api.polyvalents.createTask);
  const updateTask = useMutation(api.polyvalents.updateTask);
  const [name, setName] = useState(task?.name ?? "");
  const [site, setSite] = useState<Site | "">(task?.site ?? defaultSite ?? "");
  // Saisie hebdomadaire, stockée au mois : c'est la semaine qui se compare aux
  // heures des salariés.
  const [weeklyHours, setWeeklyHours] = useState(
    task?.requiredMonthlyHours ? String(task.requiredMonthlyHours / 4).replace(".", ",") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return;
    const weekly = weeklyHours.trim() ? Number(weeklyHours.replace(",", ".")) : undefined;
    if (weekly !== undefined && (!Number.isFinite(weekly) || weekly <= 0)) {
      setError("Les heures requises doivent être un nombre positif.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const profile = {
        name,
        site: site || undefined,
        requiredMonthlyHours: weekly !== undefined ? weekly * 4 : undefined,
      };
      if (task) await updateTask({ id: task._id, ...profile });
      else await createTask(profile);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={task ? "Modifier la tâche" : "Nouvelle tâche"}>
      <div className="space-y-4">
        <Field label="Nom de la tâche" required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex : Tri textile, Réparation vélos…"
          />
        </Field>
        <Field label="Recyclerie de traitement">
          <Select value={site} onChange={(event) => setSite(event.target.value as Site | "")}>
            <option value="">Non précisée</option>
            {(Object.keys(SITE_LABELS) as Site[]).map((value) => (
              <option key={value} value={value}>
                {SITE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Main d’œuvre requise (heures par semaine)">
          <Input
            value={weeklyHours}
            onChange={(event) => setWeeklyHours(event.target.value)}
            inputMode="decimal"
            placeholder="Ex : 30"
          />
        </Field>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={saving || !name.trim()}>
            {saving ? "Enregistrement…" : task ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
