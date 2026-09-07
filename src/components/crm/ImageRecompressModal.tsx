import { useState } from "react";
import { useMutation } from "convex/react";
import { ImageDown, Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { optimizeImageFile, useUpload } from "../../lib/useUpload";
import { errorMessage } from "../../lib/convexError";

/** Au-delà, une photo d'article est à recompresser (une carte en affiche 400px). */
const HEAVY_BYTES = 500 * 1024;

type ArticleWithUrls = Doc<"articles"> & { imageUrls: string[] };

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1024)} Ko`;
}

/**
 * Rattrapage des photos trop lourdes.
 *
 * Les photos détourées étaient stockées en PNG de 2 à 3 Mo, annoncées
 * `image/webp` : un navigateur sans encodeur WebP renvoie du PNG et l'ancien
 * code le croyait sur parole. La correction vaut pour les envois à venir ;
 * celles déjà en ligne se rattrapent ici, depuis un navigateur — le runtime
 * Convex n'a pas d'encodeur d'image.
 */
export function ImageRecompressModal({
  open,
  onClose,
  articles,
}: {
  open: boolean;
  onClose: () => void;
  articles: ArticleWithUrls[] | undefined;
}) {
  const upload = useUpload();
  const replaceImages = useMutation(api.articles.replaceImages);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [saved, setSaved] = useState(0);
  const [current, setCurrent] = useState("");
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  const candidates = articles ?? [];

  async function run() {
    setRunning(true);
    setError("");
    setFinished(false);
    setDone(0);
    setSaved(0);
    let gained = 0;
    try {
      for (const article of candidates) {
        setCurrent(article.title);
        const next: Id<"_storage">[] = [];
        let changed = false;
        for (let index = 0; index < article.imageUrls.length; index += 1) {
          const url = article.imageUrls[index];
          const original = article.images[index];
          if (!original) continue;
          const response = await fetch(url);
          if (!response.ok) {
            next.push(original);
            continue;
          }
          const blob = await response.blob();
          if (blob.size <= HEAVY_BYTES) {
            next.push(original);
            continue;
          }
          const file = new File([blob], `article-${index + 1}.png`, {
            type: blob.type || "image/png",
          });
          const optimized = await optimizeImageFile(file);
          // Une photo déjà optimale ne gagne rien à repasser par le stockage.
          if (optimized.size >= blob.size) {
            next.push(original);
            continue;
          }
          next.push(await upload(optimized));
          gained += blob.size - optimized.size;
          changed = true;
        }
        if (changed && next.length > 0) {
          await replaceImages({ id: article._id, images: next });
        }
        setDone((value) => value + 1);
        setSaved(gained);
      }
      setFinished(true);
    } catch (caught) {
      setError(errorMessage(caught, "Recompression impossible."));
    } finally {
      setRunning(false);
      setCurrent("");
    }
  }

  return (
    <Modal
      open={open}
      onClose={running ? () => undefined : onClose}
      title="Alléger les photos"
      className="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-[var(--muted-foreground)]">
          Les photos de plus de {formatBytes(HEAVY_BYTES)} sont retéléchargées,
          recompressées en WebP puis renvoyées, et les anciens fichiers sont
          supprimés du stockage. Les articles gardent exactement les mêmes
          images, en plus léger. Laissez cet onglet ouvert pendant le traitement.
        </p>

        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--foreground)]">
              {done} / {candidates.length} articles traités
            </span>
            <span className="font-semibold tabular-nums text-brand-500">
              {formatBytes(saved)} économisés
            </span>
          </div>
          {running ? (
            <p className="mt-2 flex items-center gap-2 truncate text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              {current}
            </p>
          ) : null}
          {finished ? (
            <p className="mt-2 text-xs font-semibold text-emerald-500">
              Terminé.
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={running}>
            Fermer
          </Button>
          <Button onClick={() => void run()} disabled={running || candidates.length === 0}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageDown className="h-4 w-4" />
            )}
            {running ? "Traitement…" : "Lancer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
