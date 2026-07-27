import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { useUpload } from "../../lib/useUpload";
import { cn } from "../../lib/cn";
import { COLLECTE_CATEGORIES } from "../../lib/constants";
import type { Id } from "../../../convex/_generated/dataModel";

export type CategoryPhoto = { storageId: Id<"_storage">; previewUrl: string };
export type CategoryPhotoMap = Record<string, CategoryPhoto[]>;

/**
 * Sélection des objets à collecter par pictogrammes : toucher une catégorie
 * ouvre immédiatement le sélecteur de photos ; une catégorie est « cochée »
 * dès qu'elle contient au moins une photo. Partagé boutique (clair) + CRM (sombre).
 */
export function CollecteCategoryPicker({
  value,
  onChange,
  theme = "light",
}: {
  value: CategoryPhotoMap;
  onChange: (next: CategoryPhotoMap) => void;
  theme?: "light" | "dark";
}) {
  const upload = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategoryRef = useRef<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const dark = theme === "dark";

  function openPicker(categoryKey: string) {
    activeCategoryRef.current = categoryKey;
    fileInputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    const categoryKey = activeCategoryRef.current;
    if (!files || files.length === 0 || !categoryKey) return;
    setUploadingCategory(categoryKey);
    try {
      const added: CategoryPhoto[] = [];
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        added.push({ storageId, previewUrl: URL.createObjectURL(file) });
      }
      onChange({ ...value, [categoryKey]: [...(value[categoryKey] ?? []), ...added] });
    } finally {
      setUploadingCategory(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(categoryKey: string, storageId: Id<"_storage">) {
    const remaining = (value[categoryKey] ?? []).filter((p) => p.storageId !== storageId);
    const next = { ...value };
    if (remaining.length > 0) next[categoryKey] = remaining;
    else delete next[categoryKey];
    onChange(next);
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {COLLECTE_CATEGORIES.map((cat) => {
          const photos = value[cat.key] ?? [];
          const checked = photos.length > 0;
          const uploading = uploadingCategory === cat.key;
          return (
            <div key={cat.key} className="relative flex flex-col">
              <button
                type="button"
                onClick={() => openPicker(cat.key)}
                aria-pressed={checked}
                aria-label={cat.label}
                className="relative block"
              >
                {checked && (
                  <span className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
                <img
                  src={cat.image}
                  alt={cat.label}
                  loading="lazy"
                  className={cn(
                    "aspect-square w-full rounded-2xl object-cover transition",
                    checked
                      ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent"
                      : "hover:opacity-90",
                  )}
                />
              </button>

              {(photos.length > 0 || uploading) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {photos.map((p) => (
                    <div key={p.storageId} className="relative h-12 w-12 overflow-hidden rounded-lg">
                      <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(cat.key, p.storageId)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label="Retirer la photo"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => openPicker(cat.key)}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg border border-dashed transition",
                      dark
                        ? "border-[var(--crm-border-strong)] text-zinc-400 hover:text-brand-300"
                        : "border-zinc-300 text-zinc-400 hover:border-brand-400 hover:text-brand-500",
                    )}
                    aria-label="Ajouter une photo"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Construit le tableau `categoryPhotos` (pour la mutation) à partir de la map. */
export function buildCategoryPhotosPayload(value: CategoryPhotoMap) {
  return COLLECTE_CATEGORIES.map((c) => c.key)
    .filter((key) => (value[key]?.length ?? 0) > 0)
    .map((key) => ({
      category: key,
      photos: (value[key] ?? []).map((p) => p.storageId),
    }));
}

/** Clés des catégories ayant au moins une photo. */
export function selectedCategoryKeys(value: CategoryPhotoMap) {
  return COLLECTE_CATEGORIES.map((c) => c.key).filter((key) => (value[key]?.length ?? 0) > 0);
}
