import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useClerk, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  Radio,
  Save,
  Settings,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MessageThread } from "../../components/MessageThread";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";

const CONTAINER = "mx-auto w-full max-w-5xl px-5 py-8 sm:px-7 lg:px-8";

const TYPE_LABELS: Record<string, string> = {
  article: "Boutique",
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  velo: "Vélo",
};

const STAGE_STEPS = [
  { key: "nouveau", label: "Demande reçue" },
  { key: "validation", label: "Validation" },
  { key: "planifie", label: "Planifiée" },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Layout ────────────────────────────────────────────────────────────────

const TABS = [
  { to: "/compte", end: true, icon: User, label: "Informations" },
  { to: "/compte/commandes", icon: Package, label: "Commandes" },
  { to: "/compte/messagerie", icon: MessageSquare, label: "Messagerie" },
  { to: "/compte/parametres", icon: Settings, label: "Paramètres" },
];

export function AccountLayout() {
  return (
    <>
      <SignedOut>
        <div className={`${CONTAINER} flex flex-col items-center gap-5 py-20 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10">
            <User className="h-8 w-8 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-950">Connectez-vous à votre compte</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Suivez vos demandes, échangez avec notre équipe et gérez vos informations.
            </p>
          </div>
          <SignInButton mode="modal">
            <button className="rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,16,79,0.28)] transition hover:-translate-y-0.5">
              Se connecter / S'inscrire
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className={CONTAINER}>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Mon compte</h1>
          <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
            {TABS.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </SignedIn>
    </>
  );
}

// ─── Informations personnelles ──────────────────────────────────────────────

export function AccountInfo() {
  const { user } = useUser();
  const profile = useQuery(api.users.getMyProfile);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        postalCode: profile.postalCode ?? "",
        city: profile.city ?? "",
      });
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof form, placeholder = "") => (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Adresse e-mail</p>
        <p className="mt-1 text-sm font-medium text-zinc-900">
          {user?.primaryEmailAddress?.emailAddress ?? "—"}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Gérez votre e-mail et votre mot de passe dans l'onglet Paramètres.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("Prénom", "firstName")}
        {field("Nom", "lastName")}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Téléphone
        </label>
        <PhoneInput
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="06 12 34 56 78"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Adresse
        </label>
        <AddressAutocomplete
          value={form.address}
          onValueChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onSelect={(a) =>
            setForm((f) => ({
              ...f,
              address: a.address,
              postalCode: a.postalCode,
              city: a.city,
            }))
          }
          placeholder="Commencez à saisir l'adresse…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Code postal", "postalCode")}
        {field("Ville", "city")}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Enregistré
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Commandes ───────────────────────────────────────────────────────────────

type RequestTypeFilter = "all" | "article" | "aerogommage" | "collecte" | "velo";

function StatusProgress({
  stage,
  outcome,
  completedSteps,
  totalSteps,
}: {
  stage: string;
  outcome: string;
  completedSteps: number;
  totalSteps: number;
}) {
  if (outcome === "perdue") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
        Clôturée
      </span>
    );
  }
  const activeIndex = STAGE_STEPS.findIndex((s) => s.key === stage);
  const done = outcome === "gagnee";
  return (
    <div className="flex items-center gap-1.5">
      {STAGE_STEPS.map((s, i) => {
        const reached = done || i <= activeIndex;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${reached ? "bg-brand-500" : "bg-zinc-200"}`}
            />
            <span className={`text-[11px] ${reached ? "text-zinc-700" : "text-zinc-400"}`}>
              {s.label}
            </span>
            {i < STAGE_STEPS.length - 1 && <span className="text-zinc-300">·</span>}
          </div>
        );
      })}
      {totalSteps > 0 && (
        <span className="ml-1 text-[11px] text-zinc-400">
          ({completedSteps}/{totalSteps})
        </span>
      )}
    </div>
  );
}

export function AccountOrders() {
  const [filter, setFilter] = useState<RequestTypeFilter>("all");
  const requests = useQuery(api.users.listMyRequests, {});

  const types = useMemo(() => {
    const present = new Set((requests ?? []).map((r) => r.type));
    return (["all", "article", "aerogommage", "collecte", "velo"] as RequestTypeFilter[]).filter(
      (t) => t === "all" || present.has(t as never),
    );
  }, [requests]);

  const filtered = (requests ?? []).filter((r) => filter === "all" || r.type === filter);

  if (requests === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
        <Package className="mx-auto h-9 w-9 text-zinc-300" />
        <p className="mt-3 font-semibold text-zinc-700">Aucune demande pour l'instant</p>
        <p className="mt-1 text-sm text-zinc-500">
          Vos réservations boutique, demandes d'aérogommage ou de collecte apparaîtront ici.
        </p>
        <Link
          to="/boutique"
          className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {types.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                filter === t
                  ? "bg-brand-500 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {t === "all" ? "Toutes" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((r) => (
          <Link
            key={r._id}
            to={`/compte/commandes/${r._id}`}
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
              {r.type === "collecte" ? <Truck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-zinc-900">{TYPE_LABELS[r.type]}</p>
                {r.reference && <span className="text-xs text-zinc-400">#{r.reference}</span>}
                {r.unreadMessages > 0 && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {r.unreadMessages} msg
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">Demande du {formatDate(r.createdAt)}</p>
              <div className="mt-2">
                <StatusProgress
                  stage={r.stage}
                  outcome={r.outcome}
                  completedSteps={r.completedSteps}
                  totalSteps={r.processSteps.length}
                />
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Détail d'une commande ────────────────────────────────────────────────────

export function AccountOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const request = useQuery(
    api.users.getMyRequest,
    id ? { requestId: id as Id<"requests"> } : "skip",
  );

  if (request === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }
  if (request === null) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
        Demande introuvable.
        <div className="mt-3">
          <Link to="/compte/commandes" className="font-semibold text-brand-600">
            Retour aux commandes
          </Link>
        </div>
      </div>
    );
  }

  const activeIndex = STAGE_STEPS.findIndex((s) => s.key === request.stage);
  const liveTrackable =
    request.tracking?.shareToken &&
    (request.tracking.tourneeStatus === "planifiee" ||
      request.tracking.tourneeStatus === "en_cours");

  return (
    <div className="space-y-5">
      <Link
        to="/compte/commandes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes commandes
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Left: status + info */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {TYPE_LABELS[request.type]}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-zinc-950">
                  Demande {request.reference ? `#${request.reference}` : ""}
                </h2>
              </div>
            </div>

            {/* Stage timeline */}
            <div className="mt-5 space-y-3">
              {STAGE_STEPS.map((s, i) => {
                const reached = request.outcome === "gagnee" || i <= activeIndex;
                const current = i === activeIndex && request.outcome === "open";
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        reached ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {reached ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-sm ${current ? "font-bold text-zinc-900" : reached ? "font-medium text-zinc-700" : "text-zinc-400"}`}
                    >
                      {s.label}
                      {current && " — en cours"}
                    </span>
                  </div>
                );
              })}
            </div>

            {request.processSteps.length > 0 && (
              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>Avancement du traitement</span>
                  <span>
                    {request.completedSteps}/{request.processSteps.length}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{
                      width: `${(request.completedSteps / Math.max(1, request.processSteps.length)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {request.scheduledDate && (
              <p className="mt-4 text-sm text-zinc-600">
                <span className="font-semibold">Date planifiée :</span> {formatDate(request.scheduledDate)}
              </p>
            )}
            {request.quoteAmount != null && (
              <p className="mt-1 text-sm text-zinc-600">
                <span className="font-semibold">Devis :</span> {request.quoteAmount.toFixed(2)} €
              </p>
            )}
          </div>

          {/* Live delivery tracking for collecte */}
          {request.type === "collecte" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-center gap-2 text-zinc-900">
                <Truck className="h-4 w-4" />
                <p className="text-sm font-semibold">Suivi de la collecte</p>
              </div>
              {liveTrackable ? (
                <Link
                  to={`/suivi/${request.tracking!.shareToken}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <Radio className="h-4 w-4" />
                  Suivre la livraison en temps réel
                </Link>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">
                  Le suivi en temps réel sera disponible ici dès que votre collecte sera planifiée
                  dans une tournée.
                </p>
              )}
            </div>
          )}

          {request.comment && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Votre message initial
              </p>
              <p className="mt-1.5 text-sm text-zinc-700">{request.comment}</p>
            </div>
          )}
        </div>

        {/* Right: messaging */}
        <div className="flex h-[560px] flex-col">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-800">Messagerie</p>
          </div>
          <div className="min-h-0 flex-1">
            <MessageThread requestId={request._id} viewerRole="client" theme="light" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Messagerie (liste des conversations) ─────────────────────────────────────

export function AccountMessages() {
  const requests = useQuery(api.users.listMyRequests, {});

  if (requests === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  const conversations = requests.filter((r) => r.messageCount > 0);

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
        <MessageSquare className="mx-auto h-9 w-9 text-zinc-300" />
        <p className="mt-3 font-semibold text-zinc-700">Aucune conversation</p>
        <p className="mt-1 text-sm text-zinc-500">
          Ouvrez une de vos commandes pour échanger avec notre équipe.
        </p>
        <Link
          to="/compte/commandes"
          className="mt-4 inline-block rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          Voir mes commandes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((r) => (
        <Link
          key={r._id}
          to={`/compte/commandes/${r._id}`}
          className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-zinc-900">{TYPE_LABELS[r.type]}</p>
              {r.reference && <span className="text-xs text-zinc-400">#{r.reference}</span>}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              {r.messageCount} message{r.messageCount > 1 ? "s" : ""}
            </p>
          </div>
          {r.unreadMessages > 0 && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
              {r.unreadMessages}
            </span>
          )}
          <ChevronRight className="h-5 w-5 shrink-0 text-zinc-300" />
        </Link>
      ))}
    </div>
  );
}

// ─── Paramètres ───────────────────────────────────────────────────────────────

export function AccountSettings() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2 text-zinc-900">
          <ShieldCheck className="h-4 w-4" />
          <p className="text-sm font-semibold">Connexion & sécurité</p>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {user?.primaryEmailAddress?.emailAddress}
        </p>
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <Settings className="h-4 w-4" />
          Gérer e-mail et mot de passe
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Session</p>
        <p className="mt-1 text-sm text-zinc-500">Déconnectez-vous de cet appareil.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
