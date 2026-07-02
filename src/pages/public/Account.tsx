import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useClerk, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ImagePlus,
  LayoutGrid,
  Loader2,
  LogOut,
  MessageSquare,
  Package,
  Save,
  Settings,
  ShieldCheck,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { MyAppsGrid, useMyApps } from "../../components/MyApps";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MessageThread } from "../../components/MessageThread";
import { RequestDocumentsPanel } from "../../components/RequestDocumentsPanel";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { LiveDeliveryTracking } from "../../components/public/LiveDeliveryTracking";
import { useUpload } from "../../lib/useUpload";
import { COLLECTE_CATEGORY_BY_KEY } from "../../lib/constants";

const CONTAINER = "mx-auto w-full max-w-5xl px-5 py-8 sm:px-7 lg:px-8";

const TYPE_LABELS: Record<string, string> = {
  article: "Boutique",
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  velo: "Vélo",
  livraison: "Livraison",
};

const STATUS_FLOW = [
  { key: "nouveau", label: "Demande reçue" },
  { key: "validation", label: "Validation" },
  { key: "planifie", label: "Planifiée" },
  { key: "termine", label: "Terminée" },
];

type ClientStatus = {
  key: string;
  label: string;
  index: number;
  cancelled: boolean;
};

type AccountRequest = NonNullable<ReturnType<typeof useQuery<typeof api.users.getMyRequest>>>;

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
  const myApps = useMyApps();
  const showApps = Boolean(myApps && myApps.length > 0);
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
            {showApps ? (
              <NavLink
                to="/compte/applications"
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`
                }
              >
                <LayoutGrid className="h-4 w-4" />
                Mes applications
              </NavLink>
            ) : null}
          </nav>
          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </SignedIn>
    </>
  );
}

// ─── Mes applications ────────────────────────────────────────────────────────

export function AccountApps() {
  return <MyAppsGrid />;
}

// ─── Informations personnelles ──────────────────────────────────────────────

export function AccountInfo() {
  const { user } = useUser();
  const photoRef = useRef<HTMLInputElement>(null);
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  async function handlePhoto(file?: File) {
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
    } finally {
      setUploadingPhoto(false);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-xl font-semibold text-white">
            {user?.imageUrl ? <img src={user.imageUrl} alt="" className="h-full w-full object-cover" /> : (user?.fullName ?? "Moi").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">{user?.fullName ?? "Mon profil"}</p>
            <p className="text-sm text-zinc-500">{user?.primaryEmailAddress?.emailAddress}</p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} />
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              disabled={uploadingPhoto}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {uploadingPhoto ? "Envoi..." : "Changer la photo"}
            </button>
          </div>
        </div>
      </div>

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

function StatusProgress({ status }: { status: ClientStatus }) {
  if (status.cancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-500">
        Annulée
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STATUS_FLOW.map((s, i) => {
        const reached = i <= status.index;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${reached ? "bg-brand-500" : "bg-zinc-200"}`} />
            <span className={`text-[11px] ${reached ? "text-zinc-700" : "text-zinc-400"}`}>
              {s.label}
            </span>
            {i < STATUS_FLOW.length - 1 && <span className="text-zinc-300">·</span>}
          </div>
        );
      })}
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
            {r.type === "article" && r.imageUrl ? (
              <img
                src={r.imageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                {r.type === "collecte" ? (
                  <Truck className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
            )}
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
                <StatusProgress status={r.status} />
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

  const status = request.status as ClientStatus;
  const liveTrackable =
    request.tracking?.shareToken && request.tracking.tourneeStatus === "en_cours";

  return (
    <div className="space-y-5">
      <Link
        to="/compte/commandes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes commandes
      </Link>

      {/* Header + horizontal status tracker (Amazon-style) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              {TYPE_LABELS[request.type]}
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-zinc-950">
              Demande {request.reference ? `#${request.reference}` : ""}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">Créée le {formatDate(request.createdAt)}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status.cancelled ? "bg-zinc-100 text-zinc-500" : "bg-brand-500/10 text-brand-600"
            }`}
          >
            {status.cancelled ? "Annulée" : status.label}
          </span>
        </div>

        {status.cancelled ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-zinc-100 p-4">
            <XCircle className="h-5 w-5 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-600">
              Cette demande a été annulée.
            </span>
          </div>
        ) : (
          <div className="mt-6 flex items-start">
            {STATUS_FLOW.map((s, i) => {
              const reached = i <= status.index;
              const current = i === status.index;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center">
                  <div className="flex w-full items-center justify-center">
                    <div
                      className={`h-0.5 flex-1 ${
                        i === 0 ? "invisible" : i <= status.index ? "bg-brand-500" : "bg-zinc-200"
                      }`}
                    />
                    <div
                      className={`mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        reached ? "bg-brand-500 text-white" : "bg-zinc-100 text-zinc-400"
                      } ${current ? "ring-4 ring-brand-500/15" : ""}`}
                    >
                      {reached ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </div>
                    <div
                      className={`h-0.5 flex-1 ${
                        i === STATUS_FLOW.length - 1
                          ? "invisible"
                          : i < status.index
                            ? "bg-brand-500"
                            : "bg-zinc-200"
                      }`}
                    />
                  </div>
                  <span
                    className={`mt-2 text-center text-[11px] sm:text-xs ${
                      current
                        ? "font-bold text-zinc-900"
                        : reached
                          ? "font-medium text-zinc-600"
                          : "text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {!status.cancelled && (request.scheduledDate || request.quoteAmount != null) && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
            {request.scheduledDate && (
              <p>
                <span className="font-semibold">Date planifiée :</span>{" "}
                {formatDate(request.scheduledDate)}
              </p>
            )}
            {request.quoteAmount != null && (
              <p>
                <span className="font-semibold">Devis :</span> {request.quoteAmount.toFixed(2)} €
              </p>
            )}
          </div>
        )}
      </div>

      {/* Live delivery tracking — auto-embedded once a collecte tour is active */}
      {request.type === "collecte" &&
        (liveTrackable ? (
          <LiveDeliveryTracking token={request.tracking!.shareToken} />
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2 text-zinc-900">
              <Truck className="h-4 w-4" />
              <p className="text-sm font-semibold">Suivi de la collecte</p>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Le suivi en temps réel s'affichera ici automatiquement dès que votre collecte sera
              démarrée par le conducteur.
            </p>
          </div>
        ))}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Recap */}
        <div className="space-y-5">
          {request.articles.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Article{request.articles.length > 1 ? "s" : ""} réservé
                {request.articles.length > 1 ? "s" : ""}
              </p>
              <div className="mt-3 space-y-3">
                {request.articles.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
                        <Package className="h-5 w-5 text-zinc-400" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-zinc-800">{a.title}</p>
                  </div>
                ))}
              </div>
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

          <ClientFilesTabs request={request} />
        </div>

        {/* Messaging */}
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

function ClientFilesTabs({ request }: { request: AccountRequest }) {
  const [tab, setTab] = useState<"documents" | "photos">("documents");
  const canUploadPhotos = request.type === "aerogommage" || request.type === "collecte";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-2">
      <div className="mb-3 flex gap-1 rounded-xl bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setTab("documents")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === "documents" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
          }`}
        >
          Documents
        </button>
        {canUploadPhotos && (
          <button
            type="button"
            onClick={() => setTab("photos")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === "photos" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"
            }`}
          >
            Photos
          </button>
        )}
      </div>
      {tab === "documents" ? (
        <RequestDocumentsPanel requestId={request._id} theme="light" viewerRole="client" />
      ) : (
        <ClientRequestPhotosPanel request={request} />
      )}
    </div>
  );
}

function ClientRequestPhotosPanel({ request }: { request: AccountRequest }) {
  const upload = useUpload();
  const addAeroPhotos = useMutation(api.users.addMyAerogommageItemPhotos);
  const addCollectePhotos = useMutation(api.users.addMyCollecteCategoryPhotos);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedAeroIndex, setSelectedAeroIndex] = useState(0);
  const collecteCategories =
    request.collecte?.objectCategories && request.collecte.objectCategories.length > 0
      ? request.collecte.objectCategories
      : ["objets"];
  const [selectedCategory, setSelectedCategory] = useState(collecteCategories[0] ?? "objets");

  if (request.type !== "aerogommage" && request.type !== "collecte") return null;

  const aeroItems = request.aerogommage ?? [];
  const currentAeroItem = aeroItems[Math.min(selectedAeroIndex, Math.max(aeroItems.length - 1, 0))];
  const currentCollectePhotos =
    request.collecte?.categoryPhotos.find((entry) => entry.category === selectedCategory)?.urls ?? [];

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const storageIds: Id<"_storage">[] = [];
      for (const file of Array.from(files)) {
        storageIds.push(await upload(file));
      }
      if (request.type === "aerogommage") {
        await addAeroPhotos({
          requestId: request._id,
          itemIndex: selectedAeroIndex,
          storageIds,
        });
      } else {
        await addCollectePhotos({
          requestId: request._id,
          category: selectedCategory,
          storageIds,
        });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const existingUrls =
    request.type === "aerogommage" ? currentAeroItem?.photoUrls ?? [] : currentCollectePhotos;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Photos de la demande</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Elles seront visibles par notre équipe dans votre fiche de demande.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || (request.type === "aerogommage" && aeroItems.length === 0)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Ajouter des photos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {request.type === "aerogommage" && aeroItems.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {aeroItems.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedAeroIndex(index)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                index === selectedAeroIndex
                  ? "bg-brand-500 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {item.objectType || item.label || `Objet ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      {request.type === "collecte" && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {collecteCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === selectedCategory
                  ? "bg-brand-500 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {COLLECTE_CATEGORY_BY_KEY[category]?.label ?? "Objets à collecter"}
            </button>
          ))}
        </div>
      )}

      {existingUrls.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
          Aucune photo ajoutée pour le moment.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {existingUrls.map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100"
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
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
