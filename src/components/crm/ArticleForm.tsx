import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Loader2,
  ScanLine,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Lightbox } from "../ui/Lightbox";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import { SearchableSelect } from "../ui/SearchableSelect";
import {
  ARTICLE_CONDITIONS,
  ARTICLE_SITES,
  ARTICLE_STATUS_LABELS,
} from "../../lib/constants";
import { childCategories, useEmmausCategories } from "../../lib/emmausCategories";
import type { Site } from "../../lib/constants";
import { useUpload } from "../../lib/useUpload";
import { cn } from "../../lib/cn";
import { normalizeScanCode } from "../../lib/labels";

const CameraScanner = lazy(() =>
  import("../ui/CameraScanner").then((m) => ({ default: m.CameraScanner })),
);

type ArticleDoc = Doc<"articles"> & { imageUrls: string[] };

type ArticlePhoto = {
  id: Id<"_storage">;
  url: string;
  localPreview?: boolean;
};


export function ArticleForm({
  article,
  open,
  onClose,
  /**
   * « modal » = ancienne fiche en popup, encore utilisée par les raccourcis.
   * « page » = fiche pleine page (route /crm/articles/:id), le mode par défaut
   * depuis le stock : une fiche article est longue, la popup obligeait à
   * scroller dans une fenêtre dans la fenêtre.
   */
  variant = "modal",
}: {
  article: ArticleDoc | null;
  open: boolean;
  onClose: () => void;
  variant?: "modal" | "page";
}) {
  const create = useMutation(api.articles.create);
  const update = useMutation(api.articles.update);
  const analyzeImage = useAction(api.ai.analyzeArticleImage);
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<ArticlePhoto[]>([]);
  const caisses = useQuery(api.caisses.list, {});
  const emmausCategories = useEmmausCategories();

  const [title, setTitle] = useState(article?.title ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [price, setPrice] = useState(article ? String(article.price) : "");
  const [weightKg, setWeightKg] = useState(
    article?.weightKg !== undefined ? String(article.weightKg) : "",
  );
  // Rangement : l'article vit dans une caisse, identifiée par son QR code.
  const [caisseId, setCaisseId] = useState<Id<"caisses"> | "">(
    article?.caisseId ?? "",
  );
  const [site, setSite] = useState<Site | "">(article?.site ?? "");
  const [caisseScanOpen, setCaisseScanOpen] = useState(false);
  const [caisseScanError, setCaisseScanError] = useState("");
  const [storageKind, setStorageKind] = useState<"meuble" | "autre">(
    article?.caisseId ? "autre" : "meuble",
  );
  const [location, setLocation] = useState(article?.location ?? "");
  const [originalPrice, setOriginalPrice] = useState(
    article?.originalPrice !== undefined ? String(article.originalPrice) : "",
  );
  const [gdrReference, setGdrReference] = useState(article?.gdrReference ?? "");
  const [internalReference, setInternalReference] = useState(
    article?.internalReference ?? "",
  );
  const [categoryPath, setCategoryPath] = useState<string[]>(
    article?.categoryPath ?? [article?.category, article?.subcategory].filter(
      (value): value is string => Boolean(value),
    ),
  );
  const [condition, setCondition] = useState(
    article?.condition ?? ARTICLE_CONDITIONS[1],
  );
  const [keywords] = useState((article?.keywords ?? []).join(", "));
  const [themeKey] = useState(article?.themeKey ?? "");
  const [status, setStatus] = useState<Doc<"articles">["status"]>(
    article?.status ?? "disponible",
  );
  const [photos, setPhotos] = useState<ArticlePhoto[]>(
    (article?.images ?? []).map((id, i) => ({
      id,
      url: article?.imageUrls[i] ?? "",
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<null | "analyse">(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.localPreview) {
          URL.revokeObjectURL(photo.url);
        }
      });
    };
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);
    try {
      const added: ArticlePhoto[] = [];
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        added.push({
          id: storageId,
          url: URL.createObjectURL(file),
          localPreview: true,
        });
      }
      setPhotos((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  function removePhoto(id: Id<"_storage">) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target?.localPreview) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((photo) => photo.id !== id);
    });
  }

  function setCoverPhoto(id: Id<"_storage">) {
    setPhotos((prev) => {
      const index = prev.findIndex((photo) => photo.id === id);
      if (index <= 0) return prev;
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.unshift(selected);
      return next;
    });
  }

  function applyDescriptionSuggestion(
    result: Awaited<ReturnType<typeof analyzeImage>>,
  ) {
    setDescription(result.description);
    setCategoryPath([result.category, result.subcategory].filter(
      (value): value is string => Boolean(value),
    ));
  }

  async function writeDescriptionWithAI() {
    if (photos.length === 0) {
      setError("Ajoutez au moins une photo avant de rédiger avec l’IA.");
      return;
    }
    setError("");
    setGeneratingStep("analyse");
    try {
      const result = await analyzeImage({ storageId: photos[0].id });
      applyDescriptionSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse IA.");
    } finally {
      setGeneratingStep(null);
    }
  }

  async function handleSave(desiredStatus?: "disponible" | "attente") {
    if (!title.trim()) return setError("Le titre est requis.");
    if (categoryPath.length === 0) return setError("Choisissez une catégorie.");
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0)
      return setError("Prix invalide.");
    const weightNum = Number(weightKg);
    if (weightKg.trim() === "" || Number.isNaN(weightNum) || weightNum < 0) {
      return setError("Le poids est requis.");
    }
    const originalPriceNum =
      originalPrice.trim() === "" ? undefined : Number(originalPrice);
    if (
      originalPrice.trim() !== "" &&
      (Number.isNaN(originalPriceNum) || (originalPriceNum ?? 0) < 0)
    ) {
      return setError("Prix barré invalide.");
    }
    if (article && !/^\d{6}$/.test(internalReference))
      return setError(
        "La référence interne doit contenir exactement 6 chiffres.",
      );
    setError("");
    setSaving(true);
    try {
      const images = photos.map((photo) => photo.id);
      if (article) {
        await update({
          id: article._id,
          title,
          description,
          price: priceNum,
          weightKg: weightNum,
          caisseId: storageKind === "autre" ? caisseId || undefined : undefined,
          location: storageKind === "meuble" ? location.trim() || undefined : undefined,
          site: site || undefined,
          originalPrice: originalPriceNum,
          internalReference,
          gdrReference: gdrReference.trim(),
          category: categoryPath[0] ?? "Maison",
          subcategory: categoryPath[1] || undefined,
          categoryPath: categoryPath.length ? categoryPath : undefined,
          condition,
          keywords: keywords
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          themeKey: themeKey.trim() || undefined,
          images,
          status,
        });
      } else {
        await create({
          title,
          description,
          price: priceNum,
          weightKg: weightNum,
          caisseId: storageKind === "autre" ? caisseId || undefined : undefined,
          location: storageKind === "meuble" ? location.trim() || undefined : undefined,
          site: site || undefined,
          originalPrice: originalPriceNum,
          gdrReference: gdrReference.trim() || undefined,
          category: categoryPath[0] ?? "Maison",
          subcategory: categoryPath[1] || undefined,
          categoryPath: categoryPath.length ? categoryPath : undefined,
          condition,
          keywords: keywords
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          themeKey: themeKey.trim() || undefined,
          images,
          desiredStatus,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const onlineDisabled = saving;

  const heading = article ? "Modifier l'article" : "Nouvel article";

  const body = (
    <>
      <div className="space-y-4">

        {/* ── Photos ─────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-1.5">Photos</p>
          <p className="mb-3 text-xs text-zinc-500">
            La première image sera utilisée comme photo de couverture.
          </p>
          {photos.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)]",
                    index === 0 && "ring-2 ring-brand-500/70 ring-offset-2 ring-offset-zinc-950",
                  )}
                >
                  <img
                    src={photo.url}
                    alt=""
                    onClick={() => setLightboxIndex(index)}
                    className="aspect-[4/3] h-auto w-full cursor-zoom-in object-cover"
                  />
                  <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        index === 0
                          ? "bg-brand-500 text-white"
                          : "bg-black/65 text-white",
                      )}
                    >
                      {index === 0 ? "Couverture" : `Photo ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Retirer cette photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {index !== 0 && (
                    <div className="absolute inset-x-2 bottom-2">
                      <button
                        type="button"
                        onClick={() => setCoverPhoto(photo.id)}
                        className="flex w-full items-center justify-center gap-1 rounded-xl bg-black/70 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-black/85"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Définir en couverture
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {lightboxIndex !== null && (
            <Lightbox
              images={photos.map((p) => p.url)}
              startIndex={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
            />
          )}
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div
              role="button"
              tabIndex={uploading ? -1 : 0}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                dragCounter.current++;
                if (dragCounter.current === 1) setIsDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                dragCounter.current--;
                if (dragCounter.current === 0) setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCounter.current = 0;
                setIsDragging(false);
                if (!uploading) handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex min-h-28 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-sm font-medium transition-all",
                isDragging
                  ? "border-brand-500 bg-brand-500/10 text-brand-300 scale-[1.01]"
                  : uploading
                    ? "cursor-not-allowed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-500 opacity-60"
                    : "border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-300 hover:border-brand-500/60 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
              )}
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Envoi des images…</>
              ) : isDragging ? (
                <><ImagePlus className="h-5 w-5" />Déposez les images ici</>
              ) : (
                <><ImagePlus className="h-4 w-4" />Ajouter des photos <span className="text-zinc-600">ou glisser-déposer</span></>
              )}
            </div>
            <button
              type="button"
              onClick={() => !uploading && cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] px-4 py-5 text-sm font-medium text-zinc-300 transition hover:border-brand-500/60 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera className="h-7 w-7 text-[var(--muted-foreground)]" />
              <span className="mt-2">Prendre une photo</span>
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
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* ── Text fields ─────────────────────────────────────── */}
        <Field label="Titre" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Chaise en chêne vintage"
          />
        </Field>
        <Field label="Description">
          <div className="relative">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="État, dimensions, particularités…"
              className="min-h-32 pb-12"
            />
            <button
              type="button"
              onClick={writeDescriptionWithAI}
              disabled={generatingStep !== null || uploading || photos.length === 0}
              className={cn(
                "absolute bottom-2 right-2 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                generatingStep !== null || uploading || photos.length === 0
                  ? "cursor-not-allowed border-brand-500/30 bg-brand-500/5 text-brand-300/60"
                  : "border-brand-500/50 bg-brand-500/10 text-brand-200 hover:border-brand-500/80 hover:bg-brand-500/15",
              )}
            >
              {generatingStep === "analyse" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rédaction…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Rédiger avec l'IA
                </>
              )}
            </button>
          </div>
        </Field>

        {/* ── Grid fields ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prix (€)" required>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="25"
            />
          </Field>
          <Field label="Poids (kg)" required>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="0.850"
            />
          </Field>
          <Field label="Prix barré (€)">
            <Input
              type="number"
              step="0.01"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="39"
            />
          </Field>
          <Field
            label="Site"
            hint="Recyclerie qui détient l'objet : c'est le site de retrait annoncé au client."
          >
            <Select value={site} onChange={(e) => setSite(e.target.value as Site | "")}>
              <option value="">— Non renseigné —</option>
              {ARTICLE_SITES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Emplacement">
            <Select value={storageKind} onChange={(e) => setStorageKind(e.target.value as "meuble" | "autre")}>
              <option value="meuble">Meuble</option>
              <option value="autre">Autre (caisse)</option>
            </Select>
          </Field>
          {storageKind === "meuble" ? (
            <Field label="Emplacement meuble" hint="Indiquez librement le meuble, l'étagère ou le rayon.">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex : Meuble entrée, étagère 2" />
            </Field>
          ) : (
            <Field
              label="Caisse"
              hint="Tapez le numéro pour filtrer, ou scannez le QR code collé sur la caisse."
              error={caisseScanError || undefined}
            >
              <div className="flex gap-2">
                <SearchableSelect
                  className="flex-1"
                  value={caisseId}
                  onChange={(next) => {
                    setCaisseId(next as Id<"caisses"> | "");
                    setCaisseScanError("");
                  }}
                  options={(caisses ?? []).map((caisse) => ({
                    value: caisse._id,
                    label: caisse.label ? `${caisse.code} — ${caisse.label}` : caisse.code,
                    hint: caisse.zone,
                  }))}
                  placeholder="— Aucune caisse —"
                  searchPlaceholder="Numéro ou nom de caisse…"
                  emptyLabel="Aucune caisse ne correspond."
                />
                <Button type="button" variant="outline" onClick={() => setCaisseScanOpen(true)} title="Scanner le QR code de la caisse">
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Scanner</span>
                </Button>
              </div>
            </Field>
          )}
          {article ? (
            <Field label="Référence interne" hint="6 chiffres, générée automatiquement.">
              <Input
                value={internalReference}
                onChange={(e) =>
                  setInternalReference(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000123"
              />
            </Field>
          ) : null}
          <Field label="Réf. GDR" hint="Facultatif.">
            <Input
              value={gdrReference}
              onChange={(e) => setGdrReference(e.target.value)}
              placeholder="Référence GDR"
            />
          </Field>
          {Array.from({ length: 4 }, (_, level) => {
            const prefix = categoryPath.slice(0, level);
            const options = childCategories(emmausCategories, prefix);
            if (level > 0 && options.length === 0) return null;
            return (
              <Field key={level} label={level === 0 ? "Catégorie" : `Niveau ${level + 1}`}>
                <Select
                  value={categoryPath[level] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategoryPath(value ? [...prefix, value] : prefix);
                  }}
                >
                  <option value="">{level === 0 ? "— Choisir une catégorie —" : "— Aucune —"}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </Select>
              </Field>
            );
          })}
          <Field label="État">
            <Select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              {ARTICLE_CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {article && (
            <Field label="Statut">
              <Select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Doc<"articles">["status"])
                }
              >
                {Object.entries(ARTICLE_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {article ? (
            <Button onClick={() => handleSave()} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          ) : (
            <Button
              onClick={() => handleSave("disponible")}
              disabled={onlineDisabled}
            >
              {saving ? "Enregistrement…" : "Mettre en ligne"}
            </Button>
          )}
        </div>
      </div>

      {/* Scan du QR code de la caisse dans laquelle ranger l'article. */}
      {caisseScanOpen && (
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
                setCaisseScanOpen(false);
                const normalized = normalizeScanCode(code);
                const found = (caisses ?? []).find((c) => c.code === normalized);
                if (found) {
                  setCaisseId(found._id);
                  setCaisseScanError("");
                } else {
                  setCaisseScanError(
                    `Aucune caisse ne correspond au code « ${normalized} ».`,
                  );
                }
              }}
              onClose={() => setCaisseScanOpen(false)}
            />
          </Suspense>
        </div>
      )}
    </>
  );

  if (variant === "page") {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au stock
        </button>
        <h1 className="mb-5 text-xl font-bold text-[var(--foreground)]">{heading}</h1>
        {body}
      </div>
    );
  }

  return (
    <Modal dark open={open} onClose={onClose} title={heading}>
      {body}
    </Modal>
  );
}
