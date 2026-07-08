import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Share2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUpload } from "../lib/useUpload";
import { cn } from "../lib/cn";
import { confirmDialog } from "../lib/confirm";
import { Modal } from "./ui/Modal";
import { FileTypePreview } from "./ui/FileTypePreview";
import { Button } from "./ui/Button";

export type RequestDocumentType =
  | "devis"
  | "facture"
  | "bon_commande"
  | "bon_collecte"
  | "contrat"
  | "photo"
  | "autre";

const DOC_TYPES: { value: RequestDocumentType; label: string }[] = [
  { value: "devis", label: "Devis" },
  { value: "facture", label: "Facture" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "bon_collecte", label: "Bon de collecte" },
  { value: "contrat", label: "Contrat" },
  { value: "photo", label: "Photo" },
  { value: "autre", label: "Autre" },
];

const DOC_LABELS = Object.fromEntries(
  DOC_TYPES.map((type) => [type.value, type.label]),
) as Record<RequestDocumentType, string>;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RequestDocumentsPanel({
  requestId,
  theme = "dark",
  viewerRole = "staff",
  customerName,
}: {
  requestId: Id<"requests">;
  theme?: "dark" | "light";
  viewerRole?: "staff" | "client";
  customerName?: string;
}) {
  const rawDocuments = useQuery(api.documents.listForRequest, { requestId });
  // Sécurité (défense en profondeur) : côté client, on n'affiche JAMAIS un
  // document interne de l'équipe tant qu'il n'a pas été explicitement partagé,
  // même si l'API venait à en renvoyer un. Seuls les documents partagés ou
  // déposés par le client lui-même sont visibles.
  const documents =
    viewerRole === "staff"
      ? rawDocuments
      : rawDocuments?.filter(
          (document) =>
            document.uploadedByRole === "client" || document.sharedWithClientAt != null,
        );
  const addDocument = useMutation(api.documents.addToRequest);
  const removeDocument = useMutation(api.documents.removeFromRequest);
  const shareDocument = useMutation(api.documents.shareWithClient);
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedTypeRef = useRef<RequestDocumentType>("devis");
  const [docType, setDocType] = useState<RequestDocumentType>("devis");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sharingId, setSharingId] = useState<Id<"requestDocuments"> | null>(null);
  const dark = theme === "dark";
  const canManageDocuments = viewerRole === "staff";

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        await addDocument({
          requestId,
          storageId,
          name: file.name,
          docType: selectedTypeRef.current,
          mimeType: file.type || undefined,
        });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function chooseTypeAndUpload(type: RequestDocumentType) {
    selectedTypeRef.current = type;
    setDocType(type);
    setTypeModalOpen(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  }

  async function handleShare(documentId: Id<"requestDocuments">) {
    const clientLabel = customerName?.trim() || "ce client";
    const confirmed = await confirmDialog({
      title: "Partager avec le client",
      description: `Êtes-vous sûr(e) de vouloir partager ce document avec "${clientLabel}" ?`,
      confirmLabel: "Oui",
      cancelLabel: "Non",
      tone: "primary",
    });
    if (!confirmed) return;
    setSharingId(documentId);
    try {
      await shareDocument({ documentId });
    } finally {
      setSharingId(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        dark ? "border-zinc-800 bg-zinc-950/35" : "border-zinc-200 bg-white",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={cn("text-sm font-semibold", dark ? "text-zinc-100" : "text-zinc-900")}>
            Documents
          </h3>
          <p className={cn("mt-0.5 text-xs", dark ? "text-zinc-500" : "text-zinc-500")}>
            {canManageDocuments
              ? "Ajoutez devis, factures, bons ou tout autre document utile."
              : "Consultez les devis, factures et documents partagés par notre équipe."}
          </p>
        </div>
        {canManageDocuments && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTypeModalOpen(true)}
              disabled={uploading}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                dark
                  ? "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
                  : "bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60",
              )}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Ajouter
            </button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        )}
      </div>

      {canManageDocuments && (
        <Modal
          open={typeModalOpen}
          onClose={() => setTypeModalOpen(false)}
          title="Ajouter un document"
          className={dark ? "dark max-w-xl" : "max-w-xl"}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Sélectionnez le type du document, puis choisissez le fichier à importer.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOC_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => chooseTypeAndUpload(type.value)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition",
                    docType === type.value
                      ? "border-brand-500 bg-brand-500/10 text-[var(--foreground)]"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-brand-500/50 hover:bg-[var(--accent)]",
                  )}
                >
                  <span className="text-sm font-semibold">{type.label}</span>
                  <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                    Importer comme {type.label.toLowerCase()}.
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <div className="mt-4 divide-y divide-zinc-200/10">
        {documents === undefined ? (
          <div className={cn("flex items-center gap-2 py-6 text-sm", dark ? "text-zinc-500" : "text-zinc-500")}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des documents...
          </div>
        ) : documents.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed px-4 py-8 text-center text-sm",
              dark ? "border-zinc-800 text-zinc-500" : "border-zinc-200 text-zinc-500",
            )}
          >
            Aucun document pour le moment.
          </div>
        ) : (
          documents.map((document) => (
            <div key={document._id} className="flex flex-wrap items-center gap-3 py-3">
              <FileTypePreview
                name={document.name}
                mimeType={document.mimeType}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-semibold", dark ? "text-zinc-100" : "text-zinc-900")}>
                  {document.name}
                </p>
                <p className={cn("mt-0.5 text-xs", dark ? "text-zinc-500" : "text-zinc-500")}>
                  {DOC_LABELS[document.docType as RequestDocumentType] ?? "Document"} ·{" "}
                  {document.uploadedByRole === "staff" ? "Équipe" : "Client"} ·{" "}
                  {formatDate(document.createdAt)}
                </p>
              </div>
              {canManageDocuments && document.uploadedByRole === "staff" && (
                document.sharedWithClientAt ? (
                  <span
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold",
                      dark
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700",
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Partagé client
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleShare(document._id)}
                    disabled={sharingId === document._id}
                    className={dark ? "" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"}
                  >
                    {sharingId === document._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    Partager avec le client
                  </Button>
                )
              )}
              {document.url && (
                <a
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "rounded-lg p-2 transition",
                    dark ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                  aria-label="Télécharger"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
              {canManageDocuments && (
                <button
                  type="button"
                  onClick={() => removeDocument({ documentId: document._id })}
                  className={cn(
                    "rounded-lg p-2 transition",
                    dark ? "text-zinc-500 hover:bg-red-500/10 hover:text-red-300" : "text-zinc-400 hover:bg-red-50 hover:text-red-600",
                  )}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
