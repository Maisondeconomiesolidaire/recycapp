import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useUpload } from "../../lib/useUpload";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";

interface LocalPhoto {
  storageId: Id<"_storage">;
  previewUrl: string;
}

/**
 * Zone d'upload de photos multi-fichiers. Envoie chaque image vers Convex et
 * remonte la liste des storageId via `onChange`.
 */
export function PhotoUpload({
  onChange,
  className,
}: {
  /** Liste contrôlée des storageId (gérée par le parent). */
  value: Id<"_storage">[];
  onChange: (ids: Id<"_storage">[]) => void;
  className?: string;
}) {
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const added: LocalPhoto[] = [];
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        added.push({ storageId, previewUrl: URL.createObjectURL(file) });
      }
      const next = [...photos, ...added];
      setPhotos(next);
      onChange(next.map((p) => p.storageId));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: Id<"_storage">) {
    const next = photos.filter((p) => p.storageId !== id);
    setPhotos(next);
    onChange(next.map((p) => p.storageId));
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((p) => (
          <div
            key={p.storageId}
            className="relative aspect-square rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 group"
          >
            <img
              src={p.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(p.storageId)}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "aspect-square rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700",
            "flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-brand-600 hover:border-brand-400 transition-colors",
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Ajouter</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
