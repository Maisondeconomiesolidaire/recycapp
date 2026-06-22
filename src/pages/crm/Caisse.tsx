import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ScanLine, Plus, Trash2, CreditCard, Banknote, FileText,
  Check, Printer, BarChart3, Package, ShoppingCart,
  Loader2, Camera,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { Barcode } from "../../components/ui/Barcode";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { lazy, Suspense } from "react";
const CameraScanner = lazy(() => import("../../components/ui/CameraScanner").then((m) => ({ default: m.CameraScanner })));

function ScannerLoading() {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-3 bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      <p className="text-sm text-zinc-300">Ouverture du scanner…</p>
    </div>
  );
}

function ScannerError({ onClose }: { onClose: () => void }) {
  return (
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
          onClick={onClose}
          className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  articleId: Id<"articles">;
  title: string;
  price: number;
  reference: string;
  imageUrl?: string;
}

interface ArticleSuggestion {
  _id: Id<"articles">;
  title: string;
  price: number;
  reference: string;
  imageUrls: string[];
}

const CAISSE_DRAFT_STORAGE_KEY = "crm-caisse-draft";

const PAYMENT_METHODS = [
  { key: "especes" as const, label: "Espèces", icon: Banknote },
  { key: "cb" as const, label: "Carte bancaire", icon: CreditCard },
  { key: "cheque" as const, label: "Chèque", icon: FileText },
  { key: "cheque_cadeau" as const, label: "Chèque cadeau", icon: FileText },
  { key: "virement" as const, label: "Virement", icon: FileText },
];

type PaymentMethod = typeof PAYMENT_METHODS[number]["key"];

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "caisse" | "historique";

export function Caisse() {
  const [tab, setTab] = useState<Tab>("caisse");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">GDR Magasin</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Caisse</h1>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[var(--crm-surface)] p-1 w-fit">
        {[{ key: "caisse" as Tab, label: "Vente" }, { key: "historique" as Tab, label: "Historique" }].map(({ key, label }) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-[var(--crm-surface-2)] text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {key === "caisse" ? <ShoppingCart className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </div>

      {tab === "caisse" ? <CaissePanel /> : <HistoriquePanel />}
    </div>
  );
}

// ─── Caisse Panel ─────────────────────────────────────────────────────────────

function CaissePanel() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("especes");
  const [discountInput, setDiscountInput] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{ receiptNumber: string; total: number; change?: number } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const draftHydratedRef = useRef(false);
  const checkoutHandledRef = useRef<string | null>(null);

  const createVente = useMutation(api.ventes.createVente);
  const startTestCheckout = useAction(api.stripe.startTestCheckout);
  const confirmTestCheckout = useAction(api.stripe.confirmTestCheckout);

  // Article lookup via barcode/reference
  const [lookupRef, setLookupRef] = useState<string | null>(null);
  const foundArticle = useQuery(
    api.ventes.getArticleByReference,
    lookupRef ? { reference: lookupRef } : "skip",
  );
  const suggestions = useQuery(
    api.ventes.searchArticlesForSale,
    scanInput.trim().length >= 2 ? { searchText: scanInput.trim() } : "skip",
  );

  function addArticleToCart(article: {
    _id: Id<"articles">;
    title: string;
    price: number;
    imageUrls?: string[];
    internalReference?: string;
    gdrReference?: string;
    reference?: string;
  }) {
    const alreadyIn = cart.some((item) => item.articleId === article._id);
    if (alreadyIn) {
      setScanInput("");
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        articleId: article._id,
        title: article.title,
        price: article.price,
        reference:
          article.reference ??
          article.internalReference ??
          article.gdrReference ??
          "",
        imageUrl: article.imageUrls?.[0],
      },
    ]);
    setScanInput("");
  }

  useEffect(() => {
    if (lookupRef === null) return;
    if (foundArticle === undefined) return; // loading

    if (foundArticle === null) {
      setNotFound(true);
      setTimeout(() => setNotFound(false), 2000);
    } else {
      if (foundArticle.status === "disponible") {
        addArticleToCart(foundArticle);
      }
    }
    setLookupRef(null);
    setScanning(false);
  }, [foundArticle, lookupRef]);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem(CAISSE_DRAFT_STORAGE_KEY);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as {
          cart?: CartItem[];
          discountInput?: string;
          amountTendered?: string;
          paymentMethod?: PaymentMethod;
        };
        setCart(draft.cart ?? []);
        setDiscountInput(draft.discountInput ?? "");
        setAmountTendered(draft.amountTendered ?? "");
        setPaymentMethod(draft.paymentMethod ?? "especes");
      } catch {
        window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
      }
    }
    draftHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) return;

    if (
      cart.length === 0 &&
      !discountInput &&
      !amountTendered &&
      paymentMethod === "especes"
    ) {
      window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      CAISSE_DRAFT_STORAGE_KEY,
      JSON.stringify({ cart, discountInput, amountTendered, paymentMethod }),
    );
  }, [amountTendered, cart, discountInput, paymentMethod]);

  useEffect(() => {
    if (!draftHydratedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe_status");
    const sessionId = params.get("session_id");
    const draftId = params.get("draft_id");

    if (stripeStatus === "cancelled") {
      setCheckoutMessage("Paiement Stripe test annulé. Le panier a été conservé.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (
      stripeStatus !== "success" ||
      !sessionId ||
      !draftId ||
      checkoutHandledRef.current === sessionId
    ) {
      return;
    }

    checkoutHandledRef.current = sessionId;
    setPaying(true);
    setCheckoutMessage("Validation du paiement Stripe test…");

    void confirmTestCheckout({
      draftId: draftId as Id<"stripeCheckoutDrafts">,
      sessionId,
    })
      .then((result) => {
        setReceipt({
          receiptNumber: result.receiptNumber,
          total: result.total,
          change: result.change,
        });
        setCart([]);
        setDiscountInput("");
        setAmountTendered("");
        setPaymentMethod("especes");
        setCheckoutMessage(null);
        window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
      })
      .catch((error: unknown) => {
        setCheckoutMessage(
          error instanceof Error
            ? error.message
            : "Le paiement Stripe test n'a pas pu être validé.",
        );
      })
      .finally(() => {
        setPaying(false);
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, [confirmTestCheckout]);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setScanning(true);
    setNotFound(false);
    setLookupRef(scanInput.trim());
  }

  function handleCameraDetected(code: string) {
    setScanning(true);
    setNotFound(false);
    setScanInput(code);
    setLookupRef(code);
  }

  function removeItem(articleId: Id<"articles">) {
    setCart((prev) => prev.filter((c) => c.articleId !== articleId));
  }

  const subtotal = cart.reduce((s, c) => s + c.price, 0);
  const discount = parseFloat(discountInput) || 0;
  const total = Math.max(0, subtotal - discount);
  const tendered = parseFloat(amountTendered) || 0;
  const change = paymentMethod === "especes" && tendered > 0 ? Math.max(0, tendered - total) : undefined;

  async function handlePay() {
    if (cart.length === 0) return;
    setPaying(true);
    setCheckoutMessage(null);

    try {
      if (paymentMethod === "cb") {
        const result = await startTestCheckout({
          items: cart.map((c) => ({
            articleId: c.articleId,
            title: c.title,
            price: c.price,
          })),
          discountAmount: discount > 0 ? discount : undefined,
          returnUrl: window.location.href,
        });
        window.location.assign(result.checkoutUrl);
        return;
      }

      const result = await createVente({
        items: cart.map((c) => ({ articleId: c.articleId, title: c.title, price: c.price })),
        discountAmount: discount > 0 ? discount : undefined,
        paymentMethod,
        amountTendered: paymentMethod === "especes" && tendered > 0 ? tendered : undefined,
      });
      setReceipt({ receiptNumber: result.receiptNumber, total: result.total, change: result.change });
      setCart([]);
      setDiscountInput("");
      setAmountTendered("");
      window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
    } catch (error) {
      setCheckoutMessage(
        error instanceof Error ? error.message : "Encaissement impossible.",
      );
    } finally {
      setPaying(false);
    }
  }

  if (receipt) {
    return <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <>
      {cameraOpen && (
        <ErrorBoundary fallback={() => <ScannerError onClose={() => setCameraOpen(false)} />}>
          <Suspense fallback={<ScannerLoading />}>
            <CameraScanner
              onDetected={handleCameraDetected}
              onClose={() => setCameraOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: article search */}
      <div className="space-y-5">
        {/* Scan bar */}
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-brand-400" />
            <span className="text-sm font-semibold text-zinc-200">Scanner, saisir une référence ou rechercher par nom</span>
            {notFound && (
              <span className="ml-auto text-xs text-red-400">Référence introuvable</span>
            )}
          </div>
          {checkoutMessage && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {checkoutMessage}
            </div>
          )}
          <form onSubmit={handleScan} className="flex gap-2">
            <input
              ref={scanRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Scanner, saisir la référence ou le nom…"
              autoFocus
              className="flex-1 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[var(--crm-border)] px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-[var(--crm-surface-2)] transition"
              title="Scanner avec la caméra"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={!scanInput.trim() || scanning}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40 transition"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter
            </button>
          </form>
          {scanInput.trim().length >= 2 && (
            <div className="overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]">
              {suggestions === undefined ? (
                <div className="px-3 py-2 text-xs text-zinc-500">Recherche en cours…</div>
              ) : suggestions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">Aucun article disponible pour cette recherche.</div>
              ) : (
                suggestions.map((article: ArticleSuggestion) => (
                  <button
                    key={article._id}
                    type="button"
                    onClick={() => addArticleToCart(article)}
                    className="flex w-full items-center gap-3 border-t border-[var(--crm-border)] px-3 py-3 text-left first:border-t-0 hover:bg-white/5"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                      {article.imageUrls[0] ? (
                        <img
                          src={article.imageUrls[0]}
                          alt={article.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-zinc-100">
                        {article.title}
                      </p>
                      <p className="text-xs font-mono text-zinc-500">
                        {article.reference || "Sans référence"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-zinc-200">
                      {formatPrice(article.price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--crm-border)] p-12 text-center">
            <ShoppingCart className="h-10 w-10 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400">Panier vide</p>
            <p className="text-xs text-zinc-600 mt-1">Scannez un article pour commencer</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.articleId} className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100 line-clamp-1">{item.title}</p>
                  <p className="text-xs text-zinc-500 font-mono">{item.reference}</p>
                </div>
                <p className="text-base font-bold text-zinc-100 shrink-0">{formatPrice(item.price)}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.articleId)}
                  className="shrink-0 rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: payment panel */}
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-200">Récapitulatif</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>{cart.length} article{cart.length > 1 ? "s" : ""}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Remise</span>
                <span>− {formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--crm-border)] pt-2 text-lg font-bold text-zinc-100">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Remise (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Règlement</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPaymentMethod(key)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    paymentMethod === key
                      ? "border-brand-500/50 bg-brand-500/15 text-brand-300"
                      : "border-[var(--crm-border)] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount tendered (cash only) */}
          {paymentMethod === "especes" && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">Montant remis (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={formatPrice(total)}
                  className="w-full rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              {change !== undefined && change >= 0 && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-300">Monnaie à rendre</span>
                  <span className="text-xl font-extrabold text-emerald-300">{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={cart.length === 0 || paying}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-base font-bold text-white disabled:opacity-40 shadow-[0_4px_14px_rgba(241,16,79,0.3)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)] transition"
          >
            {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {paying
              ? "Validation…"
              : paymentMethod === "cb"
                ? `Payer avec Stripe test ${formatPrice(total)}`
                : `Encaisser ${formatPrice(total)}`}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Receipt View ─────────────────────────────────────────────────────────────

function ReceiptView({ receipt, onClose }: { receipt: { receiptNumber: string; total: number; change?: number }; onClose: () => void }) {
  function handlePrint() { window.print(); }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Vente validée</h2>
        <p className="text-3xl font-extrabold text-emerald-400">{formatPrice(receipt.total)}</p>
        <p className="text-sm text-zinc-400">Ticket n° {receipt.receiptNumber}</p>
        {receipt.change !== undefined && receipt.change > 0 && (
          <div className="rounded-xl bg-emerald-500/20 px-4 py-3">
            <p className="text-sm text-emerald-300">Monnaie rendue : <strong>{formatPrice(receipt.change)}</strong></p>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Barcode value={receipt.receiptNumber} height={36} displayValue className="text-emerald-300 max-w-[180px]" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--crm-border)] py-3 text-sm font-semibold text-zinc-300 hover:bg-[var(--crm-surface-2)] transition">
            <Printer className="h-4 w-4" /> Ticket
          </button>
          <button type="button" onClick={onClose}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white transition">
            <Plus className="h-4 w-4" /> Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Historique Panel ─────────────────────────────────────────────────────────

function HistoriquePanel() {
  const [range, setRange] = useState<"7j" | "30j">("7j");

  const { startDate, endDate } = range === "7j"
    ? { startDate: Date.now() - 7 * 86400000, endDate: Date.now() }
    : { startDate: Date.now() - 30 * 86400000, endDate: Date.now() };

  const ventes = useQuery(api.ventes.listVentes, { startDate, endDate });
  const stats = useQuery(api.ventes.ventesStats, { startDate, endDate });

  const PAYMENT_LABELS: Record<string, string> = {
    especes: "Espèces", cb: "Carte bancaire", cheque: "Chèque",
    cheque_cadeau: "Chèque cadeau", virement: "Virement",
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["7j", "30j"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${range === r ? "bg-[var(--crm-surface-2)] text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}>
            {r === "7j" ? "7 jours" : "30 jours"}
          </button>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Ventes</p>
            <p className="mt-0.5 text-xl font-bold text-zinc-100">{stats.count}</p>
          </div>
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Articles vendus</p>
            <p className="mt-0.5 text-xl font-bold text-zinc-100">{stats.totalArticles}</p>
          </div>
          <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs text-zinc-500">Chiffre d'affaires</p>
            <p className="mt-0.5 text-xl font-bold text-emerald-400">{formatPrice(stats.totalRevenue)}</p>
          </div>
        </div>
      )}

      {ventes === undefined ? (
        <p className="text-sm text-zinc-500">Chargement…</p>
      ) : ventes.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune vente sur cette période.</p>
      ) : (
        <div className="space-y-2">
          {ventes.map((v) => (
            <div key={v._id} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-brand-400">{v.receiptNumber}</span>
                  <span className="text-xs text-zinc-500">{PAYMENT_LABELS[v.paymentMethod]}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                  {v.items.length} article{v.items.length > 1 ? "s" : ""} · {new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <p className="text-lg font-bold text-zinc-100 shrink-0">{formatPrice(v.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
