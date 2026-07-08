import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUpload } from "../../lib/useUpload";
import { downloadImage } from "../../lib/downloadImage";
import {
  CalendarDays,
  MapPin,
  PackageOpen,
  Pencil,
  Plus,
  XCircle,
  RotateCcw,
  Check,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Drawer } from "../ui/Drawer";
import { Button } from "../ui/Button";
import { ScheduleCalendarModal } from "./ScheduleCalendarModal";
import { Spinner } from "../ui/Spinner";
import { Select, Input, Textarea, Field } from "../ui/Field";
import { Checkbox } from "../ui/Field";
import { Lightbox } from "../ui/Lightbox";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { UnderlineTabs } from "../ui/UnderlineTabs";
import { MessageThread } from "../MessageThread";
import { RequestDocumentsPanel } from "../RequestDocumentsPanel";
import { useCrmAccess } from "./RequireCrmPermission";
import { canAccess } from "../../lib/crmPermissions";
import { usePersona } from "../../lib/persona";
import { formatRelative } from "../../lib/format";
import { Modal } from "../ui/Modal";
import { TypeBadge } from "./TypeBadge";
import { PhoneInput } from "../ui/PhoneInput";
import { RequestOriginBadge } from "./RequestOriginBadge";
import { C3QuoteCalculator } from "./C3QuoteCalculator";
import { AeroQuoteCalculator } from "./AeroQuoteCalculator";
import {
  OUTCOME_LABELS,
  COLLECTE_TYPE_OPTIONS,
  COLLECTE_TYPE_LABELS,
  COLLECTE_CATEGORIES,
  COLLECTE_CATEGORY_BY_KEY,
  CollecteType,
  TYPE_COLORS,
  SITE_LABELS,
  Site,
  AERO_OBJECT_TYPES,
  WOOD_TYPES,
  STRIPPING_OPTIONS,
  COATING_OPTIONS,
} from "../../lib/constants";
import { STEP } from "../../../convex/processes";
import { formatDateTime, formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";

type RequestDoc = NonNullable<ReturnType<typeof useQuery<typeof api.requests.get>>>;
type Tab = "demande" | "gestion" | "calculDevis" | "documents" | "client" | "messages";

/** Affiche la date programmée avec l'heure (sauf si minuit = heure non renseignée). */
function formatScheduledDate(timestamp: number) {
  const date = new Date(timestamp);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return format(
    date,
    hasTime ? "EEEE d MMMM yyyy 'à' HH'h'mm" : "EEEE d MMMM yyyy",
    { locale: fr },
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: "demande", label: "Demande" },
  { key: "gestion", label: "Gestion" },
  { key: "documents", label: "Documents" },
  { key: "client", label: "Client" },
  { key: "messages", label: "Messages" },
];

const C3_QUOTE_TAB = { key: "calculDevis", label: "Calcul devis" } as const;

const LOST_REASON_OPTIONS = [
  { value: "devis_refuse", label: "Devis refusé" },
  { value: "pas_de_retour_client", label: "Pas de retour client" },
  { value: "autre", label: "Autre (précisez)" },
] as const;

type LostReasonValue = (typeof LOST_REASON_OPTIONS)[number]["value"];

export function RequestDrawer({
  requestId,
  onClose,
}: {
  requestId: Id<"requests"> | null;
  onClose: () => void;
}) {
  const request = useQuery(
    api.requests.get,
    requestId ? { id: requestId } : "skip",
  );
  const setOutcome = useMutation(api.requests.setOutcome);
  const setComplete = useMutation(api.requests.setComplete);
  const deleteForever = useMutation(api.requests.deleteForever);
  const access = useCrmAccess();
  const canUpdate = canAccess(access, "demandes", "update");
  const canDeleteForever = access?.email === "lahmerselim@gmail.com";
  const [tab, setTab] = useState<Tab>("demande");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [lostReason, setLostReason] = useState<LostReasonValue | "">("");
  const [lostReasonDetails, setLostReasonDetails] = useState("");
  const [cancelError, setCancelError] = useState("");

  const open = requestId !== null;

  const collecteUndefined =
    request?.type === "collecte" &&
    (request.collecteType ?? "indefini") === "indefini";
  const hasQuoteCalculator =
    request?.type === "aerogommage" ||
    (request?.type === "collecte" && request.collecteType === "C3");
  const isC3Collecte = request?.type === "collecte" && request.collecteType === "C3";
  const visibleTabs = hasQuoteCalculator
    ? [TABS[0], TABS[1], C3_QUOTE_TAB, TABS[2], TABS[3], TABS[4]]
    : TABS;
  const activeTab = hasQuoteCalculator || tab !== "calculDevis" ? tab : "gestion";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="modal"
      panelClassName="border-0 shadow-[0_28px_90px_rgba(0,0,0,0.18)]"
      bodyClassName="p-0"
      headerClassName={request ? "border-b-0" : "border-b-0"}
      headerStyle={
        request ? { backgroundColor: TYPE_COLORS[request.type] } : undefined
      }
      closeButtonClassName={
        request
          ? "text-white/78 hover:bg-black/10 hover:text-white"
          : undefined
      }
      title={
        request ? (
          <div className="flex w-full items-center gap-3">
            <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              <TypeBadge
                type={request.type}
                collecteType={request.collecteType}
                size="sm"
                inverse
                prominent
              />
              <RequestOriginBadge origin={request.requestOrigin} inverse />
              <span className="text-sm text-white/88">
                {request.outcome === "open"
                  ? collecteUndefined
                    ? "Collecte à définir"
                    : "En cours"
                  : OUTCOME_LABELS[request.outcome]}
              </span>
              {request.reference && (
                <span className="text-xs text-white/60 font-mono">
                  #{request.reference}
                </span>
              )}
              <span className="text-xs text-white/55">
                {format(new Date(request.createdAt), "d MMM yyyy", { locale: fr })}
              </span>
            </div>

            <div className={cn("ml-auto flex items-center gap-2 pl-3", !canUpdate && !canDeleteForever && "hidden")}>
              {canUpdate && (
                <>
                  <Checkbox
                    checked={request.complete}
                    onChange={(e) =>
                      setComplete({ id: request._id, complete: e.target.checked })
                    }
                    label="Complète"
                    variant="inline"
                    className="border-white/24 bg-white/10 px-3 py-1.5 text-white hover:border-white/40 hover:bg-white/14 [&_.min-w-0>span]:text-white [&_.text-transparent]:border-white/45"
                  />

                  {request.outcome === "perdue" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/28 bg-black/10 text-white hover:bg-black/18 hover:text-white"
                      onClick={() => setOutcome({ id: request._id, outcome: "open" })}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rouvrir
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      className="border border-red-400/30 bg-red-600 text-white hover:bg-red-700 hover:text-white"
                      onClick={() => {
                        setLostReason((request.lostReason as LostReasonValue | undefined) ?? "");
                        setLostReasonDetails(request.lostReasonDetails ?? "");
                        setCancelError("");
                        setCancelOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Perdue
                    </Button>
                  )}
                </>
              )}

              {canDeleteForever && (
                <Button
                  variant="danger"
                  size="sm"
                  className="border border-red-300/35 bg-red-950/45 text-white hover:bg-red-900/70 hover:text-white"
                  onClick={() => {
                    setDeleteError("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        ) : (
          "Détail de la demande"
        )
      }
    >
      {!request ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div>
          {/* Onglets — collés en haut du panneau pendant le défilement. */}
          <div className="sticky top-0 z-20 border-b border-zinc-800 bg-[var(--crm-surface)] px-6 pt-3 sm:px-7">
            <UnderlineTabs
              items={visibleTabs}
              value={activeTab}
              onChange={setTab}
              className="border-b-0 [&_button]:pb-3"
              size="sm"
            />
          </div>

          <div className="px-6 pb-6 pt-6 sm:px-7 sm:pb-7">
            {activeTab === "demande" && (
              <DemandeTab request={request} canUpdate={canUpdate} />
            )}
            {activeTab === "gestion" && (
              <GestionTab
                request={request}
                collecteUndefined={!!collecteUndefined}
                canUpdate={canUpdate}
              />
            )}
            {activeTab === "calculDevis" && request.type === "aerogommage" && (
              <AeroQuoteCalculator key={request._id} request={request} />
            )}
            {activeTab === "calculDevis" && isC3Collecte && (
              <C3QuoteCalculator key={request._id} request={request} />
            )}
            {activeTab === "documents" && (
              <div className="space-y-4">
                {(request.type === "collecte" || request.type === "aerogommage") && (
                  <PhotoRequestButton request={request} />
                )}
                <RequestDocumentsPanel
                  requestId={request._id}
                  theme="dark"
                  viewerRole="staff"
                  customerName={[request.customer.firstName, request.customer.lastName]
                    .filter(Boolean)
                    .join(" ")}
                />
              </div>
            )}
            {activeTab === "client" && (
              <ClientTab key={request._id} request={request} canUpdate={canUpdate} />
            )}
            {activeTab === "messages" && (
              <div className="h-[60vh]">
                <MessageThread requestId={request._id} viewerRole="staff" theme="dark" />
              </div>
            )}
          </div>
        </div>
      )}

      {request && (
        <Modal
          dark
          open={deleteOpen}
          onClose={() => {
            if (!deleting) setDeleteOpen(false);
          }}
          title="Supprimer définitivement"
          className="max-w-md border-0 shadow-[0_28px_90px_rgba(0,0,0,0.18)]"
          headerClassName="border-b-0"
        >
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Cette action supprime définitivement la demande
              {request.reference ? ` #${request.reference}` : ""}, ses messages,
              notifications, documents rattachés et photos propres à la demande.
            </p>
            {deleteError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Retour
              </Button>
              <Button
                variant="danger"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError("");
                  try {
                    await deleteForever({ id: request._id });
                    setDeleteOpen(false);
                    onClose();
                  } catch (error) {
                    setDeleteError(
                      error instanceof Error
                        ? error.message
                        : "La suppression a échoué.",
                    );
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {request && (
        <Modal
          dark
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title="Annuler la demande"
          className="max-w-md border-0 shadow-[0_28px_90px_rgba(0,0,0,0.18)]"
          headerClassName="border-b-0"
        >
          <div className="space-y-4">
            <Field label="Motif" required error={cancelError || undefined}>
              <Select
                value={lostReason}
                onChange={(e) => {
                  setLostReason(e.target.value as LostReasonValue | "");
                  if (e.target.value !== "autre") {
                    setLostReasonDetails("");
                  }
                  setCancelError("");
                }}
              >
                <option value="">Sélectionner…</option>
                {LOST_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            {lostReason === "autre" && (
              <Field label="Précision" required>
                <Textarea
                  value={lostReasonDetails}
                  onChange={(e) => {
                    setLostReasonDetails(e.target.value);
                    setCancelError("");
                  }}
                  placeholder="Précisez le motif…"
                />
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>
                Retour
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!lostReason) {
                    setCancelError("Le motif est requis.");
                    return;
                  }
                  if (lostReason === "autre" && !lostReasonDetails.trim()) {
                    setCancelError("Merci de préciser le motif.");
                    return;
                  }
                  await setOutcome({
                    id: request._id,
                    outcome: "perdue",
                    lostReason,
                    lostReasonDetails:
                      lostReason === "autre"
                        ? lostReasonDetails.trim()
                        : null,
                  });
                  setCancelOpen(false);
                }}
              >
                Confirmer l'annulation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Demande */

type AeroItemForm = {
  objectType: string;
  label: string;
  height: string;
  width: string;
  depth: string;
  quantity: string;
  woodType: string;
  stripping: string;
  coating: string;
  coatingOther: string;
  comment: string;
  photos?: Id<"_storage">[];
};

type AeroDetailsForm = {
  comment: string;
  pickupAtHome: boolean;
  deliveryAtHome: boolean;
  items: AeroItemForm[];
};

function aeroItemToForm(item?: NonNullable<RequestDoc["aerogommage"]>[number]): AeroItemForm {
  return {
    objectType: item?.objectType ?? "",
    label: item?.label ?? "",
    height: item?.height !== undefined ? String(item.height) : "",
    width: item?.width !== undefined ? String(item.width) : "",
    depth: item?.depth !== undefined ? String(item.depth) : "",
    quantity: item?.quantity !== undefined ? String(item.quantity) : "",
    woodType: item?.woodType ?? "",
    stripping: item?.stripping ?? "",
    coating: item?.coating ?? "",
    coatingOther: item?.coatingOther ?? "",
    comment: item?.comment ?? "",
    photos: item?.photos ?? [],
  };
}

function aeroRequestToForm(request: RequestDoc): AeroDetailsForm {
  const items = request.aerogommage?.length
    ? request.aerogommage.map(aeroItemToForm)
    : [aeroItemToForm()];
  const legacyPickup = request.aerogommage?.some((item) => item.retrieval) ?? false;
  const legacyDelivery = request.aerogommage?.some((item) => item.delivery) ?? false;
  return {
    comment: request.comment ?? "",
    pickupAtHome: request.aerogommageOptions?.pickupAtHome ?? legacyPickup,
    deliveryAtHome: request.aerogommageOptions?.deliveryAtHome ?? legacyDelivery,
    items,
  };
}

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function DemandeTab({
  request,
  canUpdate,
}: {
  request: RequestDoc;
  canUpdate: boolean;
}) {
  const [lb, setLb] = useState<number | null>(null);
  const [editingAero, setEditingAero] = useState(false);

  const meta = (
    <>
      {request.comment && (
        <section>
          <SectionTitle>Commentaire</SectionTitle>
          <p className="text-sm text-zinc-300 whitespace-pre-line rounded-lg bg-[var(--crm-surface-3)] p-3">
            {request.comment}
          </p>
        </section>
      )}

      {request.outcome === "perdue" && request.lostReason && (
        <section>
          <SectionTitle>Motif d'annulation</SectionTitle>
          <p className="rounded-lg bg-[var(--crm-surface-3)] p-3 text-sm text-zinc-300">
            {request.lostReason === "devis_refuse" && "Devis refusé"}
            {request.lostReason === "pas_de_retour_client" &&
              "Pas de retour client"}
            {request.lostReason === "autre" &&
              (request.lostReasonDetails || "Autre")}
          </p>
        </section>
      )}

      {request.type !== "livraison" && request.photoUrls.length > 0 && (
        <section>
          <SectionTitle>Photos client</SectionTitle>
          <PhotoGrid urls={request.photoUrls} onOpen={setLb} />
        </section>
      )}

      {request.type === "aerogommage" && (
        <AerogommageProgressPhotos request={request} />
      )}

      <p className="text-xs text-zinc-600">
        Reçue le {formatDateTime(request.createdAt)}
      </p>

      {request.type !== "livraison" && lb !== null && (
        <Lightbox
          images={request.photoUrls}
          startIndex={lb}
          onClose={() => setLb(null)}
        />
      )}
    </>
  );

  if (request.type === "article") {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.72fr)]">
        <RequestDetails request={request} />
        <div className="space-y-6">{meta}</div>
      </div>
    );
  }

  if (request.type === "aerogommage") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          {canUpdate && !editingAero && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingAero(true)}
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          )}
        </div>
        {editingAero ? (
          <AerogommageEditForm
            request={request}
            onCancel={() => setEditingAero(false)}
            onSaved={() => setEditingAero(false)}
          />
        ) : (
          <RequestDetails request={request} />
        )}
        {meta}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RequestDetails request={request} />
      {meta}
    </div>
  );
}

function AerogommageEditForm({
  request,
  onCancel,
  onSaved,
}: {
  request: RequestDoc;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const update = useMutation(api.requests.updateAerogommageDetails);
  const { user } = useUser();
  const persona = usePersona();
  const actorName =
    persona ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;
  const [form, setForm] = useState<AeroDetailsForm>(() => aeroRequestToForm(request));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setRoot<K extends keyof AeroDetailsForm>(key: K, value: AeroDetailsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  function setItem(index: number, key: keyof AeroItemForm, value: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
    setError("");
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, aeroItemToForm()] }));
    setError("");
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    setError("");
  }

  async function save() {
    if (form.items.length === 0) {
      setError("Ajoutez au moins un objet.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const customerAddress = {
        address: request.customer.address,
        postalCode: request.customer.postalCode,
        city: request.customer.city,
      };
      await update({
        id: request._id,
        actorName,
        comment: form.comment.trim() || undefined,
        aerogommageOptions: {
          pickupAtHome: form.pickupAtHome,
          deliveryAtHome: form.deliveryAtHome,
          pickupAddress: form.pickupAtHome ? customerAddress : undefined,
          deliveryAddress: form.deliveryAtHome ? customerAddress : undefined,
        },
        items: form.items.map((item) => ({
          objectType: item.objectType.trim() || undefined,
          label: item.label.trim() || undefined,
          height: parseOptionalPositiveNumber(item.height),
          width: parseOptionalPositiveNumber(item.width),
          depth: parseOptionalPositiveNumber(item.depth),
          quantity: parseOptionalPositiveNumber(item.quantity),
          woodType: item.woodType.trim() || undefined,
          stripping: item.stripping.trim() || undefined,
          coating: item.coating.trim() || undefined,
          coatingOther: item.coatingOther.trim() || undefined,
          comment: item.comment.trim() || undefined,
          photos: item.photos ?? [],
        })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle>Modifier la demande client</SectionTitle>
          <p className="text-xs text-zinc-500">
            Les photos ne sont pas modifiées ici.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <Field label="Commentaire général">
        <Textarea
          value={form.comment}
          onChange={(e) => setRoot("comment", e.target.value)}
          placeholder="Commentaire renseigné par le client…"
        />
      </Field>

      <section>
        <SectionTitle>Transport</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            label="Retrait à domicile"
            checked={form.pickupAtHome}
            onChange={(e) => setRoot("pickupAtHome", e.target.checked)}
            className="border-[var(--crm-border)] bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-3)]"
          />
          <Checkbox
            label="Livraison à domicile"
            checked={form.deliveryAtHome}
            onChange={(e) => setRoot("deliveryAtHome", e.target.checked)}
            className="border-[var(--crm-border)] bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-3)]"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Objets à aérogommer</SectionTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {form.items.map((item, index) => {
          const isOtherType = item.objectType === "Autre (veuillez préciser)";
          const isOtherCoating = item.coating === "Autre (précisez)";
          return (
            <div
              key={index}
              className="space-y-4 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-200">
                  Objet {index + 1}
                </p>
                {form.items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Retirer
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type d'objet">
                  <Select
                    value={item.objectType}
                    onChange={(e) => setItem(index, "objectType", e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {AERO_OBJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                {isOtherType && (
                  <Field label="Précisez l'objet">
                    <Input
                      value={item.label}
                      onChange={(e) => setItem(index, "label", e.target.value)}
                    />
                  </Field>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Hauteur (cm)">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={item.height}
                    onChange={(e) => setItem(index, "height", e.target.value)}
                  />
                </Field>
                <Field label="Largeur (cm)">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={item.width}
                    onChange={(e) => setItem(index, "width", e.target.value)}
                  />
                </Field>
                <Field label="Profondeur (cm)">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={item.depth}
                    onChange={(e) => setItem(index, "depth", e.target.value)}
                  />
                </Field>
                <Field label="Quantité">
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => setItem(index, "quantity", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nature du bois">
                  <Select
                    value={item.woodType}
                    onChange={(e) => setItem(index, "woodType", e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {WOOD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Décapage">
                  <Select
                    value={item.stripping}
                    onChange={(e) => setItem(index, "stripping", e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {STRIPPING_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Revêtement">
                  <Select
                    value={item.coating}
                    onChange={(e) => setItem(index, "coating", e.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {COATING_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                {isOtherCoating && (
                  <Field label="Précisez le revêtement">
                    <Input
                      value={item.coatingOther}
                      onChange={(e) => setItem(index, "coatingOther", e.target.value)}
                    />
                  </Field>
                )}
              </div>

              <Field label="Commentaire objet">
                <Textarea
                  value={item.comment}
                  onChange={(e) => setItem(index, "comment", e.target.value)}
                  placeholder="Précisions sur cet objet…"
                />
              </Field>
            </div>
          );
        })}
      </section>
    </section>
  );
}

function AerogommageProgressPhotos({ request }: { request: RequestDoc }) {
  const patchManagement = useMutation(api.requests.patchManagement);
  const upload = useUpload();
  const [beforeOpen, setBeforeOpen] = useState<number | null>(null);
  const [afterOpen, setAfterOpen] = useState<number | null>(null);
  const [uploadingKind, setUploadingKind] = useState<"before" | "after" | null>(null);

  async function addPhotos(kind: "before" | "after", files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingKind(kind);
    try {
      const uploadedIds: Id<"_storage">[] = [];
      for (const file of Array.from(files)) {
        uploadedIds.push(await upload(file));
      }
      const existing =
        kind === "before"
          ? (request.beforePhotos ?? [])
          : (request.afterPhotos ?? []);
      await patchManagement({
        id: request._id,
        ...(kind === "before"
          ? { beforePhotos: [...existing, ...uploadedIds] }
          : { afterPhotos: [...existing, ...uploadedIds] }),
      });
    } finally {
      setUploadingKind(null);
    }
  }

  async function removePhoto(kind: "before" | "after", index: number) {
    const existing =
      kind === "before"
        ? [...(request.beforePhotos ?? [])]
        : [...(request.afterPhotos ?? [])];
    existing.splice(index, 1);
    await patchManagement({
      id: request._id,
      ...(kind === "before" ? { beforePhotos: existing } : { afterPhotos: existing }),
    });
  }

  return (
    <section className="space-y-4">
      <ManagedRequestPhotoBlock
        title="Photos avant"
        urls={request.beforePhotoUrls ?? []}
        uploading={uploadingKind === "before"}
        onAdd={(files) => addPhotos("before", files)}
        onRemove={(index) => removePhoto("before", index)}
        onOpen={setBeforeOpen}
      />

      <ManagedRequestPhotoBlock
        title="Photos après"
        urls={request.afterPhotoUrls ?? []}
        uploading={uploadingKind === "after"}
        onAdd={(files) => addPhotos("after", files)}
        onRemove={(index) => removePhoto("after", index)}
        onOpen={setAfterOpen}
      />

      {beforeOpen !== null && (
        <Lightbox
          images={request.beforePhotoUrls ?? []}
          startIndex={beforeOpen}
          onClose={() => setBeforeOpen(null)}
        />
      )}

      {afterOpen !== null && (
        <Lightbox
          images={request.afterPhotoUrls ?? []}
          startIndex={afterOpen}
          onClose={() => setAfterOpen(null)}
        />
      )}
    </section>
  );
}

function ManagedRequestPhotoBlock({
  title,
  urls,
  uploading,
  onAdd,
  onRemove,
  onOpen,
}: {
  title: string;
  urls: string[];
  uploading: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onOpen: (index: number) => void;
}) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {urls.length > 0 && (
        <PhotoGrid
          urls={urls}
          onOpen={onOpen}
          onRemove={onRemove}
          className="mb-3"
        />
      )}
      <label
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-sm font-medium transition-colors",
          uploading
            ? "cursor-not-allowed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-500 opacity-70"
            : "border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/60 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi des images…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            Ajouter des photos
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            onAdd(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

/** Grille de vignettes ouvrant la visionneuse au clic. */
function PhotoGrid({
  urls,
  onOpen,
  onRemove,
  className,
}: {
  urls: string[];
  onOpen: (i: number) => void;
  onRemove?: (i: number) => void;
  className?: string;
}) {
  const imageActionClass =
    "inline-flex w-full max-w-[9rem] items-center justify-center gap-1.5 rounded-lg border border-zinc-200 !bg-white px-2.5 py-1.5 text-xs font-semibold !text-zinc-950 shadow-sm transition hover:!bg-zinc-50 hover:!text-zinc-950";

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {urls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--crm-border)]"
        >
          <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 p-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onOpen(i)}
              className={imageActionClass}
            >
              <Eye className="h-3.5 w-3.5" /> Voir l'image
            </button>
            <button
              type="button"
              onClick={() => downloadImage(url)}
              className={imageActionClass}
            >
              <Download className="h-3.5 w-3.5" /> Télécharger l'image
            </button>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Supprimer la photo"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------- Photos objets (collecte) */

/**
 * Photos des objets d'une collecte, groupées par catégorie. L'équipe peut en
 * ajouter elle-même : « Ajouter une photo » ouvre le sélecteur de catégorie
 * (pictogrammes), puis on importe des images pour la catégorie choisie.
 */
function CollecteCategoryPhotos({ request }: { request: RequestDoc }) {
  const access = useCrmAccess();
  const canUpdate = canAccess(access, "demandes", "update");
  const addPhotos = useMutation(api.requests.addCollecteCategoryPhotos);
  const removePhoto = useMutation(api.requests.removeCollecteCategoryPhoto);
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCategory = useRef<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lb, setLb] = useState<{ urls: string[]; index: number } | null>(null);

  const groups = (request.collecteCategoryPhotos ?? []).filter(
    (g) => g.urls.length > 0,
  );
  const hasPhotos = groups.length > 0;

  function pickCategory(category: string) {
    pendingCategory.current = category;
    setPickerOpen(false);
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    const category = pendingCategory.current;
    if (!files || files.length === 0 || !category) return;
    setUploading(true);
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of Array.from(files)) ids.push(await upload(file));
      await addPhotos({ id: request._id, category, photos: ids });
    } finally {
      setUploading(false);
      pendingCategory.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!hasPhotos && !canUpdate) return null;

  return (
    <section>
      <SectionTitle>Photos des objets</SectionTitle>
      {hasPhotos && (
        <div className="space-y-3">
          {groups.map((entry) => {
            const cat = COLLECTE_CATEGORY_BY_KEY[entry.category];
            return (
              <div key={entry.category}>
                <div className="mb-1.5 flex items-center gap-2">
                  {cat?.image && (
                    <img src={cat.image} alt="" className="h-6 w-6 object-contain" />
                  )}
                  <span className="text-xs font-medium text-zinc-400">
                    {cat?.label ?? entry.category}
                  </span>
                </div>
                <PhotoGrid
                  urls={entry.urls}
                  onOpen={(index) => setLb({ urls: entry.urls, index })}
                  onRemove={
                    canUpdate
                      ? (index) =>
                          removePhoto({
                            id: request._id,
                            category: entry.category,
                            index,
                          })
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {canUpdate && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => setPickerOpen(true)}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-medium transition-colors",
            uploading
              ? "cursor-not-allowed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-500 opacity-70"
              : "border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/60 hover:text-zinc-100",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Envoi des images…
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" /> Ajouter une photo
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Modal
        dark
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Type d'objet"
        className="max-w-2xl"
      >
        <p className="mb-4 text-sm text-zinc-400">
          Choisissez la catégorie de l'objet à photographier, puis sélectionnez
          les images à importer.
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {COLLECTE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => pickCategory(cat.key)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3 text-center transition-colors hover:border-brand-500/60 hover:bg-[var(--crm-surface-3)]"
            >
              <img src={cat.image} alt="" className="h-12 w-12 object-contain" />
              <span className="text-[11px] leading-tight text-zinc-300">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {lb && (
        <Lightbox
          images={lb.urls}
          startIndex={lb.index}
          onClose={() => setLb(null)}
        />
      )}
    </section>
  );
}

/* --------------------------------------------------------- Demande de photos */

function PhotoRequestButton({ request }: { request: RequestDoc }) {
  const requestPhotos = useMutation(api.requests.requestPhotos);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const noEmail = !request.customer.email;

  async function send() {
    setState("sending");
    setError(null);
    try {
      await requestPhotos({ id: request._id, note: note.trim() || undefined });
      setState("sent");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
          <ImagePlus className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">Demande de photos</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Envoie au client un email avec un lien direct vers sa demande pour qu'il importe
            ses photos dans l'onglet Documents.
          </p>
          {noEmail ? (
            <p className="mt-3 text-xs text-amber-400">
              Ce client n'a pas d'adresse email renseignée.
            </p>
          ) : state === "sent" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
              <Check className="h-4 w-4" /> Email envoyé à {request.customer.email}
            </p>
          ) : (
            <>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Précisions (facultatif) : quelles photos demandez-vous ?"
                className="mt-3"
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <Button onClick={send} disabled={state === "sending"} className="mt-3">
                {state === "sending" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Envoi…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" /> Envoyer la demande de photos
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Gestion */

function GestionTab({
  request,
  collecteUndefined,
  canUpdate,
}: {
  request: RequestDoc;
  collecteUndefined: boolean;
  canUpdate: boolean;
}) {
  const { user } = useUser();
  const advance = useMutation(api.requests.advanceProcess);
  const retreat = useMutation(api.requests.retreatProcess);
  const addProcessNote = useMutation(api.requests.addProcessNote);
  const setCollecteType = useMutation(api.requests.setCollecteType);
  const schedule = useMutation(api.requests.schedule);
  const patch = useMutation(api.requests.patchManagement);
  const team = useQuery(api.team.list, {}) ?? [];
  const usesVehicle = request.type === "collecte" || request.type === "livraison";
  const availableVehicles =
    useQuery(
      api.fleet.availableOn,
      usesVehicle && request.scheduledDate
        ? {
            date: request.scheduledDate,
            includeVehicleId: request.assignedVehicle ?? undefined,
          }
        : "skip",
    ) ?? [];

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const patchVisit = useMutation(api.requests.patchManagement);
  const setGdrReference = useMutation(api.articles.setGdrReference);
  const [gdrInput, setGdrInput] = useState("");
  const [gdrSaving, setGdrSaving] = useState(false);
  const [gdrError, setGdrError] = useState("");
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const persona = usePersona();
  // Auteur des modifications : persona (compte accueil partagé) sinon le compte.
  const currentUser =
    persona ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;

  const linkedArticle = useQuery(
    api.articles.getPublic,
    request.type === "article" && request.article?.articleId
      ? { id: request.article.articleId }
      : "skip",
  );

  const stepBlockers: Record<string, string> = {};
  const isFullProcess =
    request.type === "aerogommage" ||
    request.type === "velo" ||
    (request.type === "collecte" &&
      (request.collecteType === "C2" || request.collecteType === "C3"));
  const isC1 = request.type === "collecte" && request.collecteType === "C1";

  if (isFullProcess) {
    if (request.type !== "collecte" && !request.estimatedHours)
      stepBlockers[STEP.devisEdite] =
        "Renseignez les heures estimées (champ « Temps estimé ») avant de cocher cette étape.";
    if (!request.scheduledDate)
      stepBlockers[STEP.prestaPlanifiee] =
        "Programmez une date avant de cocher cette étape.";
    if (request.type !== "collecte" && !request.actualHours)
      stepBlockers[STEP.prestaTerminee] =
        "Renseignez les heures réelles (champ « Temps réel passé ») avant de cocher cette étape.";
    if (!request.quoteAmount)
      stepBlockers[STEP.factureEditee] =
        "Renseignez le montant du devis avant de cocher cette étape.";
  }
  if (isC1) {
    if (!request.scheduledDate)
      stepBlockers[STEP.prestaPlanifiee] =
        "Programmez une date avant de cocher cette étape.";
  }
  if (request.type === "article" && linkedArticle && !linkedArticle.gdrReference) {
    stepBlockers[STEP.factureReglee] =
      "Renseignez la référence externe de l'article avant de clôturer la vente.";
  }

  return (
    <fieldset
      disabled={!canUpdate}
      className="space-y-6 border-0 p-0 disabled:opacity-95"
    >
      {!canUpdate && (
        <p className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-xs text-zinc-400">
          Lecture seule — vous n'avez pas la permission de modifier cette demande.
        </p>
      )}
      {/* Sous-type de collecte */}
      {request.type === "collecte" && (
        <section>
          <SectionTitle>Type de collecte</SectionTitle>
          <Select
            value={request.collecteType ?? "indefini"}
            onChange={(e) =>
              setCollecteType({
                id: request._id,
                collecteType: e.target.value as CollecteType,
                actorName: currentUser,
              })
            }
          >
            <option value="indefini" disabled>
              Collecte à définir
            </option>
            {COLLECTE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldMeta edit={request.fieldEdits?.collecteType} />
          {collecteUndefined && (
            <p className="mt-2 text-xs text-amber-400">
              Choisissez C1, C2 ou C3 pour démarrer le suivi du process.
            </p>
          )}
        </section>
      )}

      {/* Raccourci : renseigner la réf. externe (GDR) sans quitter la demande */}
      {request.type === "article" && linkedArticle && !linkedArticle.gdrReference && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <SectionTitle>Référence externe (GDR)</SectionTitle>
          <p className="mb-3 text-xs text-amber-300/90">
            Renseignez la référence GDR de l'article (15 chiffres) directement ici
            pour pouvoir clôturer la vente, sans passer par le stock.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex-1">
              <Input
                value={gdrInput}
                onChange={(e) => {
                  setGdrInput(e.target.value.replace(/\D/g, "").slice(0, 15));
                  setGdrError("");
                }}
                inputMode="numeric"
                placeholder="15 chiffres"
              />
              {gdrError && (
                <p className="mt-1 text-xs text-red-400">{gdrError}</p>
              )}
            </div>
            <Button
              type="button"
              disabled={gdrSaving || gdrInput.length === 0}
              onClick={async () => {
                if (!/^\d{15}$/.test(gdrInput)) {
                  setGdrError("La référence GDR doit contenir exactement 15 chiffres.");
                  return;
                }
                setGdrSaving(true);
                setGdrError("");
                try {
                  await setGdrReference({
                    id: request.article!.articleId!,
                    gdrReference: gdrInput,
                  });
                  setGdrInput("");
                } catch (err) {
                  setGdrError(
                    err instanceof Error ? err.message : "Enregistrement impossible.",
                  );
                } finally {
                  setGdrSaving(false);
                }
              }}
            >
              {gdrSaving ? <Spinner className="h-4 w-4" /> : "Enregistrer"}
            </Button>
          </div>
        </section>
      )}

      {/* Process */}
      <section>
        <SectionTitle>Process</SectionTitle>
        <ProcessChecklist
          steps={request.processSteps}
          completed={request.completedSteps}
          log={request.processLog ?? []}
          notes={request.processNotes ?? []}
          locked={request.outcome === "perdue" || collecteUndefined}
          outcome={request.outcome}
          currentUser={currentUser}
          stepBlockers={stepBlockers}
          onAdvance={() => advance({ id: request._id, by: currentUser })}
          onRetreat={() => retreat({ id: request._id })}
          onAddNote={(step, body) =>
            addProcessNote({ id: request._id, step, body, by: currentUser })
          }
        />
      </section>

      {/* Affectation */}
      <section className="grid grid-cols-2 gap-4">
        <div>
          <SectionTitle>Site de traitement</SectionTitle>
          <Select
            value={request.site ?? ""}
            onChange={(e) =>
              patch({ id: request._id, site: e.target.value as Site, actorName: currentUser })
            }
          >
            <option value="" disabled>
              Sélectionner…
            </option>
            {(Object.keys(SITE_LABELS) as Site[]).map((s) => (
              <option key={s} value={s}>
                {SITE_LABELS[s]}
              </option>
            ))}
          </Select>
          <FieldMeta edit={request.fieldEdits?.site} />
        </div>
        <div>
          <SectionTitle>Attribuée à</SectionTitle>
          <Select
            value={request.assignedTo ?? ""}
            onChange={(e) =>
              patch({
                id: request._id,
                assignedTo: e.target.value
                  ? (e.target.value as Id<"teamMembers">)
                  : null,
                actorName: currentUser,
              })
            }
          >
            <option value="">Non attribuée</option>
            {team.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
          <FieldMeta edit={request.fieldEdits?.assignedTo} />
        </div>
      </section>

      {usesVehicle && (
        <section>
          <SectionTitle>Véhicule de la flotte</SectionTitle>
          {request.scheduledDate ? (
            <Select
              value={request.assignedVehicle ?? ""}
              onChange={(e) =>
                patch({
                  id: request._id,
                  assignedVehicle: e.target.value
                    ? (e.target.value as Id<"vehicles">)
                    : null,
                  actorName: currentUser,
                })
              }
            >
              <option value="">Aucun véhicule</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.name}
                  {vehicle.plate ? ` · ${vehicle.plate}` : ""}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-xs text-amber-400">
              Programmez une date pour affecter un véhicule disponible ce jour-là.
            </p>
          )}
          <FieldMeta edit={request.fieldEdits?.assignedVehicle} />
        </section>
      )}

      {request.type === "collecte" && (
        <section>
          <SectionTitle>Options de collecte</SectionTitle>
          <Checkbox
            label="Visite nécessaire"
            description="Une visite préalable est requise avant la collecte."
            checked={request.visitNeeded ?? false}
            onChange={(e) =>
              patchVisit({ id: request._id, visitNeeded: e.target.checked, actorName: currentUser })
            }
            className="border-[var(--crm-border)] bg-[var(--crm-surface-2)] hover:bg-[var(--crm-surface-3)]"
          />
          <FieldMeta edit={request.fieldEdits?.visitNeeded} />
        </section>
      )}

      {/* Planification & temps */}
      <section>
        <SectionTitle>Date programmée</SectionTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-left text-sm text-[var(--foreground)] shadow-sm transition-colors hover:border-brand-500/60 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span className={request.scheduledDate ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
              {request.scheduledDate
                ? formatScheduledDate(request.scheduledDate)
                : "Programmer une date"}
            </span>
          </button>
          {request.scheduledDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                schedule({ id: request._id, scheduledDate: undefined, actorName: currentUser })
              }
            >
              Retirer
            </Button>
          )}
        </div>
        <FieldMeta edit={request.fieldEdits?.scheduledDate} />
        <ScheduleCalendarModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          value={request.scheduledDate}
          vehicleSelection={usesVehicle}
          vehicleId={request.assignedVehicle ?? null}
          onChange={(scheduledDate, vehicleId) => {
            schedule({
              id: request._id,
              scheduledDate,
              actorName: currentUser,
              ...(usesVehicle ? { assignedVehicle: vehicleId ?? null } : {}),
            });
            setScheduleOpen(false);
          }}
        />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <SectionTitle>Temps estimé (h)</SectionTitle>
          <Input
            key={`est-${request._id}`}
            type="number"
            step="0.5"
            min="0"
            defaultValue={request.estimatedHours ?? ""}
            onBlur={(e) =>
              patch({ id: request._id, estimatedHours: num(e.target.value), actorName: currentUser })
            }
          />
          <FieldMeta edit={request.fieldEdits?.estimatedHours} />
        </div>
        <div>
          <SectionTitle>Temps réel passé (h)</SectionTitle>
          <Input
            key={`act-${request._id}`}
            type="number"
            step="0.5"
            min="0"
            defaultValue={request.actualHours ?? ""}
            onBlur={(e) =>
              patch({ id: request._id, actualHours: num(e.target.value), actorName: currentUser })
            }
          />
          <FieldMeta edit={request.fieldEdits?.actualHours} />
        </div>
      </section>

      {/* Devis */}
      <section>
        <SectionTitle>Devis</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Montant (€)</label>
            <Input
              key={`amt-${request._id}`}
              type="number"
              step="0.01"
              min="0"
              defaultValue={request.quoteAmount ?? ""}
              onBlur={(e) =>
                patch({ id: request._id, quoteAmount: num(e.target.value), actorName: currentUser })
              }
            />
            <FieldMeta edit={request.fieldEdits?.quoteAmount} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Détails calcul du devis
            </label>
            <Textarea
              key={`qd-${request._id}`}
              defaultValue={request.quoteDetails ?? ""}
              placeholder="Détail du calcul, lignes, remises…"
              onBlur={(e) =>
                patch({
                  id: request._id,
                  quoteDetails: e.target.value.trim() || null,
                  actorName: currentUser,
                })
              }
            />
            <FieldMeta edit={request.fieldEdits?.quoteDetails} />
          </div>
        </div>
      </section>
    </fieldset>
  );
}

/* ------------------------------------------------------------------- Client */

function ClientTab({ request, canUpdate }: { request: RequestDoc; canUpdate: boolean }) {
  const update = useMutation(api.requests.updateCustomer);
  const { user } = useUser();
  const persona = usePersona();
  const actorName =
    persona ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;
  const [c, setC] = useState({
    firstName: request.customer.firstName,
    lastName: request.customer.lastName,
    email: request.customer.email,
    phone: request.customer.phone,
    address: request.customer.address ?? "",
    postalCode: request.customer.postalCode ?? "",
    city: request.customer.city ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof c, val: string) => {
    setC((prev) => ({ ...prev, [k]: val }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    try {
      await update({
        id: request._id,
        actorName,
        customer: {
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          address: c.address || undefined,
          postalCode: c.postalCode || undefined,
          city: c.city || undefined,
        },
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset disabled={!canUpdate} className="space-y-5 border-0 p-0">
      {!canUpdate && (
        <p className="rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-xs text-zinc-400">
          Lecture seule — vous n'avez pas la permission de modifier le client.
        </p>
      )}
      <section>
        <SectionTitle>Coordonnées</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <Input value={c.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Nom">
            <Input value={c.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <PhoneInput value={c.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <FieldMeta edit={request.fieldEdits?.customer} />
      </section>

      <section>
        <SectionTitle>Adresse de facturation</SectionTitle>
        <div className="space-y-3">
          <Field label="Adresse">
            <AddressAutocomplete
              value={c.address}
              onValueChange={(v) => set("address", v)}
              onSelect={(a) =>
                setC((prev) => ({
                  ...prev,
                  address: a.address,
                  postalCode: a.postalCode,
                  city: a.city,
                }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code postal">
              <Input value={c.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </Field>
            <Field label="Ville">
              <Input value={c.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-brand-400">
            <Check className="h-4 w-4" /> Enregistré
          </span>
        )}
      </div>
    </fieldset>
  );
}

/* --------------------------------------------------------------- Checklist */

function ProcessChecklist({
  steps,
  completed,
  log,
  notes,
  locked,
  outcome,
  currentUser,
  stepBlockers = {},
  onAdvance,
  onRetreat,
  onAddNote,
}: {
  steps: string[];
  completed: number;
  log: { step: number; by: string; at: number }[];
  notes: { step: number; by: string; at: number; body: string }[];
  locked: boolean;
  outcome: string;
  currentUser?: string;
  stepBlockers?: Record<string, string>;
  onAdvance: () => void;
  onRetreat: () => void;
  onAddNote: (step: number, body: string) => Promise<unknown>;
}) {
  const [confirm, setConfirm] = useState<"advance" | "retreat" | null>(null);
  const [blockerMsg, setBlockerMsg] = useState<string | null>(null);
  const [commentsStep, setCommentsStep] = useState<number | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-zinc-500 rounded-lg bg-[var(--crm-surface-3)] p-3">
        Aucun process à suivre pour le moment.
      </p>
    );
  }

  const completionPercent = Math.round((completed / steps.length) * 100);
  const nextStepLabel = steps[completed];
  const nextIsBlocked = !!stepBlockers[nextStepLabel];
  const activeStep =
    commentsStep !== null && commentsStep >= 0 && commentsStep < steps.length
      ? commentsStep
      : Math.min(completed, steps.length - 1);
  const stepNotes = notes
    .filter((note) => note.step === activeStep)
    .sort((a, b) => b.at - a.at);

  function handleStepClick(isNext: boolean) {
    if (isNext) {
      const blocker = stepBlockers[nextStepLabel];
      if (blocker) {
        setBlockerMsg(blocker);
        return;
      }
      // Advancing the last step would mark the request as won
      if (completed + 1 >= steps.length) {
        setConfirm("advance");
      } else {
        onAdvance();
      }
    } else {
      // Retreating when all steps were done would un-win the request
      if (outcome === "gagnee") {
        setConfirm("retreat");
      } else {
        onRetreat();
      }
    }
  }

  async function handleAddNote() {
    const trimmed = noteBody.trim();
    if (!trimmed) {
      setNoteError("Ajoutez un commentaire avant d'enregistrer.");
      return;
    }

    setSavingNote(true);
    setNoteError(null);
    try {
      await onAddNote(activeStep, trimmed);
      setNoteBody("");
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Impossible d'ajouter la note.");
    } finally {
      setSavingNote(false);
    }
  }

  function openComments(step: number) {
    setCommentsStep(step);
    setNoteBody("");
    setNoteError(null);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            <span>Complétude</span>
            <span className="text-brand-300">{completionPercent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--crm-surface-3)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ff9a3d,#ff7700)] transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        <ol
          className="grid w-full gap-2"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((label, i) => {
            const isDone = i < completed;
            const isNext = i === completed;
            const isLastDone = i === completed - 1;
            const actionable = !locked && (isNext || isLastDone);
            const entry = log.find((e) => e.step === i);
            const noteCount = notes.filter((note) => note.step === i).length;

            return (
              <li key={label}>
                <div
                  className={cn(
                    "flex min-h-[152px] w-full flex-col rounded-[24px] border text-center text-sm transition-all",
                    isDone
                      ? "border-brand-500/35 bg-[linear-gradient(180deg,rgba(255,119,0,0.16),rgba(255,119,0,0.06))] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : isNext && !locked && nextIsBlocked
                        ? "border-amber-500/40 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),var(--crm-surface-3))] text-zinc-200 shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-amber-400"
                        : isNext && !locked
                          ? "border-[var(--crm-border-strong)] bg-[linear-gradient(180deg,var(--crm-surface-2),var(--crm-surface-3))] text-zinc-200 shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-brand-500"
                          : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-500",
                  )}
                >
                  <button
                    type="button"
                    disabled={!actionable}
                    onClick={() => handleStepClick(isNext)}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-between px-3 py-3",
                      actionable ? "cursor-pointer" : "cursor-not-allowed",
                    )}
                  >
                    <div className="flex w-full items-center justify-center">
                      <span
                        className={cn(
                          "mb-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                          isDone
                            ? "border-brand-400 bg-brand-500 text-white shadow-[0_10px_24px_rgba(255,119,0,0.28)]"
                            : isNext && !locked
                              ? "border-brand-400 bg-brand-500/12 text-brand-300"
                              : "border-[var(--crm-border-strong)] bg-[var(--crm-surface)] text-transparent",
                        )}
                      >
                        {isDone && (
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        )}
                      </span>
                    </div>
                    <span className="flex flex-1 flex-col items-center justify-center">
                      <span className="block text-sm font-semibold leading-5">{label}</span>
                      {isDone && entry && (
                        <span className="mt-2 flex flex-col items-center text-[11px] font-normal text-zinc-400">
                          <span className="max-w-full truncate">par {entry.by}</span>
                          <span>{formatDateTime(entry.at)}</span>
                        </span>
                      )}
                    </span>
                    {isNext && !locked && (
                      nextIsBlocked ? (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-400">
                          Infos requises
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300">
                          Prochaine étape
                        </span>
                      )
                    )}
                  </button>
                  <div className="mt-auto border-t border-white/6 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openComments(i)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300 transition hover:bg-black/20 hover:text-white"
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Notes
                      {noteCount > 0 && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-200">
                          {noteCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <Modal
        dark
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "advance" ? "Demande gagnée" : "Annuler la victoire ?"}
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-300">
          {confirm === "advance"
            ? "Cette demande sera achevée et gagnée. Souhaitez-vous continuer ?"
            : "Cette demande ne sera plus gagnée. Souhaitez-vous continuer ?"}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (confirm === "advance") onAdvance();
              else onRetreat();
              setConfirm(null);
            }}
          >
            Continuer
          </Button>
        </div>
      </Modal>

      <Modal
        dark
        open={blockerMsg !== null}
        onClose={() => setBlockerMsg(null)}
        title="Information requise"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-300">{blockerMsg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setBlockerMsg(null)}>Compris</Button>
        </div>
      </Modal>

      <Modal
        dark
        open={commentsStep !== null}
        onClose={() => {
          setCommentsStep(null);
          setNoteBody("");
          setNoteError(null);
        }}
        title={commentsStep !== null ? `Commentaires · ${steps[activeStep]}` : "Commentaires"}
        className="max-w-5xl border-0 shadow-[0_28px_90px_rgba(0,0,0,0.24)]"
        headerClassName="border-b-0"
      >
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Nouvelle note
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">
              {steps[activeStep]}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {currentUser
                ? `Ajoutée en tant que ${currentUser}`
                : "Votre nom sera enregistré automatiquement si disponible."}
            </p>
            <Textarea
              value={noteBody}
              onChange={(e) => {
                setNoteBody(e.target.value);
                if (noteError) setNoteError(null);
              }}
              placeholder="Ex. Devis envoyé par e-mail, le client doit maintenant le signer."
              className="mt-4 min-h-[180px]"
            />
            {noteError && (
              <p className="mt-2 text-xs text-rose-400">{noteError}</p>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleAddNote}
                disabled={savingNote}
              >
                {savingNote ? "Enregistrement…" : "Ajouter la note"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {stepNotes.length > 0 ? (
              stepNotes.map((note, index) => (
                <div
                  key={`${note.at}-${index}`}
                  className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                    <span className="truncate">{note.by}</span>
                    <span>{formatDateTime(note.at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-200">
                    {note.body}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--crm-border)] bg-[var(--crm-surface)] p-4 text-sm text-zinc-500">
                Aucune note pour cette étape pour le moment.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ----------------------------------------------------------------- Map */

function CollecteMap({
  address,
}: {
  address: { address?: string; postalCode?: string; city?: string };
}) {
  const query = [address.address, address.postalCode, address.city]
    .filter(Boolean)
    .join(", ");
  if (!query) return null;

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&t=k&z=19`;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--crm-border)]">
      <iframe
        title="Carte de collecte"
        src={src}
        width="100%"
        height="220"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/* ----------------------------------------------------------------- Helpers */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
      {children}
    </h4>
  );
}

/** « Modifié par … » affiché sous un champ, à partir du suivi `fieldEdits`. */
function FieldMeta({ edit }: { edit?: { by: string; at: number } }) {
  if (!edit?.by) return null;
  return (
    <p className="mt-1 text-[11px] text-zinc-500">
      Modifié par <span className="font-medium text-zinc-400">{edit.by}</span>
      {" · "}
      {formatRelative(edit.at)}
    </p>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[var(--crm-border)] last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-zinc-200 text-right",
          mono && "max-w-[60%] break-all font-mono text-xs",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function yesNo(b?: boolean) {
  if (b === undefined) return undefined;
  return b ? "Oui" : "Non";
}

/** Concatène les familles d'objets cochées + précision « Autres » + champ hérité. */
function joinItems(
  arr?: string[],
  autre?: string,
  legacy?: string,
): string | undefined {
  const items = (arr ?? []).filter((x) => x !== "Autres (précisez)");
  const parts = [...items, autre, legacy]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function RequestDetails({ request }: { request: RequestDoc }) {
  if (request.type === "aerogommage") {
    return (
      <AerogommageDetails
        items={request.aerogommage ?? []}
        photosByItem={request.aerogommagePhotos ?? []}
        options={request.aerogommageOptions}
        customerCity={request.customer.city}
      />
    );
  }

  if (request.type === "collecte" && request.collecte) {
    const c = request.collecte;
    const ca = c.collectAddress;
    return (
      <>
        {ca && (ca.address || ca.city) && (
          <section>
            <SectionTitle>Adresse de collecte</SectionTitle>
            <p className="flex items-start gap-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 mt-0.5 text-zinc-500" />
              <span>
                {ca.address}
                {(ca.postalCode || ca.city) && (
                  <>
                    <br />
                    {ca.postalCode} {ca.city}
                  </>
                )}
              </span>
            </p>
            <CollecteMap address={ca} />
          </section>
        )}
        <section>
          <SectionTitle>Informations</SectionTitle>
          <div className="text-sm">
            <Row
              label="Sous-type"
              value={COLLECTE_TYPE_LABELS[request.collecteType ?? "indefini"]}
            />
            <Row label="Type de logement" value={c.housingType} />
            <Row
              label="Nombre d'étages"
              value={c.floors !== undefined ? String(c.floors) : undefined}
            />
            <Row label="Place dédiée / privée" value={yesNo(c.dedicatedParking)} />
            <Row
              label="Distance parking"
              value={
                c.parkingUnknown
                  ? "Non connue"
                  : c.parkingDistance !== undefined
                    ? `${c.parkingDistance} m${c.parkingDistance > 25 ? " · frais 15 € possibles" : ""}`
                    : c.parkingNearby !== undefined
                      ? yesNo(c.parkingNearby)
                      : undefined
              }
            />
          </div>
        </section>

        <section>
          <SectionTitle>Conditions du don</SectionTitle>
          <div className="text-sm">
            <Row
              label="Démontage possible par le client"
              value={yesNo(c.dismountable)}
            />
            <Row
              label="Objets en bon état / réemployables"
              value={yesNo(c.reusableGoodCondition)}
            />
            <Row label="Objets triés par famille" value={yesNo(c.sorted)} />
            <Row
              label="Don sans déchet / non collectable"
              value={yesNo(c.noWaste)}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Objets</SectionTitle>
          {(c.objectCategories?.length ?? 0) > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {c.objectCategories!.map((key) => {
                  const cat = COLLECTE_CATEGORY_BY_KEY[key];
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-1 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-2"
                    >
                      {cat?.image && (
                        <img src={cat.image} alt="" className="h-12 w-12 object-contain" />
                      )}
                      <span className="text-center text-[11px] leading-tight text-zinc-300">
                        {cat?.label ?? key}
                      </span>
                    </div>
                  );
                })}
              </div>
              {c.grosObjetsAutre && (
                <p className="mt-2 text-sm text-zinc-400">
                  <span className="text-zinc-500">Autre :</span> {c.grosObjetsAutre}
                </p>
              )}
            </>
          ) : (
            <div className="text-sm">
              <Row label="Gros objets" value={joinItems(c.grosObjets, c.grosObjetsAutre, c.largeItems)} />
              <Row label="Petits objets" value={joinItems(c.petitsObjets, c.petitsObjetsAutre, c.smallItems)} />
            </div>
          )}
        </section>

        <CollecteCategoryPhotos request={request} />
      </>
    );
  }

  if (request.type === "livraison" && request.livraison) {
    const l = request.livraison;
    const da = l.deliveryAddress;
    const slot = l.suggestedSlot;
    return (
      <>
        {da && (da.address || da.city) && (
          <section>
            <SectionTitle>Adresse de livraison</SectionTitle>
            <p className="flex items-start gap-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 mt-0.5 text-zinc-500" />
              <span>
                {da.address}
                {(da.postalCode || da.city) && (
                  <>
                    <br />
                    {da.postalCode} {da.city}
                  </>
                )}
              </span>
            </p>
            <CollecteMap address={da} />
          </section>
        )}

        <section>
          <SectionTitle>Article</SectionTitle>
          <div className="text-sm">
            <Row label="Désignation" value={l.articleTitle} />
            <Row label="Catégorie" value={l.category} />
            <Row label="Sous-catégorie" value={l.subcategory} />
            <Row
              label="Référence interne"
              value={
                l.reference
                  ? `${l.reference}${l.referenceFromBarcode ? " (code-barres)" : " (générée)"}`
                  : undefined
              }
            />
          </div>
          {(request.livraisonArticleUrl || request.livraisonReferenceUrl) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {request.livraisonArticleUrl && (
                <figure>
                  <a
                    href={request.livraisonArticleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
                  >
                    <img
                      src={request.livraisonArticleUrl}
                      alt="Article"
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                  <figcaption className="mt-1 text-center text-[11px] text-zinc-500">
                    Article
                  </figcaption>
                </figure>
              )}
              {request.livraisonReferenceUrl && (
                <figure>
                  <a
                    href={request.livraisonReferenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
                  >
                    <img
                      src={request.livraisonReferenceUrl}
                      alt="Référence"
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </a>
                  <figcaption className="mt-1 text-center text-[11px] text-zinc-500">
                    Référence / code-barres
                  </figcaption>
                </figure>
              )}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Frais de livraison</SectionTitle>
          <div className="text-sm">
            <Row
              label="Prix article"
              value={l.articlePrice !== undefined ? formatPrice(l.articlePrice) : undefined}
            />
            <Row
              label="Distance aller-retour (dépôt ↔ livraison)"
              value={l.distanceKm !== undefined ? `${l.distanceKm} km` : undefined}
            />
            <Row
              label="Frais (0,50 € / km · A/R)"
              value={l.deliveryFee !== undefined ? formatPrice(l.deliveryFee) : undefined}
            />
            <Row
              label="Acompte demandé"
              value={l.acompte !== undefined ? formatPrice(l.acompte) : undefined}
            />
          </div>
        </section>

        {slot && (
          <section>
            <SectionTitle>Créneau avantageux retenu</SectionTitle>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm">
              <p className="text-zinc-200">
                Livraison groupée avec la demande #{slot.requestReference}
                {slot.city ? ` · ${slot.city}` : ""}
              </p>
              <div className="mt-1 text-zinc-400">
                {slot.scheduledDate && (
                  <p>
                    Date : {format(new Date(slot.scheduledDate), "d MMMM yyyy", { locale: fr })}
                  </p>
                )}
                {slot.distanceKm !== undefined && <p>À {slot.distanceKm} km de la livraison</p>}
                {slot.reducedDeliveryFee !== undefined && (
                  <p>Livraison groupée : {formatPrice(slot.reducedDeliveryFee)}</p>
                )}
                {slot.discount !== undefined && slot.discount > 0 && (
                  <p className="font-semibold text-emerald-300">
                    Réduction proposée : −{formatPrice(slot.discount)}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  if (request.type === "velo" && request.velo) {
    const vlo = request.velo;
    return (
      <section>
        <SectionTitle>Informations</SectionTitle>
        <div className="text-sm">
          <Row label="Type de vélo" value={vlo.bikeType} />
          <Row label="Prestation" value={vlo.service} />
          <Row label="Marque / modèle" value={vlo.brand} />
          <Row label="État" value={vlo.condition} />
          <Row label="Description" value={vlo.description} />
        </div>
      </section>
    );
  }

  if (request.type === "article" && (request.articles?.length || request.article)) {
    const articles =
      request.articles?.length
        ? request.articles
        : request.article
          ? [request.article]
          : [];
    return (
      <div className="space-y-6">
        <ArticlePaymentSection request={request} />
        <ArticleRequestTabs articles={articles} />
      </div>
    );
  }

  return null;
}

function ArticlePaymentSection({ request }: { request: RequestDoc }) {
  const payment = request.payment;
  if (!payment) return null;

  const methodLabel =
    payment.method === "cb" ? "Carte bancaire" : "Espèces";
  const statusLabel = payment.validated ? "Validé" : "En attente";
  const capturedLabel =
    payment.method === "cb"
      ? payment.captured
        ? "Oui"
        : "Non"
      : "À encaisser en boutique";

  return (
    <section>
      <SectionTitle>Paiement</SectionTitle>
      <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
        <div className="space-y-2 text-sm">
          <Row label="Type de paiement" value={methodLabel} />
          <Row label="Paiement validé" value={statusLabel} />
          {payment.method === "cb" && (
            <>
              <Row label="Paiement prélevé" value={capturedLabel} />
              <Row
                label="Prestataire"
                value={payment.provider === "stripe" ? "Stripe" : undefined}
              />
              <Row
                label="Date d'encaissement"
                value={payment.paidAt ? formatDateTime(payment.paidAt) : undefined}
              />
              <Row label="Session Stripe" value={payment.stripeSessionId} mono />
              <Row
                label="Payment Intent"
                value={payment.stripePaymentIntentId}
                mono
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ArticleRequestTabs({
  articles,
}: {
  articles: Array<{ articleId: Id<"articles">; articleTitle?: string }>;
}) {
  const [selected, setSelected] = useState("0");
  const index = Math.min(Number(selected) || 0, articles.length - 1);
  const current = articles[index];

  if (articles.length <= 1) {
    return (
      <ArticleRequestPreview
        articleId={current.articleId}
        fallbackTitle={current.articleTitle}
      />
    );
  }

  return (
    <section>
      <SectionTitle>Articles réservés</SectionTitle>
      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-2 border-b border-[var(--crm-border)] pb-3">
        {articles.map((article, i) => {
          const key = String(i);
          const active = selected === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-[var(--crm-surface-2)] text-zinc-500 hover:bg-[var(--crm-surface-3)] hover:text-zinc-200",
              )}
              title={article.articleTitle ?? `Article ${i + 1}`}
            >
              Article {i + 1}
            </button>
          );
        })}
      </div>
      <ArticleRequestPreview
        articleId={current.articleId}
        fallbackTitle={current.articleTitle}
      />
    </section>
  );
}

function ArticleRequestPreview({
  articleId,
  fallbackTitle,
}: {
  articleId: Id<"articles">;
  fallbackTitle?: string;
}) {
  const article = useQuery(api.articles.getPublic, { id: articleId });
  const [lb, setLb] = useState<number | null>(null);

  if (article === undefined) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]">
        <div className="aspect-[4/3] w-full animate-pulse bg-[var(--crm-surface-3)]" />
        {fallbackTitle && (
          <div className="p-4">
            <p className="text-sm font-semibold text-zinc-100">{fallbackTitle}</p>
            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-[var(--crm-surface-3)]" />
          </div>
        )}
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-sm text-zinc-500">
        Article introuvable
      </div>
    );
  }

  const hasDiscount =
    article.originalPrice !== undefined &&
    article.originalPrice > article.price;

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--crm-surface)] shadow-[0_14px_34px_rgba(0,0,0,0.10)] ring-1 ring-[var(--crm-border)]">
      {article.imageUrls[0] ? (
        <button
          type="button"
          onClick={() => setLb(0)}
          className="block w-full cursor-zoom-in bg-[var(--crm-surface-2)]"
        >
          <img
            src={article.imageUrls[0]}
            alt={article.title}
            className="mx-auto h-72 w-auto max-w-full object-contain"
          />
        </button>
      ) : (
        <div className="flex h-72 w-full items-center justify-center bg-[var(--crm-surface-2)] text-zinc-600">
          <PackageOpen className="h-10 w-10" />
        </div>
      )}

      <div className="p-4">
        <p className="text-sm font-semibold leading-5 text-zinc-100">
          {article.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {article.internalReference && (
            <span className="rounded-full bg-[var(--crm-surface-2)] px-2.5 py-1 text-[11px] font-mono text-zinc-400">
              Réf. interne {article.internalReference}
            </span>
          )}
          {article.gdrReference && (
            <span className="rounded-full bg-[var(--crm-surface-2)] px-2.5 py-1 text-[11px] font-mono text-zinc-400">
              Réf. {article.gdrReference}
            </span>
          )}
          {article.weightKg !== undefined && (
            <span className="rounded-full bg-[var(--crm-surface-2)] px-2.5 py-1 text-[11px] text-zinc-400">
              {article.weightKg} kg
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="rounded-lg bg-brand-500 px-2 py-1 text-sm font-bold text-white">
                {formatPrice(article.price)}
              </span>
              <span className="text-xs font-medium text-zinc-500 line-through">
                {formatPrice(article.originalPrice!)}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-zinc-100">
              {formatPrice(article.price)}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">{article.category}</p>
      </div>

      {lb !== null && (
        <Lightbox
          images={article.imageUrls}
          startIndex={lb}
          onClose={() => setLb(null)}
        />
      )}
    </div>
  );
}

/** Détails aérogommage avec onglets pour basculer d'un objet à l'autre. */
function AerogommageDetails({
  items,
  photosByItem,
  options,
  customerCity,
}: {
  items: NonNullable<RequestDoc["aerogommage"]>;
  photosByItem: string[][];
  options?: RequestDoc["aerogommageOptions"];
  customerCity?: string;
}) {
  const [sel, setSel] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  if (items.length === 0) return null;
  const idx = Math.min(sel, items.length - 1);
  const a = items[idx];
  const photos = photosByItem[idx] ?? [];
  const legacyPickup = items.some((item) => item.retrieval);
  const legacyDelivery = items.some((item) => item.delivery);
  const pickupAtHome = options?.pickupAtHome ?? legacyPickup;
  const deliveryAtHome = options?.deliveryAtHome ?? legacyDelivery;
  const pickupCity = options?.pickupAddress?.city ?? customerCity;
  const deliveryCity = options?.deliveryAddress?.city ?? customerCity;

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle>Transport</SectionTitle>
        <div className="text-sm">
          <Row
            label="Retrait à domicile"
            value={pickupAtHome ? `Oui${pickupCity ? ` · ${pickupCity}` : ""}` : "Non"}
          />
          <Row
            label="Livraison à domicile"
            value={deliveryAtHome ? `Oui${deliveryCity ? ` · ${deliveryCity}` : ""}` : "Non"}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Objets à aérogommer ({items.length})</SectionTitle>
      {items.length > 1 && (
        <UnderlineTabs
          items={items.map((it, i) => ({
            key: String(i),
            label: it.objectType?.trim() || it.label?.trim() || `Objet ${i + 1}`,
          }))}
          value={String(idx)}
          onChange={(value) => setSel(Number(value))}
          className="mb-3"
          size="sm"
        />
      )}
      <div className="text-sm">
        <Row
          label="Type d'objet"
          value={
            a.objectType === "Autre (veuillez préciser)"
              ? a.label || a.objectType
              : a.objectType
          }
        />
        <Row
          label="Dimensions"
          value={
            a.height && a.width && a.depth
              ? `${a.height} × ${a.width} × ${a.depth} cm`
              : undefined
          }
        />
        <Row label="Quantité" value={a.quantity ? String(a.quantity) : undefined} />
        <Row label="Nature du bois" value={a.woodType} />
        <Row label="Décapage" value={a.stripping} />
        <Row
          label="Revêtement"
          value={
            a.coating === "Autre (précisez)"
              ? a.coatingOther || a.coating
            : a.coating
          }
        />
        {a.comment && <Row label="Commentaire" value={a.comment} />}
      </div>

      {photos.length > 0 && (
        <div className="mt-3">
          <PhotoGrid urls={photos} onOpen={setLb} />
        </div>
      )}

      {lb !== null && (
        <Lightbox images={photos} startIndex={lb} onClose={() => setLb(null)} />
      )}
      </section>
    </div>
  );
}
