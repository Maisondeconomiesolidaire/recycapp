import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUpload } from "../../lib/useUpload";
import {
  CalendarDays,
  MapPin,
  PackageOpen,
  XCircle,
  RotateCcw,
  Check,
  ImagePlus,
  Loader2,
  MessageSquareText,
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
import { Modal } from "../ui/Modal";
import { TypeBadge } from "./TypeBadge";
import { PhoneInput } from "../ui/PhoneInput";
import { RequestOriginBadge } from "./RequestOriginBadge";
import {
  OUTCOME_LABELS,
  COLLECTE_TYPE_OPTIONS,
  COLLECTE_TYPE_LABELS,
  COLLECTE_CATEGORY_BY_KEY,
  CollecteType,
  TYPE_COLORS,
  SITE_LABELS,
  Site,
} from "../../lib/constants";
import { STEP } from "../../../convex/processes";
import { formatDateTime, formatPrice } from "../../lib/format";
import { cn } from "../../lib/cn";

type RequestDoc = NonNullable<ReturnType<typeof useQuery<typeof api.requests.get>>>;
type Tab = "demande" | "gestion" | "client" | "messages";

const TABS: { key: Tab; label: string }[] = [
  { key: "demande", label: "Demande" },
  { key: "gestion", label: "Gestion" },
  { key: "client", label: "Client" },
  { key: "messages", label: "Messages" },
];

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
  const [tab, setTab] = useState<Tab>("demande");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [lostReason, setLostReason] = useState<LostReasonValue | "">("");
  const [lostReasonDetails, setLostReasonDetails] = useState("");
  const [cancelError, setCancelError] = useState("");

  const open = requestId !== null;

  const collecteUndefined =
    request?.type === "collecte" &&
    (request.collecteType ?? "indefini") === "indefini";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      variant="modal"
      panelClassName="border-0 shadow-[0_28px_90px_rgba(0,0,0,0.18)]"
      bodyClassName="p-6 sm:p-7"
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

            <div className="ml-auto flex items-center gap-2 pl-3">
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
          {/* Onglets */}
          <UnderlineTabs
            items={TABS}
            value={tab}
            onChange={setTab}
            className="mb-5"
            size="sm"
          />

          {tab === "demande" && <DemandeTab request={request} />}
          {tab === "gestion" && (
            <GestionTab request={request} collecteUndefined={!!collecteUndefined} />
          )}
          {tab === "client" && (
            <ClientTab key={request._id} request={request} />
          )}
          {tab === "messages" && (
            <div className="h-[60vh]">
              <MessageThread requestId={request._id} viewerRole="staff" theme="dark" />
            </div>
          )}
        </div>
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

function DemandeTab({ request }: { request: RequestDoc }) {
  const [lb, setLb] = useState<number | null>(null);

  const meta = (
    <>
      {request.comment && (
        <section>
          <SectionTitle>Commentaire</SectionTitle>
          <p className="text-sm text-zinc-300 whitespace-pre-line rounded-lg bg-zinc-800/50 p-3">
            {request.comment}
          </p>
        </section>
      )}

      {request.outcome === "perdue" && request.lostReason && (
        <section>
          <SectionTitle>Motif d'annulation</SectionTitle>
          <p className="rounded-lg bg-zinc-800/50 p-3 text-sm text-zinc-300">
            {request.lostReason === "devis_refuse" && "Devis refusé"}
            {request.lostReason === "pas_de_retour_client" &&
              "Pas de retour client"}
            {request.lostReason === "autre" &&
              (request.lostReasonDetails || "Autre")}
          </p>
        </section>
      )}

      {request.photoUrls.length > 0 && (
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

      {lb !== null && (
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

  return (
    <div className="space-y-6">
      <RequestDetails request={request} />
      {meta}
    </div>
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
            ? "cursor-not-allowed border-zinc-700 bg-zinc-900/70 text-zinc-500 opacity-70"
            : "border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:border-brand-500/60 hover:bg-zinc-900 hover:text-zinc-100",
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
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {urls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800"
        >
          <button
            type="button"
            onClick={() => onOpen(i)}
            className="h-full w-full hover:opacity-90"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
          </button>
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

/* ------------------------------------------------------------------ Gestion */

function GestionTab({
  request,
  collecteUndefined,
}: {
  request: RequestDoc;
  collecteUndefined: boolean;
}) {
  const { user } = useUser();
  const advance = useMutation(api.requests.advanceProcess);
  const retreat = useMutation(api.requests.retreatProcess);
  const addProcessNote = useMutation(api.requests.addProcessNote);
  const setCollecteType = useMutation(api.requests.setCollecteType);
  const schedule = useMutation(api.requests.schedule);
  const patch = useMutation(api.requests.patchManagement);
  const team = useQuery(api.team.list, {}) ?? [];

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const patchVisit = useMutation(api.requests.patchManagement);
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const currentUser =
    user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;

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
    if (!request.estimatedHours)
      stepBlockers[STEP.devisEdite] =
        "Renseignez les heures estimées (champ « Temps estimé ») avant de cocher cette étape.";
    if (!request.scheduledDate)
      stepBlockers[STEP.prestaPlanifiee] =
        "Programmez une date avant de cocher cette étape.";
    if (!request.actualHours)
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
    if (!request.actualHours)
      stepBlockers[STEP.prestaTerminee] =
        "Renseignez les heures réelles (champ « Temps réel passé ») avant de cocher cette étape.";
  }
  if (request.type === "article" && linkedArticle && !linkedArticle.gdrReference) {
    stepBlockers[STEP.factureReglee] =
      "Renseignez la référence GDR de l'article avant de clôturer la vente.";
  }

  return (
    <div className="space-y-6">
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
          {collecteUndefined && (
            <p className="mt-2 text-xs text-amber-400">
              Choisissez C1, C2 ou C3 pour démarrer le suivi du process.
            </p>
          )}
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
              patch({ id: request._id, site: e.target.value as Site })
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
        </div>
      </section>

      {request.type === "collecte" && (
        <section>
          <SectionTitle>Options de collecte</SectionTitle>
          <Checkbox
            label="Visite nécessaire"
            description="Une visite préalable est requise avant la collecte."
            checked={request.visitNeeded ?? false}
            onChange={(e) =>
              patchVisit({ id: request._id, visitNeeded: e.target.checked })
            }
            className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
          />
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
                ? format(new Date(request.scheduledDate), "EEEE d MMMM yyyy", { locale: fr })
                : "Programmer une date"}
            </span>
          </button>
          {request.scheduledDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                schedule({ id: request._id, scheduledDate: undefined })
              }
            >
              Retirer
            </Button>
          )}
        </div>
        <ScheduleCalendarModal
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          value={request.scheduledDate}
          onChange={(scheduledDate) => {
            schedule({ id: request._id, scheduledDate });
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
              patch({ id: request._id, estimatedHours: num(e.target.value) })
            }
          />
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
              patch({ id: request._id, actualHours: num(e.target.value) })
            }
          />
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
                patch({ id: request._id, quoteAmount: num(e.target.value) })
              }
            />
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
                })
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- Client */

function ClientTab({ request }: { request: RequestDoc }) {
  const update = useMutation(api.requests.updateCustomer);
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
    <div className="space-y-5">
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
    </div>
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
      <p className="text-sm text-zinc-500 rounded-lg bg-zinc-800/40 p-3">
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            <span>Complétude</span>
            <span className="text-brand-300">{completionPercent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
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
                          ? "border-zinc-700 bg-[linear-gradient(180deg,var(--crm-surface-2),var(--crm-surface-3))] text-zinc-200 shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-brand-500"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
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
                              : "border-zinc-700 bg-zinc-950/70 text-transparent",
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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/55 p-4">
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
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
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
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/35 p-4 text-sm text-zinc-500">
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
    <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800">
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
    <div className="flex justify-between gap-4 py-1.5 border-b border-zinc-800/60 last:border-0">
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

        {(request.collecteCategoryPhotos?.length ?? 0) > 0 && (
          <section>
            <SectionTitle>Photos des objets</SectionTitle>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {request.collecteCategoryPhotos!.flatMap((entry) => {
                const cat = COLLECTE_CATEGORY_BY_KEY[entry.category];
                return entry.urls.map((url, i) => (
                  <a
                    key={`${entry.category}-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
                  >
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {cat?.image && (
                      <span
                        title={cat.label}
                        className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow ring-1 ring-black/5"
                      >
                        <img src={cat.image} alt="" className="h-5 w-5 object-contain" />
                      </span>
                    )}
                  </a>
                ));
              })}
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
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
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="aspect-[4/3] w-full animate-pulse bg-zinc-800" />
        {fallbackTitle && (
          <div className="p-4">
            <p className="text-sm font-semibold text-zinc-100">{fallbackTitle}</p>
            <div className="mt-2 h-4 w-16 animate-pulse rounded bg-zinc-800" />
          </div>
        )}
      </div>
    );
  }

  if (article === null) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-500">
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
              GDR {article.gdrReference}
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
}: {
  items: NonNullable<RequestDoc["aerogommage"]>;
  photosByItem: string[][];
}) {
  const [sel, setSel] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  if (items.length === 0) return null;
  const idx = Math.min(sel, items.length - 1);
  const a = items[idx];
  const photos = photosByItem[idx] ?? [];

  return (
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
        <Row label="Livraison à domicile" value={yesNo(a.delivery)} />
        <Row label="Retrait à domicile" value={yesNo(a.retrieval)} />
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
  );
}
