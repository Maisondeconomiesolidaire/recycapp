import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Camera, ImagePlus, Loader2, Plus, Printer, QrCode as QrCodeIcon, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { QrCode } from "../ui/QrCode";
import { useUpload } from "../../lib/useUpload";

type PendingPhoto = { file: File; previewUrl: string };
type CreatedArticle = { id: Id<"articles">; internalReference: string };

/**
 * Ajout rapide au stock : on ne saisit QUE des photos, une par article. Chaque
 * photo crée un article brouillon avec sa référence interne, donc son QR code,
 * imprimable immédiatement. L'annonce et le détourage arrivent ensuite via un
 * « run » IA groupé depuis la liste des articles.
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
  const upload = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [location, setLocation] = useState("");
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

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function closeAll() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setLocation("");
    setCreated(null);
    setError("");
    onClose();
  }

  async function save() {
    if (photos.length === 0) {
      setError("Ajoutez au moins une photo.");
      return;
    }
    if (location.trim() && !/^\d{4}$/.test(location.trim())) {
      setError("L'emplacement doit contenir exactement 4 chiffres.");
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
        location: location.trim() || undefined,
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
    <Modal open={open} onClose={closeAll} title="Ajouter des articles par photo" className="sm:max-w-2xl">
      <div className="space-y-5 p-5">
        <p className="text-sm text-zinc-400">
          Une photo = un article. Les articles sont créés en brouillon avec leur
          référence et leur QR code ; le titre, le prix et la description seront
          générés plus tard par un run IA.
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={photo.previewUrl}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)]"
              >
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
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--crm-border)] px-4 py-10 text-center">
            <QrCodeIcon className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">Aucune photo pour l'instant.</p>
          </div>
        )}

        <Field label="Emplacement" hint="Optionnel · 4 chiffres, appliqué à tous les articles créés">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="9282"
            inputMode="numeric"
          />
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
    </Modal>
  );
}
