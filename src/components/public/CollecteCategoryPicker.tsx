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

  const tileBase = dark
    ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] hover:border-[var(--crm-border-strong)]"
    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50";
  const tileActive = dark
    ? "border-brand-500 bg-brand-500/10"
    : "border-brand-500 bg-brand-50 shadow-sm";
  const labelActive = dark ? "text-brand-300" : "text-brand-700";
  const labelIdle = dark ? "text-zinc-300" : "text-zinc-700";

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
            <div
              key={cat.key}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 p-3 transition",
                checked ? tileActive : tileBase,
              )}
            >
              <button
                type="button"
                onClick={() => openPicker(cat.key)}
                aria-pressed={checked}
                className="flex flex-col items-center gap-2 text-center"
              >
                {checked && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <img
                  src={cat.image}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 object-contain"
                />
                <span
                  className={cn(
                    "text-xs font-semibold leading-tight",
                    checked ? labelActive : labelIdle,
                  )}
                >
                  {cat.label}
                </span>
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
