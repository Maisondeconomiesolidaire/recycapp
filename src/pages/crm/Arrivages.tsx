import { useState, useEffect, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { createPortal } from "react-dom";
import { Plus, Printer, X, Check, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Barcode } from "../../components/ui/Barcode";
import { COLLECTE_CATEGORIES, COLLECTE_SUBCATEGORIES } from "../../lib/constants";

// ─── Référentiels ───────────────────────────────────────────────────────────

const ORIGINS = [
  { key: "decheterie", label: "Déchèterie" },
  { key: "domicile", label: "Rendez-vous" },
  { key: "apport", label: "Apport volontaire" },
  { key: "tournee", label: "Tournée" },
] as const;

const ORIENTATIONS = [
  { key: "boutique", label: "Boutique", active: "bg-emerald-500 text-white", bg: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  { key: "atelier", label: "Atelier", active: "bg-blue-500 text-white", bg: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
  { key: "dons", label: "Dons", active: "bg-violet-500 text-white", bg: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
  { key: "recyclage", label: "Recyclage", active: "bg-amber-500 text-white", bg: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  { key: "dechet", label: "Déchet", active: "bg-zinc-600 text-white", bg: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30" },
] as const;

const CATEGORIES = COLLECTE_CATEGORIES.map((c) => ({
  key: c.label,
  image: c.image,
  subs: COLLECTE_SUBCATEGORIES[c.key] ?? [],
}));

const ORIGIN_LABELS: Record<string, string> = {
  decheterie: "Déchèterie", domicile: "Rendez-vous", apport: "Apport volontaire", tournee: "Tournée",
};
const ORIENTATION_LABELS: Record<string, string> = {
  boutique: "Boutique", atelier: "Atelier", dons: "Dons", recyclage: "Recyclage", dechet: "Déchet",
};

type Ticket = {
  itemId?: Id<"arrivageItems">;
  reference: string;
  designation: string;
  origin: string;
  orientation: string;
  weightKg: string;
  quantity: number;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Arrivages() {
  const addItem = useMutation(api.arrivages.addItem);
  const removeItem = useMutation(api.arrivages.removeItem);
  const history = useQuery(api.arrivages.listRecentArrivals);

  const [origin, setOrigin] = useState("");
  const [orientation, setOrientation] = useState("boutique");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [designation, setDesignation] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  const [pending, setPending] = useState<Ticket[]>([]);
  const [printTickets, setPrintTickets] = useState<Ticket[] | null>(null);

  const subs = category ? CATEGORIES.find((c) => c.key === category)?.subs ?? [] : [];
  const canSubmit = Boolean(origin && orientation && category) && !saving;

  async function addObject() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { itemId, reference } = await addItem({
        date: Date.now(),
        origin: origin as "decheterie" | "domicile" | "apport" | "tournee",
        orientation,
        category,
        subcategory: subcategory || undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        quantity: parseInt(quantity) || 1,
        labelInfo: designation || undefined,
      });
      const t: Ticket = {
        itemId,
        reference,
        designation: designation || (subcategory ? `${category} – ${subcategory}` : category),
        origin,
        orientation,
        weightKg,
        quantity: parseInt(quantity) || 1,
      };
      setPending((p) => [t, ...p]);
      // On garde provenance + destination pour enchaîner les saisies.
      setCategory("");
      setSubcategory("");
      setDesignation("");
      setWeightKg("");
      setQuantity("1");
    } finally {
      setSaving(false);
    }
  }

  async function removePending(t: Ticket) {
    if (t.itemId) await removeItem({ itemId: t.itemId });
    setPending((p) => p.filter((x) => x.reference !== t.reference));
  }

  function validate() {
    if (pending.length === 0) return;
    setPrintTickets([...pending]);
    setPending([]);
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Collecte</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Nouvelle arrivée</h1>
        <p className="mt-1 text-sm text-zinc-500">Ajoutez les objets entrants, puis validez l'arrivage pour imprimer les tickets code-barres.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Formulaire */}
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-5">
          <Field label="Provenance *">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ORIGINS.map((o) => (
                <Choice key={o.key} active={origin === o.key} onClick={() => setOrigin(o.key)}>
                  {o.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="Catégorie *">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => { setCategory(c.key); setSubcategory(""); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition ${
                    category === c.key
                      ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                      : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <img src={c.image} alt="" className="h-10 w-10 object-contain" />
                  <span className="text-center leading-tight">{c.key}</span>
                </button>
              ))}
            </div>
          </Field>

          {subs.length > 0 && (
            <Field label="Sous-catégorie">
              <div className="flex flex-wrap gap-1.5">
                {subs.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubcategory(subcategory === s ? "" : s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ring-1 ${
                      subcategory === s
                        ? "bg-brand-500 text-white ring-transparent"
                        : "ring-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Destination *">
            <div className="flex flex-wrap gap-1.5">
              {ORIENTATIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOrientation(o.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ring-1 ${
                    orientation === o.key ? o.active + " ring-transparent" : o.bg
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px] gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Désignation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Description courte (optionnel)"
                className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Poids (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.0"
                className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Quantité</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addObject}
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)] transition"
          >
            {saving ? "Ajout…" : <><Plus className="h-4 w-4" /> Ajouter à l'arrivée</>}
          </button>
        </div>

        {/* Colonne droite : objets ajoutés + historique */}
        <div className="space-y-6">
          {/* Objets de cette arrivée */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              Objets de cette arrivée{pending.length > 0 ? ` (${pending.length})` : ""}
            </h3>
            {pending.length === 0 ? (
              <p className="text-xs text-zinc-500">Ajoutez des objets via le formulaire.</p>
            ) : (
              <div className="space-y-2">
                {pending.map((t) => (
                  <div
                    key={t.reference}
                    className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">{t.designation}</p>
                      <p className="font-mono text-xs text-zinc-500">{t.reference}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(t)}
                      title="Retirer"
                      className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bouton valider — sous la liste des objets ajoutés */}
            <button
              type="button"
              onClick={validate}
              disabled={pending.length === 0}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Valider l'arrivage{pending.length > 0 ? ` (${pending.length})` : ""}
            </button>
          </div>

          {/* Historique des dernières arrivées */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">Dernières arrivées</h3>
            {!history || history.length === 0 ? (
              <p className="text-xs text-zinc-500">Aucune arrivée enregistrée pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {history.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-200">
                        {r.name}
                        {r.exited && <span className="ml-2 text-[10px] font-semibold uppercase text-rose-400">Sorti</span>}
                      </p>
                      <p className="font-mono text-xs text-zinc-500">{r.reference}</p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPrintTickets([
                          {
                            itemId: r._id,
                            reference: r.reference,
                            designation: r.name,
                            origin: r.origin,
                            orientation: r.orientation,
                            weightKg: r.weightKg != null ? String(r.weightKg) : "",
                            quantity: r.quantity,
                          },
                        ])
                      }
                      title="Réimprimer le ticket"
                      className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {printTickets && <ArrivalTickets tickets={printTickets} onClose={() => setPrintTickets(null)} />}
    </div>
  );
}

// ─── Petits composants ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tickets code-barres (impression Brother 62 × 29 mm) ──────────────────────

function ArrivalTickets({ tickets, onClose }: { tickets: Ticket[]; onClose: () => void }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "arrival-ticket-css";
    style.textContent = `
      @media print {
        body > *:not(#arrival-ticket-root) { display: none !important; }
        #arrival-ticket-root .print-hidden { display: none !important; }
        #arrival-ticket-root .ticket-print { display: block !important; }
        #arrival-ticket-root .ticket-page { break-after: page; }
        @page { size: 62mm 29mm; margin: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("arrival-ticket-css")?.remove();
  }, []);

  const content = (
    <div id="arrival-ticket-root" className="fixed inset-0 z-[200] flex flex-col bg-[color:var(--crm-bg)]">
      {/* Barre d'outils */}
      <div className="print-hidden flex items-center justify-between border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-3">
        <h2 className="text-sm font-bold text-zinc-100">
          {tickets.length > 1 ? `${tickets.length} tickets d'arrivage` : "Ticket d'arrivage"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Aperçu écran */}
      <div className="print-hidden flex flex-1 flex-wrap content-start items-start justify-center gap-4 overflow-auto p-6">
        {tickets.map((t) => (
          <TicketBody key={t.reference} ticket={t} />
        ))}
      </div>

      {/* Version imprimée */}
      <div className="ticket-print hidden">
        {tickets.map((t) => (
          <div key={t.reference} className="ticket-page">
            <TicketBody ticket={t} />
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function TicketBody({ ticket }: { ticket: Ticket }) {
  const meta = [
    `${ORIGIN_LABELS[ticket.origin] ?? ticket.origin} → ${ORIENTATION_LABELS[ticket.orientation] ?? ticket.orientation}`,
    ticket.weightKg ? `${ticket.weightKg} kg` : null,
    ticket.quantity > 1 ? `×${ticket.quantity}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="bg-white text-black"
      style={{ width: "62mm", padding: "2mm 3mm", boxSizing: "border-box" }}
    >
      <div className="flex justify-center">
        <Barcode value={ticket.reference} height={32} width={1.4} className="max-w-full text-black" />
      </div>
      <p className="text-center font-mono text-[9pt] font-semibold leading-tight text-black">{ticket.reference}</p>
      <p className="mt-1 truncate text-center text-[8pt] font-bold leading-tight text-black">{ticket.designation}</p>
      <p className="truncate text-center text-[6.5pt] leading-tight text-zinc-600">{meta}</p>
    </div>
  );
}
