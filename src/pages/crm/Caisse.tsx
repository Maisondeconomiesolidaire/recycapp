import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ScanLine, Plus, Trash2, CreditCard, Banknote, FileText,
  Check, Printer, Package, ShoppingCart,
  Loader2, Camera, Search, UserPlus, ArrowRight, Nfc,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { errorMessage } from "../../lib/convexError";
import { QrCode } from "../../components/ui/QrCode";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
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
          className="rounded-xl border border-[var(--crm-border-strong)] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-[var(--crm-surface-3)]"
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

/** Client de la vente. `null` = vente anonyme (aucune demande créée). */
interface SaleCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Vrai quand le compte vient d'être créé chez Clerk pour cette vente. */
  created?: boolean;
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

/**
 * Étapes de la vente, dans l'ordre.
 *
 * L'article vient EN PREMIER : en vitrine comme au comptoir, le client se
 * présente avec un objet en main. On le scanne pendant qu'on l'a sous les
 * yeux, on demande ses coordonnées ensuite.
 */
const STEPS = [
  { key: "articles" as const, label: "Articles" },
  { key: "client" as const, label: "Client" },
  { key: "paiement" as const, label: "Paiement" },
];

type Step = typeof STEPS[number]["key"];

type ClientMode = "existant" | "nouveau" | "anonyme";

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "caisse" | "historique";

export function Caisse() {
  const [tab, setTab] = useState<Tab>("caisse");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Magasin</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Caisse</h1>
      </div>

      <UnderlineTabs
        className="mb-6"
        items={[{ key: "caisse", label: "Nouvelle vente" }, { key: "historique", label: "Historique" }]}
        value={tab}
        onChange={setTab}
      />

      {tab === "caisse" ? <VentePanel /> : <HistoriquePanel />}
    </div>
  );
}

// ─── Vente : parcours en trois étapes ─────────────────────────────────────────

/**
 * Nouvelle vente, dans le même ordre qu'une commande en ligne : on sait D'ABORD
 * pour qui on vend, ensuite quoi, ensuite on encaisse.
 *
 * Connaître le client dès le départ est ce qui permet à la vente au comptoir de
 * produire une demande boutique — donc d'apparaître dans l'historique du client
 * et dans le CRM, exactement comme un achat en ligne retiré en boutique.
 */
function VentePanel() {
  const [step, setStep] = useState<Step>("articles");
  const [clientMode, setClientMode] = useState<ClientMode>("existant");
  const [customer, setCustomer] = useState<SaleCustomer | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("especes");

  const [paying, setPaying] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    receiptNumber: string;
    total: number;
    change?: number;
    requestId?: Id<"requests"> | null;
    customerName?: string;
  } | null>(null);

  const draftHydratedRef = useRef(false);
  const checkoutHandledRef = useRef<string | null>(null);

  const createVente = useMutation(api.ventes.createVente);
  const startTestCheckout = useAction(api.stripe.startTestCheckout);
  const confirmTestCheckout = useAction(api.stripe.confirmTestCheckout);

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const discount = Math.max(0, Number(discountInput) || 0);
  const total = Math.max(0, subtotal - discount);
  const tendered = Number(amountTendered) || 0;

  /* Reprise du panier après un aller-retour vers Stripe (la page est quittée). */
  useEffect(() => {
    const rawDraft = window.localStorage.getItem(CAISSE_DRAFT_STORAGE_KEY);
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft) as {
          cart?: CartItem[];
          discountInput?: string;
          amountTendered?: string;
          paymentMethod?: PaymentMethod;
          customer?: SaleCustomer | null;
          step?: Step;
        };
        setCart(draft.cart ?? []);
        setDiscountInput(draft.discountInput ?? "");
        setAmountTendered(draft.amountTendered ?? "");
        setPaymentMethod(draft.paymentMethod ?? "especes");
        setCustomer(draft.customer ?? null);
        if (draft.step) setStep(draft.step);
      } catch {
        window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
      }
    }
    draftHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) return;

    if (cart.length === 0 && !customer && step === "articles") {
      window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      CAISSE_DRAFT_STORAGE_KEY,
      JSON.stringify({ cart, discountInput, amountTendered, paymentMethod, customer, step }),
    );
  }, [amountTendered, cart, customer, discountInput, paymentMethod, step]);

  /* Retour de Stripe Checkout : la vente se termine ici. */
  useEffect(() => {
    if (!draftHydratedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get("stripe_status");
    const sessionId = params.get("session_id");
    const draftId = params.get("draft_id");

    if (stripeStatus === "cancelled") {
      setCheckoutMessage("Paiement par carte annulé. Le panier a été conservé.");
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
    setCheckoutMessage("Validation du paiement…");

    void confirmTestCheckout({
      draftId: draftId as Id<"stripeCheckoutDrafts">,
      sessionId,
    })
      .then((result) => {
        finishSale({
          receiptNumber: result.receiptNumber,
          total: result.total,
          change: result.change,
          requestId: result.requestId,
        });
        setCheckoutMessage(null);
      })
      .catch((error: unknown) => {
        setCheckoutMessage(errorMessage(error, "Le paiement n'a pas pu être validé."));
      })
      .finally(() => {
        setPaying(false);
        window.history.replaceState({}, "", window.location.pathname);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmTestCheckout]);

  function finishSale(result: {
    receiptNumber: string;
    total: number;
    change?: number;
    requestId?: Id<"requests"> | null;
  }) {
    setReceipt({
      ...result,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
    });
    setCart([]);
    setDiscountInput("");
    setAmountTendered("");
    setPaymentMethod("especes");
    setCustomer(null);
    setStep("articles");
    window.localStorage.removeItem(CAISSE_DRAFT_STORAGE_KEY);
  }

  async function handlePay() {
    if (cart.length === 0 || paying) return;
    setPaying(true);
    setCheckoutMessage(null);

    const saleCustomer = customer
      ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone || undefined,
        }
      : undefined;

    try {
      if (paymentMethod === "cb") {
        // Stripe Checkout quitte le CRM : le panier ET le client sont déjà
        // mémorisés, et la vente se terminera au retour.
        const result = await startTestCheckout({
          items: cart.map((c) => ({
            articleId: c.articleId,
            title: c.title,
            price: c.price,
          })),
          discountAmount: discount > 0 ? discount : undefined,
          returnUrl: window.location.href,
          customer: saleCustomer,
        });
        window.location.assign(result.checkoutUrl);
        return;
      }

      const result = await createVente({
        items: cart.map((c) => ({ articleId: c.articleId, title: c.title, price: c.price })),
        discountAmount: discount > 0 ? discount : undefined,
        paymentMethod,
        amountTendered: paymentMethod === "especes" && tendered > 0 ? tendered : undefined,
        customer: saleCustomer,
      });
      finishSale(result);
    } catch (error) {
      setCheckoutMessage(errorMessage(error, "Encaissement impossible."));
    } finally {
      setPaying(false);
    }
  }

  if (receipt) {
    return <ReceiptView receipt={receipt} onClose={() => setReceipt(null)} />;
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <StepBar
        current={stepIndex}
        customer={customer}
        cartCount={cart.length}
        total={total}
        onGoTo={(key) => {
          const target = STEPS.findIndex((s) => s.key === key);
          if (target <= stepIndex) setStep(key);
        }}
      />

      {checkoutMessage && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {checkoutMessage}
        </div>
      )}

      {step === "articles" && (
        <ArticlesStep
          cart={cart}
          onCart={setCart}
          onNext={() => setStep("client")}
        />
      )}

      {step === "client" && (
        <ClientStep
          mode={clientMode}
          onModeChange={setClientMode}
          customer={customer}
          onCustomer={setCustomer}
          onBack={() => setStep("articles")}
          onNext={() => setStep("paiement")}
        />
      )}

      {step === "paiement" && (
        <PaiementStep
          cart={cart}
          customer={customer}
          subtotal={subtotal}
          discount={discount}
          total={total}
          discountInput={discountInput}
          onDiscountInput={setDiscountInput}
          amountTendered={amountTendered}
          onAmountTendered={setAmountTendered}
          paymentMethod={paymentMethod}
          onPaymentMethod={setPaymentMethod}
          paying={paying}
          onPay={handlePay}
          onBack={() => setStep("client")}
          onTerminalPaid={(paymentIntentId) =>
            handleTerminalPaid(paymentIntentId)
          }
        />
      )}
    </div>
  );

  /** Encaissement sans contact confirmé par le lecteur : on écrit la vente. */
  async function handleTerminalPaid(paymentIntentId: string) {
    setPaying(true);
    setCheckoutMessage(null);
    try {
      const result = await createVente({
        items: cart.map((c) => ({ articleId: c.articleId, title: c.title, price: c.price })),
        discountAmount: discount > 0 ? discount : undefined,
        paymentMethod: "cb",
        customer: customer
          ? {
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone || undefined,
            }
          : undefined,
        stripePaymentIntentId: paymentIntentId,
      });
      finishSale(result);
    } catch (error) {
      setCheckoutMessage(
        errorMessage(
          error,
          "Le paiement a été encaissé mais la vente n'a pas pu être enregistrée. Notez le montant et prévenez un responsable.",
        ),
      );
    } finally {
      setPaying(false);
    }
  }
}

/** Fil d'Ariane des trois étapes, avec le récapitulatif de ce qui est déjà su. */
function StepBar({
  current,
  customer,
  cartCount,
  total,
  onGoTo,
}: {
  current: number;
  customer: SaleCustomer | null;
  cartCount: number;
  total: number;
  onGoTo: (step: Step) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-2">
      {STEPS.map((s, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onGoTo(s.key)}
            disabled={index > current}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              active
                ? "bg-brand-500 text-white"
                : done
                  ? "text-zinc-200 hover:bg-[var(--crm-surface-2)]"
                  : "text-zinc-600"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                active
                  ? "bg-white/20"
                  : done
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-[var(--crm-surface-3)]"
              }`}
            >
              {done ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            {s.label}
            {s.key === "client" && customer && (
              <span className="max-w-[14rem] truncate text-xs font-normal opacity-80">
                · {customer.firstName} {customer.lastName}
              </span>
            )}
            {s.key === "articles" && cartCount > 0 && (
              <span className="text-xs font-normal opacity-80">· {cartCount}</span>
            )}
          </button>
        );
      })}
      <span className="ml-auto px-3 text-lg font-bold text-zinc-100">
        {formatPrice(total)}
      </span>
    </div>
  );
}

// ─── Étape 2 : le client ──────────────────────────────────────────────────────

function ClientStep({
  mode,
  onModeChange,
  customer,
  onCustomer,
  onBack,
  onNext,
}: {
  mode: ClientMode;
  onModeChange: (mode: ClientMode) => void;
  customer: SaleCustomer | null;
  onCustomer: (customer: SaleCustomer | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const createAccount = useAction(api.crmClients.createCustomerAccount);
  const results = useQuery(
    api.clients.search,
    search.trim().length >= 2 ? { searchText: search.trim() } : "skip",
  );

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    setError("");
    setWarning("");
    try {
      const result = await createAccount({ firstName, lastName, email, phone });
      onCustomer({
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        phone,
        created: !result.reused,
      });
      if (result.warning) setWarning(result.warning);
      if (result.reused) {
        setWarning("Cette adresse avait déjà un compte : la vente y est rattachée.");
      }
      onNext();
    } catch (err) {
      setError(errorMessage(err, "Création du client impossible."));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-6">
      <h2 className="text-lg font-bold text-zinc-100">Pour qui est cette vente ?</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Rattacher la vente à un client crée une demande boutique achevée dans le
        CRM, et l'achat apparaît dans son historique.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            { key: "existant" as const, label: "Client existant", icon: Search },
            { key: "nouveau" as const, label: "Nouveau client", icon: UserPlus },
            { key: "anonyme" as const, label: "Sans client", icon: ShoppingCart },
          ]
        ).map((option) => {
          const Icon = option.icon;
          const active = mode === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onModeChange(option.key);
                onCustomer(null);
                setError("");
                setWarning("");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-brand-500 text-white"
                  : "border border-[var(--crm-border)] text-zinc-300 hover:bg-[var(--crm-surface-2)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      {mode === "existant" && (
        <div className="mt-5 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, nom ou prénom du client…"
            autoFocus
            className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {search.trim().length >= 2 && (
            results === undefined ? (
              <p className="text-sm text-zinc-500">Recherche…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucun client trouvé. Passez par « Nouveau client ».
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((client) => (
                  <button
                    key={client.email}
                    type="button"
                    onClick={() => {
                      onCustomer({
                        firstName: client.firstName,
                        lastName: client.lastName,
                        email: client.email,
                        phone: client.phone,
                      });
                      onNext();
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-left transition hover:bg-[var(--crm-surface-3)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {client.email}
                        {client.phone ? ` · ${client.phone}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {client.requestCount} demande{client.requestCount > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {mode === "nouveau" && (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <CaisseInput label="Prénom" value={firstName} onChange={setFirstName} autoFocus />
            <CaisseInput label="Nom" value={lastName} onChange={setLastName} />
          </div>
          <CaisseInput label="Email" type="email" value={email} onChange={setEmail} />
          <CaisseInput label="Téléphone (facultatif)" type="tel" value={phone} onChange={setPhone} />
          <p className="text-xs text-zinc-500">
            Un compte est créé sans mot de passe : le client pourra se connecter
            plus tard avec cette adresse et retrouver ses achats.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {warning && <p className="text-sm text-amber-300">{warning}</p>}
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !firstName.trim() || !lastName.trim() || !email.trim()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white transition disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Créer le client et continuer
          </button>
        </div>
      )}

      {mode === "anonyme" && (
        <div className="mt-5">
          <p className="text-sm text-zinc-400">
            La vente sera enregistrée sans client : un ticket de caisse, mais
            aucune demande dans le CRM ni historique client.
          </p>
          <button
            type="button"
            onClick={() => {
              onCustomer(null);
              onNext();
            }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-bold text-white transition"
          >
            Continuer sans client
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {customer && mode !== "nouveau" && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <Check className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-emerald-200">
            {customer.firstName} {customer.lastName} · {customer.email}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-5 rounded-xl border border-[var(--crm-border)] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-[var(--crm-surface-2)]"
      >
        Retour aux articles
      </button>
    </div>
  );
}

// ─── Étape 1 : les articles ───────────────────────────────────────────────────

function ArticlesStep({
  cart,
  onCart,
  onNext,
}: {
  cart: CartItem[];
  onCart: (updater: (prev: CartItem[]) => CartItem[]) => void;
  onNext: () => void;
}) {
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupRef, setLookupRef] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

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
    reference?: string;
  }) {
    onCart((prev) => {
      if (prev.some((item) => item.articleId === article._id)) return prev;
      return [
        ...prev,
        {
          articleId: article._id,
          title: article.title,
          price: article.price,
          reference: article.reference ?? article.internalReference ?? "",
          imageUrl: article.imageUrls?.[0],
        },
      ];
    });
    setScanInput("");
  }

  useEffect(() => {
    if (lookupRef === null || foundArticle === undefined) return;

    if (foundArticle === null) {
      setNotFound(true);
      window.setTimeout(() => setNotFound(false), 2000);
    } else if (foundArticle.status === "disponible") {
      addArticleToCart(foundArticle);
    }
    setLookupRef(null);
    setScanning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundArticle, lookupRef]);

  function handleScan(event: React.FormEvent) {
    event.preventDefault();
    if (!scanInput.trim()) return;
    setScanning(true);
    setNotFound(false);
    setLookupRef(scanInput.trim());
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      {cameraOpen && (
        <ErrorBoundary fallback={() => <ScannerError onClose={() => setCameraOpen(false)} />}>
          <Suspense fallback={<ScannerLoading />}>
            <CameraScanner
              onDetected={(code) => {
                setScanning(true);
                setNotFound(false);
                setScanInput(code);
                setLookupRef(code);
              }}
              onClose={() => setCameraOpen(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-brand-400" />
              <span className="text-sm font-semibold text-zinc-200">
                Scanner un QR code, saisir une référence ou chercher par nom
              </span>
              {notFound && (
                <span className="ml-auto text-xs text-red-400">Référence introuvable</span>
              )}
            </div>
            <form onSubmit={handleScan} className="flex gap-2">
              <input
                ref={scanRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Référence ou nom de l'article…"
                autoFocus
                className="flex-1 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--crm-border)] px-3 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-[var(--crm-surface-2)]"
                title="Scanner avec la caméra"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!scanInput.trim() || scanning}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
              >
                {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </button>
            </form>

            {suggestions && suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                {suggestions.map((article) => (
                  <button
                    key={article._id}
                    type="button"
                    onClick={() => addArticleToCart(article)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-left transition hover:bg-[var(--crm-surface-3)]"
                  >
                    {article.imageUrls[0] ? (
                      <img
                        src={article.imageUrls[0]}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--crm-surface-3)]">
                        <Package className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{article.title}</p>
                      <p className="font-mono text-xs text-zinc-500">{article.reference}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-zinc-100">
                      {formatPrice(article.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-200">
              Panier · {cart.length} article{cart.length > 1 ? "s" : ""}
            </p>
            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-zinc-700" />
                <p className="mt-2 text-sm text-zinc-500">
                  Scannez ou cherchez un article pour commencer.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.articleId}
                    className="flex items-center gap-3 rounded-xl bg-[var(--crm-surface-2)] px-3 py-2.5"
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--crm-surface-3)]">
                        <Package className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
                      <p className="font-mono text-xs text-zinc-500">{item.reference}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-zinc-100">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCart((prev) => prev.filter((c) => c.articleId !== item.articleId))}
                      className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                      title="Retirer du panier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Total</span>
              <span className="text-2xl font-extrabold text-zinc-100">{formatPrice(total)}</span>
            </div>
            <button
              type="button"
              onClick={onNext}
              disabled={cart.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            >
              Renseigner le client
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Étape 3 : le paiement ────────────────────────────────────────────────────

function PaiementStep({
  cart,
  customer,
  subtotal,
  discount,
  total,
  discountInput,
  onDiscountInput,
  amountTendered,
  onAmountTendered,
  paymentMethod,
  onPaymentMethod,
  paying,
  onPay,
  onBack,
  onTerminalPaid,
}: {
  cart: CartItem[];
  customer: SaleCustomer | null;
  subtotal: number;
  discount: number;
  total: number;
  discountInput: string;
  onDiscountInput: (value: string) => void;
  amountTendered: string;
  onAmountTendered: (value: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethod: (method: PaymentMethod) => void;
  paying: boolean;
  onPay: () => void;
  onBack: () => void;
  onTerminalPaid: (paymentIntentId: string) => void;
}) {
  const change = (Number(amountTendered) || 0) - total;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <TerminalPayment
          total={total}
          disabled={paying || cart.length === 0}
          onPaid={onTerminalPaid}
        />

        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-200">Autres moyens de paiement</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const active = paymentMethod === method.key;
              return (
                <button
                  key={method.key}
                  type="button"
                  onClick={() => onPaymentMethod(method.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-500 text-white"
                      : "border border-[var(--crm-border)] text-zinc-300 hover:bg-[var(--crm-surface-2)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {method.label}
                </button>
              );
            })}
          </div>

          {paymentMethod === "especes" && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs text-zinc-500">Montant reçu</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountTendered}
                onChange={(e) => onAmountTendered(e.target.value)}
                placeholder={total.toFixed(2)}
                className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {change > 0 && (
                <p className="mt-2 text-sm text-emerald-400">
                  Monnaie à rendre : <strong>{formatPrice(change)}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5">
          <p className="text-sm font-semibold text-zinc-200">Récapitulatif</p>

          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>{cart.length} article{cart.length > 1 ? "s" : ""}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div>
              <label className="mb-1.5 mt-2 block text-xs text-zinc-500">Remise (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountInput}
                onChange={(e) => onDiscountInput(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber-300">
                <span>Remise</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--crm-border)] pt-4">
            <span className="text-sm text-zinc-400">À payer</span>
            <span className="text-2xl font-extrabold text-zinc-100">{formatPrice(total)}</span>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--crm-surface-2)] px-4 py-3 text-xs">
            {customer ? (
              <p className="text-zinc-300">
                Au nom de <strong>{customer.firstName} {customer.lastName}</strong>.
                Une demande boutique achevée sera créée.
              </p>
            ) : (
              <p className="text-zinc-500">
                Vente sans client : ticket de caisse uniquement, pas de demande.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onPay}
            disabled={paying || cart.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Encaisser {formatPrice(total)}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 w-full rounded-xl border border-[var(--crm-border)] py-3 text-sm font-semibold text-zinc-300 transition hover:bg-[var(--crm-surface-2)]"
          >
            Retour au client
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Encaissement sans contact sur un lecteur Stripe Terminal.
 *
 * Le montant part du CRM et s'affiche sur le lecteur : le vendeur ne saisit
 * aucune somme, donc aucun écart possible avec le panier.
 *
 * « Tap to Pay » — le téléphone du vendeur en guise de terminal — n'est pas
 * accessible depuis un navigateur : Stripe ne l'expose que par ses SDK iOS et
 * Android. Un téléphone enregistré comme lecteur depuis l'app Stripe apparaît
 * en revanche dans cette liste et fonctionne ici.
 */
function TerminalPayment({
  total,
  disabled,
  onPaid,
}: {
  total: number;
  disabled: boolean;
  onPaid: (paymentIntentId: string) => void;
}) {
  const listReaders = useAction(api.terminal.listReaders);
  const collect = useAction(api.terminal.collectOnReader);
  const paymentStatus = useAction(api.terminal.paymentStatus);
  const cancel = useAction(api.terminal.cancelOnReader);

  const [readers, setReaders] = useState<
    Array<{ id: string; label: string | null; status: string | null; deviceType: string | null }> | null
  >(null);
  const [readerId, setReaderId] = useState("");
  const [waiting, setWaiting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listReaders({})
      .then((result) => {
        if (cancelled) return;
        setReaders(result);
        if (result[0]) setReaderId(result[0].id);
      })
      .catch(() => {
        // Terminal injoignable : la caisse propose simplement les autres
        // moyens de paiement, sans détailler pourquoi.
        if (cancelled) return;
        setReaders([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCollect() {
    if (!readerId || waiting) return;
    setError("");
    try {
      const { paymentIntentId } = await collect({
        readerId,
        amount: total,
        description: "Vente en boutique",
      });
      setWaiting(paymentIntentId);

      // Le lecteur affiche le montant : on interroge Stripe jusqu'au verdict.
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const status = await paymentStatus({ paymentIntentId });
        if (status.status === "succeeded") {
          setWaiting(null);
          onPaid(paymentIntentId);
          return;
        }
        if (status.status === "canceled") {
          setWaiting(null);
          setError("Paiement annulé sur le terminal.");
          return;
        }
        if (status.lastError) {
          setWaiting(null);
          setError(status.lastError);
          return;
        }
      }
      setWaiting(null);
      setError("Le terminal n'a pas répondu.");
    } catch (err) {
      setWaiting(null);
      setError(errorMessage(err, "Encaissement sans contact impossible."));
    }
  }

  async function handleCancel() {
    if (!waiting) return;
    await cancel({ readerId, paymentIntentId: waiting }).catch(() => null);
    setWaiting(null);
  }

  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-5">
      <div className="flex items-center gap-2">
        <Nfc className="h-4 w-4 text-brand-400" />
        <p className="text-sm font-semibold text-zinc-200">Paiement sans contact</p>
      </div>

      {readers === null ? (
        <p className="mt-3 text-sm text-zinc-500">Recherche du terminal…</p>
      ) : readers.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Aucun terminal disponible. Encaissez sur le téléphone, puis validez la
          vente en « Carte bancaire ».
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {readers.length > 1 && (
          <select
            value={readerId}
            onChange={(e) => setReaderId(e.target.value)}
            className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {readers.map((reader) => (
              <option key={reader.id} value={reader.id}>
                {reader.label ?? reader.id}
                {reader.status ? ` · ${reader.status}` : ""}
              </option>
            ))}
          </select>
          )}

          {waiting ? (
            <div className="flex items-center gap-3 rounded-xl bg-brand-500/10 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              <p className="flex-1 text-sm text-zinc-200">
                {formatPrice(total)} affiché sur le terminal — le client peut payer.
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCollect}
              disabled={disabled || !readerId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            >
              <Nfc className="h-4 w-4" />
              Encaisser {formatPrice(total)} sans contact
            </button>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function CaisseInput({
  label,
  value,
  onChange,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-zinc-500">{label}</span>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </label>
  );
}

function ReceiptView({
  receipt,
  onClose,
}: {
  receipt: {
    receiptNumber: string;
    total: number;
    change?: number;
    requestId?: Id<"requests"> | null;
    customerName?: string;
  };
  onClose: () => void;
}) {
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
        {receipt.customerName && (
          <p className="text-sm text-zinc-300">
            Au nom de <strong>{receipt.customerName}</strong>
          </p>
        )}
        {receipt.requestId && (
          <Link
            to={`/crm/demandes?open=${receipt.requestId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 underline"
          >
            Voir la demande créée
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {receipt.change !== undefined && receipt.change > 0 && (
          <div className="rounded-xl bg-emerald-500/20 px-4 py-3">
            <p className="text-sm text-emerald-300">Monnaie rendue : <strong>{formatPrice(receipt.change)}</strong></p>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <QrCode value={receipt.receiptNumber} size={104} displayValue className="text-emerald-300" />
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

  // Les bornes DOIVENT être figées : calculées à chaque rendu, `Date.now()`
  // renvoyait des arguments différents à chaque fois, la requête se réabonnait
  // en boucle et l'historique restait bloqué sur « Chargement… ».
  const { startDate, endDate } = useMemo(() => {
    const now = Date.now();
    const days = range === "7j" ? 7 : 30;
    return { startDate: now - days * 86400000, endDate: now };
  }, [range]);

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
        <div className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-8 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-2 text-sm font-semibold text-zinc-300">
            Aucune vente sur cette période
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Les ventes encaissées en caisse apparaîtront ici.
          </p>
        </div>
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
