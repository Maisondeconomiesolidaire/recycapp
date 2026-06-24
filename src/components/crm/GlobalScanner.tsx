/**
 * GlobalScanner — mounted once in CrmLayout.
 *
 * Listens for rapid keyboard input (external barcode scanner) on any CRM page.
 * When a code is detected (and no text input is focused), it opens a quick-sell
 * modal backed by api.ventes.createVente so a proper receipt is created.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ScanLine, Check, X, Banknote, CreditCard, FileText,
  Loader2, Package, AlertCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { api } from "../../../convex/_generated/api";
import { Barcode } from "../ui/Barcode";
import { formatPrice } from "../../lib/format";

type PaymentKey = "especes" | "cb" | "cheque" | "cheque_cadeau" | "virement";

const PAYMENT_METHODS: { key: PaymentKey; label: string; icon: typeof Banknote }[] = [
  { key: "especes", label: "Espèces", icon: Banknote },
  { key: "cb", label: "Carte bancaire", icon: CreditCard },
  { key: "cheque", label: "Chèque", icon: FileText },
  { key: "cheque_cadeau", label: "Chèque cadeau", icon: FileText },
  { key: "virement", label: "Virement", icon: FileText },
];

type ModalState =
  | { phase: "idle" }
  | { phase: "lookup"; code: string }
  | { phase: "found"; article: FoundArticle }
  | { phase: "not_found"; code: string }
  | { phase: "already_sold"; article: FoundArticle }
  | { phase: "success"; receiptNumber: string; total: number; change?: number };

interface FoundArticle {
  _id: string;
  title: string;
  price: number;
  category: string;
  condition?: string;
  status: string;
  internalReference?: string;
  gdrReference?: string;
  imageUrls: string[];
}

export function GlobalScanner() {
  const [modal, setModal] = useState<ModalState>({ phase: "idle" });
  const [payment, setPayment] = useState<PaymentKey>("especes");
  const [tendered, setTendered] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVente = useMutation(api.ventes.createVente);

  // Article lookup — only active during the "lookup" phase
  const foundArticle = useQuery(
    api.ventes.getArticleByReference,
    modal.phase === "lookup" ? { reference: modal.code } : "skip",
  );

  // React to lookup result
  useEffect(() => {
    if (modal.phase !== "lookup") return;
    if (foundArticle === undefined) return; // still loading

    if (foundArticle === null) {
      setModal({ phase: "not_found", code: modal.code });
    } else if (foundArticle.status === "vendu") {
      setModal({ phase: "already_sold", article: foundArticle as FoundArticle });
    } else {
      setModal({ phase: "found", article: foundArticle as FoundArticle });
    }
  }, [foundArticle, modal]);

  // Global keyboard scanner listener
  useEffect(() => {
    let buffer = "";
    let bufferStart = 0;

    function onKeyDown(e: KeyboardEvent) {
      // Skip if typing in an input field — the scanner input should go there instead
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        buffer = "";
        return;
      }

      // Escape closes the modal
      if (e.key === "Escape") {
        setModal({ phase: "idle" });
        buffer = "";
        return;
      }

      if (e.key === "Enter" && buffer.length >= 4) {
        const elapsed = Date.now() - bufferStart;
        // Barcode scanners complete in < 100ms per character — full code in < 800ms
        if (elapsed < 800) {
          const code = buffer.trim();
          setModal({ phase: "lookup", code });
          setPayment("especes");
          setTendered("");
          setError(null);
        }
        buffer = "";
        bufferStart = 0;
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!buffer) bufferStart = Date.now();
        buffer += e.key;
      }

      // Auto-reset stale buffer (human typed something slowly)
      if (buffer && Date.now() - bufferStart > 2000) {
        buffer = "";
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSell() {
    if (modal.phase !== "found") return;
    const article = modal.article;
    const tenderedNum = parseFloat(tendered) || 0;

    setPaying(true);
    setError(null);
    try {
      const result = await createVente({
        items: [{ articleId: article._id as never, title: article.title, price: article.price }],
        paymentMethod: payment,
        amountTendered: payment === "especes" && tenderedNum > 0 ? tenderedNum : undefined,
      });
      const change =
        payment === "especes" && tenderedNum > result.total
          ? Math.round((tenderedNum - result.total) * 100) / 100
          : undefined;
      setModal({ phase: "success", receiptNumber: result.receiptNumber, total: result.total, change });
    } catch (e) {
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
      console.error(e);
    } finally {
      setPaying(false);
    }
  }

  function close() {
    setModal({ phase: "idle" });
    setTendered("");
    setError(null);
  }

  if (modal.phase === "idle") return null;

  const tenderedNum = parseFloat(tendered) || 0;
  const price = modal.phase === "found" ? modal.article.price : 0;
  const change = payment === "especes" && tenderedNum > price
    ? Math.round((tenderedNum - price) * 100) / 100
    : undefined;

  const ref =
    modal.phase === "found" || modal.phase === "already_sold"
      ? (modal.article.internalReference ?? modal.article.gdrReference ?? "")
      : modal.phase === "lookup"
      ? modal.code
      : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--crm-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-semibold text-zinc-200">
              {modal.phase === "success" ? "Vente enregistrée" : "Article scanné"}
            </span>
          </div>
          <button type="button" onClick={close} className="text-zinc-500 hover:text-zinc-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Loading */}
          {modal.phase === "lookup" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">Recherche de l'article…</p>
              <p className="text-xs font-mono text-zinc-600">{modal.code}</p>
            </div>
          )}

          {/* Not found */}
          {modal.phase === "not_found" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-zinc-300 font-semibold">Article introuvable</p>
              <p className="text-xs text-zinc-500">
                Aucun article ne correspond au code{" "}
                <code className="font-mono text-zinc-400">{modal.code}</code>.
              </p>
              <button type="button" onClick={close}
                className="mt-2 rounded-xl border border-[var(--crm-border)] px-4 py-2 text-sm text-zinc-300 hover:bg-[var(--crm-surface-2)] transition">
                Fermer
              </button>
            </div>
          )}

          {/* Already sold */}
          {modal.phase === "already_sold" && (
            <>
              <ArticleCard article={modal.article} />
              <div className="rounded-xl bg-[var(--crm-surface-3)] border border-[var(--crm-border-strong)] px-4 py-3 text-center text-sm text-zinc-400">
                Cet article est déjà marqué comme <strong className="text-zinc-200">vendu</strong>.
              </div>
              <button type="button" onClick={close}
                className="w-full rounded-xl border border-[var(--crm-border)] py-2.5 text-sm text-zinc-400 hover:bg-[var(--crm-surface-2)] transition">
                Fermer
              </button>
            </>
          )}

          {/* Found — sell flow */}
          {modal.phase === "found" && (
            <>
              <ArticleCard article={modal.article} />

              {/* Barcode preview */}
              {ref && (
                <div className="flex justify-center rounded-xl bg-white px-4 py-3">
                  <Barcode value={ref} height={32} displayValue className="text-black max-w-[200px]" />
                </div>
              )}

              {/* Payment method */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                  Mode de règlement
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                    <button key={key} type="button" onClick={() => setPayment(key)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-semibold transition ${
                        payment === key
                          ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                          : "border-[var(--crm-border)] text-zinc-500 hover:text-zinc-300"
                      }`}>
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash tendered */}
              {payment === "especes" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 block mb-1.5">
                      Montant remis (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tendered}
                      onChange={(e) => setTendered(e.target.value)}
                      placeholder={formatPrice(modal.article.price)}
                      autoFocus
                      className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  {change !== undefined && change >= 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                      <span className="text-sm font-semibold text-emerald-300">Monnaie à rendre</span>
                      <span className="text-lg font-extrabold text-emerald-300">{formatPrice(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <button type="button" onClick={handleSell} disabled={paying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white disabled:opacity-50 shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:opacity-90">
                {paying
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  : <><Check className="h-4 w-4" /> Encaisser {formatPrice(modal.article.price)}</>
                }
              </button>
            </>
          )}

          {/* Success */}
          {modal.phase === "success" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-emerald-400">{formatPrice(modal.total)}</p>
                <p className="text-xs text-zinc-500 mt-1">Ticket n° {modal.receiptNumber}</p>
              </div>
              {modal.change !== undefined && modal.change > 0 && (
                <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <p className="text-sm text-emerald-300">
                    Monnaie à rendre : <strong>{formatPrice(modal.change)}</strong>
                  </p>
                </div>
              )}
              {ref && (
                <div className="flex justify-center rounded-xl bg-white px-4 py-2 w-full">
                  <Barcode value={modal.receiptNumber} height={28} displayValue className="text-black max-w-[180px]" />
                </div>
              )}
              <button type="button" onClick={close}
                className="w-full rounded-xl bg-[var(--crm-surface-2)] border border-[var(--crm-border)] py-2.5 text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition">
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ArticleCard({ article }: { article: FoundArticle }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--crm-surface-3)]">
        {article.imageUrls?.[0] ? (
          <img src={article.imageUrls[0]} alt={article.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-6 w-6 text-zinc-600" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-100 line-clamp-2 text-sm leading-snug">{article.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{article.category}{article.condition && ` · ${article.condition}`}</p>
        <p className="text-xl font-extrabold text-brand-400 mt-1">{formatPrice(article.price)}</p>
      </div>
    </div>
  );
}
