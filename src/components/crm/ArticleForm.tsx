import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { Camera, ExternalLink, ImagePlus, Loader2, Sparkles, Star, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Lightbox } from "../ui/Lightbox";
import { Button } from "../ui/Button";
import { Field, Input, Select, Textarea } from "../ui/Field";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_SUBCATEGORIES,
  ARTICLE_CONDITIONS,
  ARTICLE_STATUS_LABELS,
} from "../../lib/constants";
import { useUpload } from "../../lib/useUpload";
import { cn } from "../../lib/cn";

type ArticleDoc = Doc<"articles"> & { imageUrls: string[] };

// Affiche un libellé lisible pour une URL source (domaine, sinon URL brute).
function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Converts a hex color to a 0–100 position on the red→green gradient.
// Red (#ef4444) ≈ hue 0°, Green (#22c55e) ≈ hue 142°.
function hexToGradientPosition(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = h * 60;
  return Math.min(100, Math.max(0, (h / 142) * 100));
}

function ValueBar({
  color,
  label,
  rationale,
  justification,
}: {
  color: string;
  label: string;
  rationale?: string;
  justification?: string;
}) {
  const pct = hexToGradientPosition(color);
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Indice de valeur IA
        </span>
        <span className="text-xs font-semibold" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Gradient track with thumb */}
      <div className="relative flex items-center py-2">
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-zinc-950 shadow-lg ring-1 ring-white/20"
          style={{ left: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Scale labels */}
      <div className="mt-1 flex justify-between">
        <span className="text-[10px] text-red-400">Faible valeur</span>
        <span className="text-[10px] text-green-400">Grande valeur</span>
      </div>

      {(rationale || justification) && (
        <div className="mt-3 space-y-2 border-t border-[var(--crm-border)] pt-3">
          {rationale && (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-400">Source : </span>
              {rationale}
            </p>
          )}
          {justification && (
            <p className="text-[11px] leading-relaxed text-zinc-400">
              {justification}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
type ArticlePhoto = {
  id: Id<"_storage">;
  url: string;
  localPreview?: boolean;
};

const STOCK_BIN_OPTIONS = ["9282", "6220", "8764", "9369", "5525", "9281", "8797"] as const;
const OTHER_BIN_VALUE = "__other__";

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image impossible à charger pour le détourage."));
    };
    image.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Export PNG impossible.")),
      "image/png",
      0.95,
    );
  });
}

async function composePremiumProductBackground(foregroundBlob: Blob) {
  const image = await loadImageFromBlob(foregroundBlob);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible pour le détourage.");

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#fff8eb");
  base.addColorStop(0.48, "#f8efe2");
  base.addColorStop(1, "#fffdf6");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.45,
    Math.max(width, height) * 0.55,
  );
  glow.addColorStop(0, "rgba(255, 119, 0, 0.16)");
  glow.addColorStop(0.55, "rgba(255, 196, 87, 0.08)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.filter = `blur(${Math.max(10, Math.round(width * 0.018))}px)`;
  ctx.drawImage(image, 0, Math.max(8, Math.round(height * 0.018)), width, height);
  ctx.restore();

  ctx.drawImage(image, 0, 0, width, height);
  return canvasToPngBlob(canvas);
}

export function ArticleForm({
  article,
  open,
  onClose,
  locationOptions,
}: {
  article: ArticleDoc | null;
  open: boolean;
  onClose: () => void;
  locationOptions: string[];
}) {
  const create = useMutation(api.articles.create);
  const update = useMutation(api.articles.update);
  const analyzeImage = useAction(api.ai.analyzeArticleImage);
  const generateFromKeywords = useAction(api.ai.generateArticleFromKeywords);
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<ArticlePhoto[]>([]);
  const availableLocationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...STOCK_BIN_OPTIONS, ...locationOptions]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    [locationOptions],
  );
  const initialLocation = article?.location?.trim() ?? "";
  const initialLocationIsPreset = availableLocationOptions.includes(initialLocation);

  const [title, setTitle] = useState(article?.title ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [price, setPrice] = useState(article ? String(article.price) : "");
  const [weightKg, setWeightKg] = useState(
    article?.weightKg !== undefined ? String(article.weightKg) : "",
  );
  const [locationChoice, setLocationChoice] = useState(
    initialLocation
      ? initialLocationIsPreset
        ? initialLocation
        : OTHER_BIN_VALUE
      : "",
  );
  const [customLocation, setCustomLocation] = useState(
    initialLocation && !initialLocationIsPreset
      ? initialLocation.replace(/\D/g, "").slice(0, 4)
      : "",
  );
  const [aiDetails, setAiDetails] = useState("");
  const [aiBrief, setAiBrief] = useState("");
  const [originalPrice, setOriginalPrice] = useState(
    article?.originalPrice !== undefined ? String(article.originalPrice) : "",
  );
  const [internalReference, setInternalReference] = useState(
    article?.internalReference ?? "",
  );
  const [gdrReference, setGdrReference] = useState(article?.gdrReference ?? "");
  const [category, setCategory] = useState(
    article?.category ?? ARTICLE_CATEGORIES[0],
  );
  const [subcategory, setSubcategory] = useState(article?.subcategory ?? "");
  const [condition, setCondition] = useState(
    article?.condition ?? ARTICLE_CONDITIONS[1],
  );
  const [keywords, setKeywords] = useState((article?.keywords ?? []).join(", "));
  const [themeKey, setThemeKey] = useState(article?.themeKey ?? "");
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
  const [generatingStep, setGeneratingStep] = useState<
    null | "analyse" | "visuels" | "champs"
  >(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [valueColor, setValueColor] = useState<string | null>(null);
  const [valueLabel, setValueLabel] = useState<string | null>(null);
  const [priceRationale, setPriceRationale] = useState<string | null>(null);
  const [priceJustification, setPriceJustification] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [listingRecommendation, setListingRecommendation] = useState<string | null>(null);
  const [onlineEligible, setOnlineEligible] = useState<boolean | null>(null);
  const [recommendedSaleMode, setRecommendedSaleMode] = useState<"single" | "bundle" | null>(null);
  const [singleSaleNote, setSingleSaleNote] = useState<string | null>(null);
  const [bundleSaleNote, setBundleSaleNote] = useState<string | null>(null);

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

  function applyAnalysis(
    result: Awaited<ReturnType<typeof generateFromKeywords>>,
  ) {
    setTitle(result.title);
    setDescription(result.description);
    setPrice(String(result.price));
    // prix barré = toujours notre prix × 1.7 (nos prix sont à -70% du prix barré)
    setOriginalPrice(String(Math.round(result.price * 1.7)));
    if (result.weightKg != null && result.weightKg > 0) {
      setWeightKg(String(result.weightKg));
    }
    setCategory(result.category);
    setSubcategory(result.subcategory ?? "");
    setCondition(result.condition);
    setKeywords((result.keywords ?? []).join(", "));
    setThemeKey(result.themeKey ?? "");
    setValueColor(result.valueColor);
    setValueLabel(result.valueLabel);
    setPriceRationale(result.priceRationale ?? null);
    setPriceJustification(result.priceJustification ?? null);
    setSources(result.sources ?? []);
    setOnlineEligible(result.onlineEligible ?? true);
    setRecommendedSaleMode(result.recommendedSaleMode ?? "single");
    setSingleSaleNote(
      result.singleSaleNote ??
        "Peut être vendu seul si l'article est prêt pour la boutique.",
    );
    setBundleSaleNote(
      result.bundleSaleNote ??
        "Peut aussi renforcer un lot thématique si des articles proches existent.",
    );
    setListingRecommendation(
      result.listingRecommendation ??
        "Cet article peut être mis en ligne seul ou gardé en attente selon le choix de l'équipe.",
    );
  }

  async function runAnalysis() {
    if (photos.length === 0) return;
    setError("");
    setGeneratingStep("analyse");
    try {
      const result = await analyzeImage({
        storageId: photos[0].id,
        extraDetails: aiDetails.trim() || undefined,
      });
      applyAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse IA.");
    } finally {
      setGeneratingStep(null);
    }
  }

  async function runKeywordGeneration() {
    if (!aiBrief.trim()) {
      setError("Renseignez quelques mots-clés avant de générer.");
      return;
    }
    setError("");
    setGeneratingStep("champs");
    try {
      const result = await generateFromKeywords({ keywords: aiBrief.trim() });
      applyAnalysis(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la génération IA.",
      );
    } finally {
      setGeneratingStep(null);
    }
  }

  async function handleGenerateListing() {
    await runAnalysis();
  }

  async function processPhotoBackground(photo: ArticlePhoto, index: number) {
    const { removeBackground } = await import("@imgly/background-removal");
    const response = await fetch(photo.url);
    if (!response.ok) {
      throw new Error(`Photo ${index + 1} impossible à charger.`);
    }

    const sourceBlob = await response.blob();
    const foregroundBlob = await removeBackground(sourceBlob, {
      output: {
        format: "image/png",
        quality: 0.95,
      },
    });
    const finalBlob = await composePremiumProductBackground(foregroundBlob);
    const file = new File(
      [finalBlob],
      `article-detoure-${Date.now()}-${index + 1}.png`,
      { type: "image/png" },
    );
    const id = await upload(file);
    return {
      id,
      url: URL.createObjectURL(finalBlob),
      localPreview: true,
    } satisfies ArticlePhoto;
  }

  async function handleGenerateVisuals() {
    if (photos.length === 0) return;
    setError("");
    setGeneratingStep("visuels");
    try {
      const currentPhotos = photosRef.current;
      const processedPhotos: ArticlePhoto[] = [];
      for (let i = 0; i < currentPhotos.length; i += 1) {
        processedPhotos.push(await processPhotoBackground(currentPhotos[i], i));
      }
      currentPhotos.forEach((photo) => {
        if (photo.localPreview) URL.revokeObjectURL(photo.url);
      });
      setPhotos(processedPhotos);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Détourage : ${err.message}`
          : "Erreur lors du détourage.",
      );
    } finally {
      setGeneratingStep(null);
    }
  }

  async function handleSave(desiredStatus?: "disponible" | "attente") {
    if (!title.trim()) return setError("Le titre est requis.");
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
    if (gdrReference.trim() !== "" && !/^\d{15}$/.test(gdrReference))
      return setError("La référence externe doit contenir exactement 15 chiffres.");
    const resolvedLocation =
      locationChoice === OTHER_BIN_VALUE ? customLocation.trim() : locationChoice.trim();
    if (resolvedLocation && !/^\d{4}$/.test(resolvedLocation)) {
      return setError("L'emplacement doit contenir exactement 4 chiffres.");
    }

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
          location: resolvedLocation || undefined,
          originalPrice: originalPriceNum,
          internalReference,
          gdrReference: gdrReference.trim() || undefined,
          category,
          subcategory: subcategory || undefined,
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
          location: resolvedLocation || undefined,
          originalPrice: originalPriceNum,
          gdrReference: gdrReference.trim() || undefined,
          category,
          subcategory: subcategory || undefined,
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

  const resolvedOnlineEligible = onlineEligible ?? null;
  const onlineDisabled = saving;

  return (
    <Modal
      dark
      open={open}
      onClose={onClose}
      title={article ? "Modifier l'article" : "Nouvel article"}
    >
      <div className="space-y-4">

        {/* ── Rédiger : génération de tous les champs depuis des mots-clés ── */}
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
          <p className="text-sm font-medium text-zinc-200">
            Rédiger l'article avec l'IA
          </p>
          <p className="mb-3 mt-0.5 text-xs text-zinc-500">
            Saisissez des mots-clés (un par ligne ou séparés par des virgules) :
            l'IA génère le titre, la description, le prix et tous les autres
            champs — sauf les photos.
          </p>
          <Textarea
            value={aiBrief}
            onChange={(e) => setAiBrief(e.target.value)}
            placeholder={"Ex :\nveste en jean Levi's taille M\névénement, textile, tout à -50%, déstockage\nlot de 3 cadres photo bois"}
            rows={4}
          />
          <button
            type="button"
            onClick={runKeywordGeneration}
            disabled={generatingStep !== null || !aiBrief.trim()}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3.5 text-sm font-medium transition-colors",
              generatingStep !== null || !aiBrief.trim()
                ? "cursor-not-allowed border-brand-500/40 bg-brand-500/8 text-brand-300/70"
                : "border-brand-500/50 bg-brand-500/10 text-brand-200 hover:border-brand-500/80 hover:bg-brand-500/15",
            )}
          >
            {generatingStep === "champs" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération des champs…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer tous les champs
              </>
            )}
          </button>
        </div>

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

        {/* ── Actions IA séparées ─────────────────────────────── */}
        {photos.length > 0 && (
          <Field
            label="Détails supplémentaires pour l'IA (facultatif)"
            hint="Infos non visibles sur la photo : modèle exact, RAM, capacité, année, options… Elles priment sur la photo."
          >
            <Textarea
              value={aiDetails}
              onChange={(e) => setAiDetails(e.target.value)}
              placeholder="Ex : marque, modèle, dimensions, matière, année, capacité/RAM, coloris, défauts…"
              rows={2}
            />
          </Field>
        )}
        {photos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGenerateListing}
              disabled={generatingStep !== null || uploading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3.5 text-sm font-medium transition-colors",
                generatingStep !== null
                  ? "cursor-not-allowed border-brand-500/40 bg-brand-500/8 text-brand-300"
                  : "border-brand-500/40 bg-brand-500/5 text-brand-300 hover:border-brand-500/70 hover:bg-brand-500/10",
              )}
            >
              {generatingStep === "analyse" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse IA en cours…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer l'annonce
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerateVisuals}
              disabled={generatingStep !== null || uploading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-3.5 text-sm font-medium transition-colors",
                generatingStep !== null
                  ? "cursor-not-allowed border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-400"
                  : "border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] text-zinc-200 hover:border-zinc-500 hover:bg-[var(--crm-surface-2)]",
              )}
            >
              {generatingStep === "visuels" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Détourage en cours…
                    <span className="ml-1.5 text-xs opacity-60">({photos.length} photo{photos.length > 1 ? "s" : ""})</span>
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Détourer les images
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Value gradient bar ──────────────────────────────── */}
        {valueColor && valueLabel && (
          <ValueBar
            color={valueColor}
            label={valueLabel}
            rationale={priceRationale ?? undefined}
            justification={priceJustification ?? undefined}
          />
        )}

        {sources.length > 0 && (
          <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Sources consultées par l'IA
            </p>
            <ul className="mt-2 space-y-1.5">
              {sources.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 break-all text-sm text-sky-300 transition hover:text-sky-200 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {sourceLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(listingRecommendation || singleSaleNote || bundleSaleNote) && (
          <div
            className={cn(
              "rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Recommandation IA
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">
              {listingRecommendation ??
                "Choisissez entre une mise en ligne seule ou une mise en attente selon le potentiel commercial."}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-2xl border p-3",
                  recommendedSaleMode === "single"
                    ? "border-emerald-500/45 bg-emerald-500/10"
                    : "border-[var(--crm-border)] bg-[var(--crm-surface)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">Mettre en ligne</p>
                  {recommendedSaleMode === "single" && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                      Conseillé
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  {singleSaleNote ?? "Option pertinente si l'article est assez fort pour être vendu seul."}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-2xl border p-3",
                  recommendedSaleMode === "bundle" || resolvedOnlineEligible === false
                    ? "border-amber-500/45 bg-amber-500/10"
                    : "border-[var(--crm-border)] bg-[var(--crm-surface)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">Mettre en attente</p>
                  {(recommendedSaleMode === "bundle" || resolvedOnlineEligible === false) && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                      Conseillé
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-400">
                  {bundleSaleNote ??
                    "L'article restera dans le stock en attente pour être analysé avec les futurs lots potentiels."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Text fields ─────────────────────────────────────── */}
        <Field label="Titre" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Chaise en chêne vintage"
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="État, dimensions, particularités…"
          />
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
            label="Emplacement"
            hint="Choisissez le bac de stockage, ou saisissez les 4 derniers chiffres."
          >
            <div className="space-y-2">
              <Select
                value={locationChoice}
                onChange={(e) => setLocationChoice(e.target.value)}
              >
                <option value="">— Sélectionner un bac —</option>
                {availableLocationOptions.map((bin) => (
                  <option key={bin} value={bin}>
                    {bin}
                  </option>
                ))}
                <option value={OTHER_BIN_VALUE}>Autres, veuillez préciser</option>
              </Select>
              {locationChoice === OTHER_BIN_VALUE && (
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={customLocation}
                  onChange={(e) =>
                    setCustomLocation(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="4 chiffres"
                />
              )}
            </div>
          </Field>
          <Field
            label="Référence interne"
            hint={
              article
                ? "6 chiffres, générée automatiquement."
                : "Elle sera générée automatiquement à la création."
            }
          >
            <Input
              value={internalReference}
              onChange={(e) =>
                setInternalReference(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder={article ? "000123" : "Génération automatique"}
              readOnly={!article}
              disabled={!article}
              className={!article ? "cursor-not-allowed opacity-70" : undefined}
            />
          </Field>
          <Field label="Référence externe" hint="15 chiffres, facultatif.">
            <Input
              inputMode="numeric"
              maxLength={15}
              value={gdrReference}
              onChange={(e) =>
                setGdrReference(e.target.value.replace(/\D/g, "").slice(0, 15))
              }
              placeholder="000000000000123"
            />
          </Field>
          <Field label="Catégorie">
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Sous-catégorie">
            <Select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {(ARTICLE_SUBCATEGORIES[category] ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
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
          <Field label="Mots-clés IA" hint="Séparés par des virgules.">
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="mario, nintendo, kart, figurine"
            />
          </Field>
          <Field label="Thème du lot" hint="Ex : mario, playmobil-pirates.">
            <Input
              value={themeKey}
              onChange={(e) => setThemeKey(e.target.value)}
              placeholder="mario"
            />
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
            <>
              <Button
                variant="outline"
                onClick={() => handleSave("attente")}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : "Mettre en attente"}
              </Button>
              <Button
                onClick={() => handleSave("disponible")}
                disabled={onlineDisabled}
              >
                {saving ? "Enregistrement…" : "Mettre en ligne"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
