import { lazy, Suspense, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Camera,
  ImagePlus,
  Loader2,
  Plus,
  Printer,
  QrCode as QrCodeIcon,
  ScanLine,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { SearchableSelect } from "../ui/SearchableSelect";
import { QrCode } from "../ui/QrCode";
import { useUpload } from "../../lib/useUpload";
import { normalizeScanCode } from "../../lib/labels";

const CameraScanner = lazy(() =>
  import("../ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

type PendingPhoto = {
  file: File;
  previewUrl: string;
  /** QR code déjà collé sur l'objet ; vide = référence tirée à la création. */
  qrReference?: string;
};
type CreatedArticle = { id: Id<"articles">; internalReference: string };

/**
 * Ajout rapide au stock : on ne saisit QUE des photos, une par article.
 *
 * Deux façons de travailler cohabitent :
 *   - on scanne le QR code DÉJÀ collé sur l'objet (étiquettes imprimées à
 *     l'avance depuis « Nouveau QR code ») — l'objet est étiqueté avant même
 *     d'exister en base ;
 *   - ou on laisse une référence se générer, et on imprime l'étiquette après.
 *
 * L'annonce et le détourage arrivent ensuite via un « run » IA groupé.
 */
export function PhotoQuickAdd({
  open,
  onClose,
  onPrintQr,
}: {
  open: boolean;
  onClose: () => void;
  onPrintQr: (articleIds: Id<"articles">[]) => void;
}) {
  const createDrafts = useMutation(api.articles.createDraftsFromPhotos);
  const caisses = useQuery(api.caisses.list, {});
  const upload = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [caisseId, setCaisseId] = useState<Id<"caisses"> | "">("");
  const [scanOpen, setScanOpen] = useState(false);
  /** Index de la photo dont on scanne le QR code, `null` si aucun scan en cours. */
  const [qrScanIndex, setQrScanIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedArticle[] | null>(null);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setPhotos((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function setPhotoQr(index: number, reference: string | undefined) {
    setPhotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, qrReference: reference } : photo)),
    );
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function closeAll() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setCaisseId("");
    setCreated(null);
    setError("");
    onClose();
  }

  async function save() {
    if (photos.length === 0) {
      setError("Ajoutez au moins une photo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const storageIds: Id<"_storage">[] = [];
      for (const photo of photos) {
        storageIds.push(await upload(photo.file));
      }
      const result = await createDrafts({
        storageIds,
        caisseId: caisseId || undefined,
        qrReferences: photos.map((photo) => photo.qrReference ?? ""),
      });
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <Modal
        open={open}
        onClose={closeAll}
        title={`${created.length} article${created.length > 1 ? "s" : ""} créé${
          created.length > 1 ? "s" : ""
        }`}
        className="sm:max-w-2xl"
      >
        <div className="space-y-5 p-5">
          <p className="text-sm text-zinc-400">
            Un QR code a été généré pour chaque article. Imprimez-les et collez-les
            sur les produits, puis lancez un « Nouveau run » pour générer les
            annonces et détourer les photos.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {created.map((article) => (
              <div
                key={article.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--crm-border)] bg-white p-3"
              >
                <QrCode value={article.internalReference} size={92} className="text-black" />
                <span className="font-mono text-xs font-semibold text-black">
                  {article.internalReference}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={closeAll}>
              Fermer
            </Button>
            <Button
              onClick={() => {
                const ids = created.map((article) => article.id);
                closeAll();
                onPrintQr(ids);
              }}
            >
              <Printer className="h-4 w-4" />
              Imprimer les QR codes
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={closeAll} title="Ajout rapide" className="sm:max-w-2xl">
      <div className="space-y-5 p-5">
        <p className="text-sm text-zinc-400">
          Une photo = un article. Scannez le QR code déjà collé sur l'objet, ou
          laissez vide pour qu'une référence soit générée. Le titre, le prix et
          la description arrivent plus tard, via un run IA.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            Prendre une photo
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Choisir des photos
          </Button>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.previewUrl}
                className="group overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
              >
                <div className="relative aspect-square">
                  <img
                    src={photo.previewUrl}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {photo.qrReference ? (
                  <button
                    type="button"
                    onClick={() => setPhotoQr(index, undefined)}
                    title="Retirer ce QR code"
                    className="flex w-full items-center justify-center gap-1.5 px-2 py-2 font-mono text-xs font-semibold text-emerald-300 transition hover:bg-[var(--crm-surface-3)]"
                  >
                    <QrCodeIcon className="h-3.5 w-3.5 shrink-0" />
                    {photo.qrReference}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQrScanIndex(index)}
                    className="flex w-full items-center justify-center gap-1.5 px-2 py-2 text-xs text-zinc-400 transition hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                  >
                    <ScanLine className="h-3.5 w-3.5 shrink-0" />
                    Scanner le QR code
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--crm-border)] px-4 py-10 text-center">
            <QrCodeIcon className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">Aucune photo pour l'instant.</p>
          </div>
        )}

        <Field
          label="Caisse"
          hint="Optionnel · tapez le numéro ou scannez le QR code, appliqué à tous les articles créés"
        >
          <div className="flex gap-2">
            <SearchableSelect
              className="flex-1"
              value={caisseId}
              onChange={(next) => setCaisseId(next as Id<"caisses"> | "")}
              options={(caisses ?? []).map((caisse) => ({
                value: caisse._id,
                label: caisse.label ? `${caisse.code} — ${caisse.label}` : caisse.code,
                hint: caisse.zone,
              }))}
              placeholder="— Aucune caisse —"
              searchPlaceholder="Numéro ou nom de caisse…"
              emptyLabel="Aucune caisse ne correspond."
            />
            <Button
              variant="outline"
              onClick={() => setScanOpen(true)}
              title="Scanner le QR code de la caisse"
            >
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scanner</span>
            </Button>
          </div>
        </Field>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeAll}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || photos.length === 0}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving
              ? "Création…"
              : `Ajouter ${photos.length || ""} article${photos.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      {/* Scan du QR code déjà collé sur l'objet, pour une photo donnée. */}
      {qrScanIndex !== null && (
        <div className="fixed inset-0 z-[300] bg-black">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            }
          >
            <CameraScanner
              onDetected={(code) => {
                const index = qrScanIndex;
                setQrScanIndex(null);
                const digits = code.replace(/\D/g, "").slice(0, 6);
                if (digits.length === 6) {
                  setPhotoQr(index, digits);
                  setError("");
                } else {
                  setError(`« ${code} » n'est pas un QR code d'article.`);
                }
              }}
              onClose={() => setQrScanIndex(null)}
            />
          </Suspense>
        </div>
      )}

      {/* Scan du QR code de la caisse de rangement. */}
      {scanOpen && (
        <div className="fixed inset-0 z-[300] bg-black">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            }
          >
            <CameraScanner
              onDetected={(code) => {
                setScanOpen(false);
                const normalized = normalizeScanCode(code);
                const found = (caisses ?? []).find((c) => c.code === normalized);
                if (found) {
                  setCaisseId(found._id);
                  setError("");
                } else {
                  setError(`Aucune caisse ne correspond au code « ${normalized} ».`);
                }
              }}
              onClose={() => setScanOpen(false)}
            />
          </Suspense>
        </div>
      )}
    </Modal>
  );
}
