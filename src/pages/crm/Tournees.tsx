import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Truck, Plus, Check, MapPin, User,
  ChevronDown, ChevronRight, Printer, Loader2,
  Calendar, X, AlertCircle, Route,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Tab = "planification" | "historique";

const STATUS_STYLE: Record<string, string> = {
  planifiee: "bg-sky-500/15 text-sky-300",
  en_cours: "bg-amber-500/15 text-amber-300",
  terminee: "bg-emerald-500/15 text-emerald-400",
  annulee: "bg-zinc-700 text-zinc-400",
};
const STATUS_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export function Tournees() {
  const [tab, setTab] = useState<Tab>("planification");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">GDR Tournées</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Tournées de collecte</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Planifiez les passages à domicile et suivez leur avancement en temps réel.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--crm-surface)] p-1 w-fit">
        {[
          { key: "planification" as Tab, label: "À venir", icon: Route },
          { key: "historique" as Tab, label: "Historique", icon: Calendar },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-[var(--crm-surface-2)] text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "planification" ? <PlanificationTab /> : <HistoriqueTab />}
    </div>
  );
}

// ─── Planification ────────────────────────────────────────────────────────────

function PlanificationTab() {
  const [showForm, setShowForm] = useState(false);
  const { start, end } = useMemo(() => {
    const now = Date.now();
    return {
      start: now - 1 * 86400000,
      end: now + 60 * 86400000,
    };
  }, []);

  const tournees = useQuery(api.sorties.listTournees, { startDate: start, endDate: end });
  const teamMembers = useQuery(api.team.list, {});
  const updateStatus = useMutation(api.sorties.updateTourneeStatus);
  const updateStop = useMutation(api.sorties.updateTourneeStop);
  const optimizeTournee = useAction(api.sorties.optimizeTournee);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [optimizeErrorById, setOptimizeErrorById] = useState<Record<string, string>>({});

  const active = tournees?.filter((t) => t.status !== "terminee" && t.status !== "annulee") ?? [];

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
      >
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? "Annuler" : "Nouvelle tournée"}
      </button>

      {showForm && (
        <TourneeForm
          teamMembers={teamMembers ?? []}
          onClose={() => setShowForm(false)}
        />
      )}

      {tournees === undefined ? (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-8 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--crm-border)] bg-[var(--crm-surface)] p-12 text-center">
          <Truck className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-zinc-300 font-semibold">Aucune tournée à venir</p>
          <p className="text-zinc-500 text-sm mt-1">
            Créez une tournée pour planifier vos prochaines collectes à domicile.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((t) => {
            const isOpen = expanded === t._id;
            const doneStops = t.stops.filter((s) => s.status === "effectue").length;
            const totalStops = t.stops.length;
            return (
              <div
                key={t._id}
                className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] overflow-hidden"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : t._id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--crm-surface-2)] transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(t.date).toLocaleDateString("fr-FR", {
                          weekday: "long", day: "numeric", month: "long",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-100">{t.label}</p>
                    <p className="text-xs text-zinc-500">
                      {totalStops} passage{totalStops > 1 ? "s" : ""}
                      {doneStops > 0 && ` · ${doneStops}/${totalStops} effectué${doneStops > 1 ? "s" : ""}`}
                      {t.driverName && ` · ${t.driverName}`}
                    </p>
                  </div>
                  {totalStops > 0 && t.status === "en_cours" && (
                    <div className="shrink-0 mr-2">
                      <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(doneStops / totalStops) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--crm-border)]">
                    {/* Actions */}
                    <div className="flex items-center gap-2 px-5 py-3 bg-[var(--crm-surface-2)]">
                      <button
                        type="button"
                        onClick={async () => {
                          setOptimizingId(t._id);
                          setOptimizeErrorById((current) => {
                            const next = { ...current };
                            delete next[t._id];
                            return next;
                          });
                          try {
                            await optimizeTournee({
                              tourneeId: t._id as Id<"tournees">,
                            });
                          } catch (error) {
                            setOptimizeErrorById((current) => ({
                              ...current,
                              [t._id]:
                                error instanceof Error
                                  ? error.message
                                  : "Optimisation impossible.",
                            }));
                          } finally {
                            setOptimizingId((current) =>
                              current === t._id ? null : current,
                            );
                          }
                        }}
                        disabled={optimizingId === t._id || t.stops.length < 3}
                        className="rounded-xl bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        title={
                          t.stops.length < 3
                            ? "Au moins 3 arrêts sont nécessaires pour optimiser."
                            : "Optimiser l'ordre des arrêts avec Mapbox."
                        }
                      >
                        {optimizingId === t._id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Optimisation…
                          </span>
                        ) : (
                          "Optimiser"
                        )}
                      </button>
                      {t.status === "planifiee" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus({ tourneeId: t._id as Id<"tournees">, status: "en_cours" })
                          }
                          className="rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
                        >
                          Démarrer
                        </button>
                      )}
                      {t.status === "en_cours" && (
                        <button
                          type="button"
                          onClick={() =>
                            updateStatus({ tourneeId: t._id as Id<"tournees">, status: "terminee" })
                          }
                          className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                        >
                          Terminer
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--crm-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Feuille de route
                      </button>
                    </div>
                    {optimizeErrorById[t._id] && (
                      <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {optimizeErrorById[t._id]}
                      </div>
                    )}

                    {/* Stops */}
                    {t.stops.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-zinc-500">Aucun passage enregistré.</p>
                    ) : (
                      t.stops
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((stop) => (
                          <div
                            key={stop.order}
                            className="flex items-start gap-4 border-t border-[var(--crm-border)] px-5 py-4"
                          >
                            <div
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                stop.status === "effectue"
                                  ? "bg-emerald-500 text-white"
                                  : stop.status === "annule"
                                  ? "bg-zinc-700 text-zinc-500"
                                  : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {stop.status === "effectue" ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                stop.order
                              )}
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                <p className="text-sm font-medium text-zinc-200">{stop.address}</p>
                              </div>
                              {stop.contactName && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-zinc-600" />
                                  <p className="text-xs text-zinc-400">
                                    {stop.contactName}
                                    {stop.contactPhone && (
                                      <span className="text-zinc-500"> · {stop.contactPhone}</span>
                                    )}
                                  </p>
                                </div>
                              )}
                              {stop.notes && (
                                <p className="text-xs text-zinc-500 italic">{stop.notes}</p>
                              )}
                            </div>
                            {t.status === "en_cours" && stop.status === "prevu" && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateStop({
                                    tourneeId: t._id as Id<"tournees">,
                                    stopOrder: stop.order,
                                    status: "effectue",
                                  })
                                }
                                className="shrink-0 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition"
                              >
                                Effectué
                              </button>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface StopDraft {
  address: string;
  contactName: string;
  contactPhone: string;
  notes: string;
}

function TourneeForm({
  teamMembers,
  onClose,
}: {
  teamMembers: Array<{ _id: Id<"teamMembers">; name: string }>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [driverId, setDriverId] = useState("");
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createTournee = useMutation(api.sorties.createTournee);

  const openCollectes = useQuery(api.sorties.listUpcomingCollectes);

  function addStop() {
    setStops((prev) => [...prev, { address: "", contactName: "", contactPhone: "", notes: "" }]);
  }

  function removeStop(i: number) {
    setStops((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStop(i: number, field: keyof StopDraft, value: string) {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function addFromCollecte(req: {
    customer: { address?: string; firstName: string; lastName: string; phone: string };
  }) {
    setStops((prev) => [
      ...prev,
      {
        address: req.customer.address ?? "",
        contactName: `${req.customer.firstName} ${req.customer.lastName}`.trim(),
        contactPhone: req.customer.phone,
        notes: "",
      },
    ]);
  }

  async function handleSave() {
    if (!label.trim()) {
      setError("Veuillez saisir un nom pour la tournée.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const validStops = stops
        .filter((s) => s.address.trim())
        .map((s, i) => ({
          address: s.address.trim(),
          contactName: s.contactName.trim() || undefined,
          contactPhone: s.contactPhone.trim() || undefined,
          notes: s.notes.trim() || undefined,
          status: "prevu" as const,
          order: i + 1,
        }));

      await createTournee({
        label: label.trim(),
        date: new Date(date).getTime(),
        driverId: driverId ? (driverId as Id<"teamMembers">) : undefined,
        stops: validStops,
        notes: undefined,
      });
      onClose();
    } catch (e) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] divide-y divide-[var(--crm-border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-200">Nouvelle tournée</h3>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Informations générales */}
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">
            Nom de la tournée <span className="text-brand-400">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex. : Tournée nord – secteur Beauvais"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">
              Chauffeur
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">— Non assigné —</option>
              {teamMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Import depuis les demandes */}
      {(openCollectes ?? []).length > 0 && (
        <div className="p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Importer depuis les demandes de collecte
          </p>
          <div className="space-y-1 max-h-36 overflow-y-auto rounded-lg border border-[var(--crm-border)]">
            {(openCollectes ?? []).map((req) => (
              <button
                key={req._id}
                type="button"
                onClick={() => addFromCollecte(req)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition hover:bg-[var(--crm-surface-2)] border-b border-[var(--crm-border)] last:border-0"
              >
                <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300 truncate flex-1">
                  {req.customer.firstName} {req.customer.lastName}
                  {req.customer.address && (
                    <span className="text-zinc-500"> — {req.customer.address}</span>
                  )}
                </span>
                <Plus className="h-3.5 w-3.5 text-brand-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passages */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Passages ({stops.length})
          </p>
          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un passage
          </button>
        </div>

        {stops.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">
            Aucun passage — vous pourrez en ajouter après la création.
          </p>
        ) : (
          stops.map((stop, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeStop(i)}
                  className="text-zinc-600 hover:text-red-400 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={stop.address}
                onChange={(e) => updateStop(i, "address", e.target.value)}
                placeholder="Adresse"
                className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={stop.contactName}
                  onChange={(e) => updateStop(i, "contactName", e.target.value)}
                  placeholder="Nom du contact"
                  className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="tel"
                  value={stop.contactPhone}
                  onChange={(e) => updateStop(i, "contactPhone", e.target.value)}
                  placeholder="Téléphone"
                  className="rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <input
                type="text"
                value={stop.notes}
                onChange={(e) => updateStop(i, "notes", e.target.value)}
                placeholder="Notes (accès, digicode, étage…)"
                className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-5 space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!label.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Création en cours…" : "Créer la tournée"}
        </button>
      </div>
    </div>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────

function HistoriqueTab() {
  const now = useMemo(() => Date.now(), []);
  const tournees = useQuery(api.sorties.listTournees, {
    startDate: now - 180 * 86400000,
    endDate: now,
  });

  if (tournees === undefined) {
    return (
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    );
  }

  const past = tournees.filter(
    (t) => t.status === "terminee" || t.status === "annulee",
  );

  if (past.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--crm-border)] bg-[var(--crm-surface)] p-12 text-center">
        <Calendar className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 text-sm">Aucune tournée terminée sur les 6 derniers mois.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {past.length} tournée{past.length > 1 ? "s" : ""} (6 derniers mois)
      </p>
      {past.map((t) => {
        const doneStops = t.stops.filter((s) => s.status === "effectue").length;
        return (
          <div
            key={t._id}
            className="flex items-center gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4"
          >
            <Truck
              className={`h-5 w-5 shrink-0 ${
                t.status === "terminee" ? "text-emerald-400" : "text-zinc-500"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100">{t.label}</p>
              <p className="text-xs text-zinc-500">
                {new Date(t.date).toLocaleDateString("fr-FR", {
                  weekday: "short", day: "numeric", month: "short", year: "numeric",
                })}
                {t.stops.length > 0 &&
                  ` · ${doneStops}/${t.stops.length} passage${t.stops.length > 1 ? "s" : ""}`}
                {t.driverName && ` · ${t.driverName}`}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}
            >
              {STATUS_LABELS[t.status]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
