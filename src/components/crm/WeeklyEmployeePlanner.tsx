import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { addDays, addMinutes, endOfWeek, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { FullSpinner } from "../ui/Spinner";
import { useCrmAccess } from "./RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SLOTS = Array.from({ length: 20 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function hours(startAt: number, endAt: number) { return Math.max(0, endAt - startAt) / 3_600_000; }
function dayStamp(day: Date, value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(day); date.setHours(hour, minute, 0, 0); return date.getTime();
}
function durationLabel(value: number) { return `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} h`; }

export function WeeklyEmployeePlanner({ site }: { site: "60" | "76" }) {
  const access = useCrmAccess();
  const canCreate = canAccess(access, "agents-polyvalents", "create");
  const canUpdate = canAccess(access, "agents-polyvalents", "update");
  const canDelete = canAccess(access, "agents-polyvalents", "delete");
  const workers = useQuery(api.polyvalents.listWorkers);
  const tasks = useQuery(api.polyvalents.listTasks);
  const activities = useQuery(api.polyvalents.listActivities);
  const syncFromHr = useMutation(api.polyvalents.syncFromHr);
  const createActivity = useMutation(api.polyvalents.createActivity);
  const updateActivity = useMutation(api.polyvalents.updateActivity);
  const deleteActivity = useMutation(api.polyvalents.deleteActivity);
  const createWorker = useMutation(api.polyvalents.createWorker);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [editing, setEditing] = useState<{ day: Date; activityId?: Id<"polyvalentActivities"> } | null>(null);
  const [taskId, setTaskId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [newEmployeeOpen, setNewEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void syncFromHr({}).catch(() => undefined); }, [syncFromHr]);
  const days = useMemo(() => Array.from({ length: 6 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const visibleWorkers = useMemo(() => (workers ?? []).filter((worker) => worker.active !== false && worker.sites?.includes(site)), [workers, site]);
  const visibleTasks = useMemo(() => (tasks ?? []).filter((task) => task.site === site), [tasks, site]);
  const activitiesByCell = useMemo(() => {
    const map = new Map<string, NonNullable<typeof activities>[number][]>();
    for (const activity of activities ?? []) {
      if (!activity.workerId) continue;
      const key = `${activity.workerId}-${format(new Date(activity.startAt), "yyyy-MM-dd")}`;
      const current = map.get(key) ?? []; current.push(activity); map.set(key, current);
    }
    for (const row of map.values()) row.sort((a, b) => a.startAt - b.startAt);
    return map;
  }, [activities]);
  const dayTotals = useMemo(() => days.map((day) => visibleWorkers.reduce(
    (total, worker) => total + (activitiesByCell.get(`${worker._id}-${format(day, "yyyy-MM-dd")}`) ?? []).reduce((sum, activity) => sum + hours(activity.startAt, activity.endAt), 0),
    0,
  )), [activitiesByCell, days, visibleWorkers]);
  const openNew = (day: Date, slot: string, activityTaskId: Id<"polyvalentTasks">) => { const endAt = addMinutes(new Date(dayStamp(day, slot)), 30); setEditing({ day }); setTaskId(activityTaskId); setWorkerId(""); setStart(slot); setEnd(format(endAt, "HH:mm")); };
  const openEdit = (day: Date, activity: NonNullable<typeof activities>[number]) => { setEditing({ day, activityId: activity._id }); setTaskId(activity.taskId); setWorkerId(activity.workerId ?? ""); setStart(format(new Date(activity.startAt), "HH:mm")); setEnd(format(new Date(activity.endAt), "HH:mm")); };
  async function save() {
    if (!editing || !taskId || !workerId) return; setSaving(true);
    try {
      const payload = { taskId: taskId as Id<"polyvalentTasks">, workerId: workerId as Id<"polyvalentWorkers">, startAt: dayStamp(editing.day, start), endAt: dayStamp(editing.day, end) };
      if (payload.endAt <= payload.startAt) return;
      if (editing.activityId) await updateActivity({ id: editing.activityId, ...payload }); else await createActivity(payload);
      setEditing(null);
    } finally { setSaving(false); }
  }
  async function addEmployee() {
    const parts = newEmployee.trim().split(/\s+/); if (!parts[0]) return;
    setSaving(true); try { await createWorker({ firstName: parts.shift()!, lastName: parts.join(" "), sites: [site] }); setNewEmployee(""); setNewEmployeeOpen(false); } finally { setSaving(false); }
  }
  if (!workers || !tasks || !activities) return <FullSpinner label="Chargement du planning…" />;
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
      <p className="min-w-52 text-center font-semibold capitalize">{format(weekStart, "d MMM", { locale: fr })} – {format(weekEnd, "d MMM yyyy", { locale: fr })}</p>
      <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
      <Button size="sm" variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Cette semaine</Button>
      <span className="ml-auto text-xs text-zinc-500">Cliquez dans une case pour ajouter une tâche et ses horaires.</span>
    </div>
    <div className="max-h-[calc(100dvh-15rem)] overflow-auto rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
      <table className="min-w-[1100px] w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--crm-surface-2)] text-zinc-400 shadow-[0_2px_8px_rgba(0,0,0,0.22)]"><tr><th className="sticky left-0 z-20 min-w-24 border-b border-r border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-3 text-left">Heure</th>{days.map((day, index) => <th key={day.toISOString()} className="min-w-52 border-b border-r border-[var(--crm-border)] px-3 py-3 text-left"><span className="block font-bold text-zinc-200">{DAYS[index]} <span className="text-brand-300">{durationLabel(dayTotals[index])}</span></span><span className="text-xs">{format(day, "d MMM", { locale: fr })}</span></th>)}</tr></thead>
        <tbody>{TIME_SLOTS.map((slot) => <tr key={slot} className="align-top"><th className="sticky left-0 z-[1] border-b border-r border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-left text-xs font-bold text-zinc-300">{slot}</th>{days.map((day) => { const slotStart = dayStamp(day, slot); const slotEnd = slotStart + 30 * 60_000; return <td key={day.toISOString()} className="border-b border-r border-[var(--crm-border)] p-1.5"><div className="space-y-1">{visibleTasks.map((task) => { const assigned = (activities ?? []).filter((activity) => activity.taskId === task._id && activity.startAt < slotEnd && activity.endAt > slotStart); return assigned.length ? assigned.map((activity) => <button key={activity._id} type="button" disabled={!canUpdate} onClick={() => openEdit(day, activity)} className="block w-full rounded-md bg-emerald-500/20 px-2 py-1 text-left text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/35 hover:shadow-sm">{task.name} · {activity.workerName}</button>) : <button key={task._id} type="button" disabled={!canCreate} onClick={() => openNew(day, slot, task._id)} className="block w-full rounded-md bg-zinc-800/40 px-2 py-1 text-left text-[10px] text-zinc-600 transition hover:bg-zinc-700 hover:text-zinc-200 hover:shadow-sm">{task.name}</button>; })}</div></td>; })}</tr>)}
          <tr><td colSpan={8} className="p-2"><button type="button" onClick={() => setNewEmployeeOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-zinc-400 hover:bg-[var(--crm-surface-2)]"><Plus className="h-4 w-4" />Nouveau salarié</button></td></tr>
        </tbody>
      </table>
    </div>
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.activityId ? "Modifier l'affectation" : "Ajouter un salarié"}><div className="space-y-4"><Field label="Tâche"><Select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Choisir une tâche</option>{visibleTasks.map((task) => <option key={task._id} value={task._id}>{task.name}</option>)}</Select></Field><Field label="Salarié"><Select value={workerId} onChange={(event) => setWorkerId(event.target.value)}><option value="">Choisir un salarié</option>{visibleWorkers.map((worker) => <option key={worker._id} value={worker._id}>{worker.firstName} {worker.lastName}</option>)}</Select></Field><div className="grid grid-cols-2 gap-3"><Field label="Début"><Input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="Fin"><Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></Field></div><div className="flex justify-between gap-2">{editing?.activityId && canDelete ? <Button variant="outline" onClick={() => { void deleteActivity({ id: editing.activityId! }); setEditing(null); }}><Trash2 className="h-4 w-4" />Supprimer</Button> : <span /> }<Button disabled={saving || !taskId || !workerId} onClick={() => void save()}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div></div></Modal>
    <Modal open={newEmployeeOpen} onClose={() => setNewEmployeeOpen(false)} title="Nouveau salarié"><div className="space-y-4"><Field label="Nom et prénom"><Input autoFocus value={newEmployee} onChange={(event) => setNewEmployee(event.target.value)} placeholder="Prénom Nom" /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setNewEmployeeOpen(false)}>Annuler</Button><Button disabled={saving || !newEmployee.trim()} onClick={() => void addEmployee()}>Créer la ligne</Button></div></div></Modal>
  </div>;
}
