import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Wrench, ScanLine, Plus, Check, Clock,
  Package, Loader2, ArrowRight, Tag, X, BarChart3, Camera,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
const CameraScanner = lazy(() => import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })));
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { PrintLabels } from "../../components/crm/PrintLabels";

const ATELIER_TYPES = [
  { key: "nettoyage", label: "Nettoyage" },
  { key: "reparation", label: "Réparation" },
  { key: "test", label: "Test / Vérification" },
  { key: "reconditionnement", label: "Reconditionnement" },
  { key: "peinture", label: "Peinture / Finition" },
  { key: "autre", label: "Autre" },
];

type Tab = "saisie" | "en_cours" | "historique";

export function Ateliers() {
  const [tab, setTab] = useState<Tab>("saisie");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Ateliers</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Suivi valorisation</h1>
        <p className="mt-1 text-sm text-zinc-500">Enregistrez le temps de valorisation et marquez les articles comme prêts à la vente.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--crm-surface)] p-1 w-fit">
        {[
          { key: "saisie" as Tab, label: "Saisie", icon: Plus },
          { key: "en_cours" as Tab, label: "En atelier", icon: Wrench },
          { key: "historique" as Tab, label: "Historique", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-[var(--crm-surface-2)] text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "saisie" && <SaisieAtelier />}
      {tab === "en_cours" && <EnCoursList />}
      {tab === "historique" && <HistoriqueAtelier />}
    </div>
  );
}

// ─── Saisie ───────────────────────────────────────────────────────────────────

function SaisieAtelier() {
  const [scanInput, setScanInput] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [atelierType, setAtelierType] = useState("nettoyage");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupRef, setLookupRef] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<{
    _id: Id<"articles">; title: string; price: number; category: string;
    internalReference?: string; gdrReference?: string; imageUrls: string[];
  } | null>(null);

  const createSession = useMutation(api.ateliers.createSession);
  const foundArticle = useQuery(
    api.ateliers.getArticleForAtelier,
    lookupRef ? { reference: lookupRef } : "skip",
  );

  // Sync found article via useEffect to avoid state-during-render
  const [prevLookupRef, setPrevLookupRef] = useState<string | null>(null);
  if (foundArticle !== undefined && lookupRef !== null && lookupRef !== prevLookupRef) {
    setPrevLookupRef(lookupRef);
    if (foundArticle === null) {
      setNotFound(true);
      setTimeout(() => setNotFound(false), 2500);
    } else {
      setSelectedArticle(foundArticle as typeof selectedArticle);
      setNotFound(false);
    }
    setLookupRef(null);
    setScanInput("");
  }

  async function handleLookup() {
    const ref = scanInput.trim();
    if (!ref) return;
    setNotFound(false);
    setLookupRef(ref);
    setPrevLookupRef(null);
  }

  async function handleSave() {
    if (!selectedArticle) return;
    setSaving(true);
    try {
      await createSession({
        articleId: selectedArticle._id,
        type: atelierType,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        notes: notes || undefined,
      });
      setSuccess(true);
      setSelectedArticle(null);
      setScanInput("");
      setDurationMinutes("");
      setNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {cameraOpen && (
        <ErrorBoundary
          fallback={() => (
            <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-black p-8 text-center">
              <Camera className="h-9 w-9 text-zinc-500" />
              <p className="max-w-xs text-sm text-zinc-200">
                Le scanner n'a pas pu démarrer. Rechargez la page puis réessayez.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Recharger
                </button>
                <button
                  type="button"
                  onClick={() => setCameraOpen(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        >
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                <p className="text-sm text-zinc-300">Ouverture du scanner…</p>
              </div>
            }
          >
            <CameraScanner
              onDetected={(code) => {
                setScanInput(code);
                setLookupRef(code);
                setPrevLookupRef(null);
                setCameraOpen(false);
              }}
              onClose={() => setCameraOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-300">Article enregistré en atelier avec succès.</span>
        </div>
      )}

      {/* Identification de l'article */}
      <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Identifier l'article</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Code-barres ou référence article (ex. MOB-20240101-0001)"
            className="flex-1 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="rounded-xl border border-[var(--crm-border)] px-3 py-2 text-zinc-300 hover:bg-[var(--crm-surface-2)] transition"
            title="Scanner avec la caméra"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLookup}
            disabled={!scanInput.trim()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40 transition"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {notFound && (
          <p className="text-xs text-red-400">Aucun article trouvé pour cette référence.</p>
        )}

        {selectedArticle && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
              {selectedArticle.imageUrls[0] ? (
                <img src={selectedArticle.imageUrls[0]} alt={selectedArticle.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-4 w-4 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-100 line-clamp-1 text-sm">{selectedArticle.title}</p>
              <p className="text-xs text-zinc-500">
                {selectedArticle.category} · {formatPrice(selectedArticle.price)}
              </p>
              <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                {selectedArticle.internalReference ?? selectedArticle.gdrReference}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="shrink-0 text-zinc-600 hover:text-zinc-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Type d'intervention */}
      <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Type d'intervention</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ATELIER_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setAtelierType(t.key)}
              className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                atelierType === t.key
                  ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                  : "border-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
              Durée estimée (min)
            </label>
            <input
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="Ex. : 30"
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Observations
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Description des travaux, état de l'article…"
            className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedArticle || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          {saving ? "Enregistrement…" : "Envoyer en atelier"}
        </button>
      </div>
    </div>
  );
}

// ─── En cours ─────────────────────────────────────────────────────────────────

function EnCoursList() {
  const sessions = useQuery(api.ateliers.listSessions, { status: "en_cours" });
  const terminateSession = useMutation(api.ateliers.terminateSession);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [termPrice, setTermPrice] = useState<Record<string, string>>({});
  const [printArticle, setPrintArticle] = useState<{ _id: string; title: string; price: number; internalReference?: string; gdrReference?: string; category: string; condition?: string } | null>(null);

  async function handleTerminate(sessionId: Id<"atelierSessions">, price?: number) {
    setTerminating(sessionId);
    try {
      await terminateSession({ sessionId, price });
    } finally {
      setTerminating(null);
    }
  }

  if (sessions === undefined) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-12 text-center">
        <Wrench className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-300 font-semibold">Aucun article en atelier</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map((s) => {
          const type = ATELIER_TYPES.find((t) => t.key === s.type);
          return (
            <div key={s._id} className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {s.article?.imageUrl ? (
                    <img src={s.article.imageUrl} alt={s.article.title} className="h-full w-full object-cover" />
                  ) : <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-zinc-600" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-100 line-clamp-1">{s.article?.title ?? "Article inconnu"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">{type?.label}</span>
                    {s.durationMinutes && <span className="text-xs text-zinc-500"><Clock className="inline h-3 w-3 mr-0.5" />{s.durationMinutes} min</span>}
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(s.date).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <div className="border-t border-[var(--crm-border)] flex items-center gap-3 px-4 py-3 bg-[var(--crm-surface-2)]">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={termPrice[s._id] ?? (s.article?.price?.toString() ?? "")}
                  onChange={(e) => setTermPrice((p) => ({ ...p, [s._id]: e.target.value }))}
                  placeholder="Prix de vente (€)"
                  className="flex-1 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {s.article && (
                  <button type="button" onClick={() => setPrintArticle({
                    _id: s.article!._id as string,
                    title: s.article!.title,
                    price: parseFloat(termPrice[s._id] ?? "") || s.article!.price,
                    internalReference: s.article!.internalReference as string | undefined,
                    gdrReference: s.article!.gdrReference as string | undefined,
                    category: s.article!.category,
                    condition: s.article!.condition as string | undefined,
                  })}
                    className="rounded-lg border border-[var(--crm-border)] p-2.5 text-zinc-400 hover:text-zinc-200 transition">
                    <Tag className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={terminating === s._id}
                  onClick={() => handleTerminate(s._id as Id<"atelierSessions">, termPrice[s._id] ? parseFloat(termPrice[s._id]) : undefined)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-40"
                >
                  {terminating === s._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Terminé
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {printArticle && (
        <PrintLabels
          articles={[{
            _id: printArticle._id,
            title: printArticle.title,
            price: printArticle.price,
            internalReference: printArticle.internalReference,
            gdrReference: printArticle.gdrReference,
            category: printArticle.category,
            condition: printArticle.condition,
          }]}
          onClose={() => setPrintArticle(null)}
        />
      )}
    </>
  );
}

// ─── Historique ───────────────────────────────────────────────────────────────

function HistoriqueAtelier() {
  const sessions = useQuery(api.ateliers.listSessions, { status: "termine" });

  if (sessions === undefined) return <p className="text-sm text-zinc-500">Chargement…</p>;

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-12 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-300 font-semibold">Aucune session terminée</p>
      </div>
    );
  }

  const totalMinutes = sessions.reduce((s, sess) => s + (sess.durationMinutes ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
          <p className="text-xs text-zinc-500">Sessions</p>
          <p className="mt-0.5 text-xl font-bold text-zinc-100">{sessions.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
          <p className="text-xs text-zinc-500">Temps total</p>
          <p className="mt-0.5 text-xl font-bold text-zinc-100">{Math.floor(totalMinutes / 60)}h{totalMinutes % 60}min</p>
        </div>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => {
          const type = ATELIER_TYPES.find((t) => t.key === s.type);
          return (
            <div key={s._id} className="flex items-center gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
              <Wrench className="h-4 w-4 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{s.article?.title ?? s.articleReference}</p>
                <p className="text-xs text-zinc-500">
                  {type?.label} · {new Date(s.date).toLocaleDateString("fr-FR")}
                  {s.durationMinutes && ` · ${s.durationMinutes} min`}
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Terminé
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
