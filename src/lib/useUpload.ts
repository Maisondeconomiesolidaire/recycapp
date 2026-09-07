import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Compresse/redimensionne une image côté client avant l'envoi : les photos
 * prises au téléphone (plusieurs Mo) sont ramenées à ~1600px de côté en WebP,
 * ce qui allège fortement le chargement de la boutique. Les non-images (ou les
 * GIF animés) sont renvoyées telles quelles.
 *
 * Le format de sortie est celui que le navigateur a RÉELLEMENT produit, pas
 * celui demandé : un navigateur sans encodeur WebP renvoie silencieusement du
 * PNG. Les photos détourées partaient ainsi en PNG de 2 à 3 Mo, annoncées
 * `image/webp` — 80 Mo pour une seule grille boutique.
 */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

/** Extension cohérente avec le type réellement produit par le navigateur. */
const EXTENSIONS: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

function isHeicImage(file: File) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

/**
 * Convertit une photo HEIC/HEIF (illisible par la plupart des navigateurs) en
 * JPEG côté client. `heic2any` est chargé à la demande pour ne pas alourdir le
 * bundle initial.
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(result) ? result[0] : result;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

async function compressImage(file: File): Promise<File> {
  const heic = isHeicImage(file);
  if (!heic && (!file.type.startsWith("image/") || file.type === "image/gif")) {
    return file;
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    if (heic) {
      throw new Error("Le format HEIC n'est pas pris en charge ici. Envoyez une photo en JPEG ou PNG.");
    }
    return file;
  }

  // Les fichiers HEIC sont d'abord convertis en JPEG (lisible partout), puis
  // compressés comme n'importe quelle autre image.
  let source = file;
  if (heic) {
    try {
      source = await convertHeicToJpeg(file);
    } catch {
      throw new Error("Impossible de convertir cette photo HEIC. Envoyez une photo en JPEG ou PNG.");
    }
  }

  // On garde le JPEG pour les photos issues d'un HEIC (le nom/format restent
  // cohérents), sinon on privilégie le WebP plus léger.
  const outputType = heic ? "image/jpeg" : "image/webp";
  const outputQuality = heic ? 0.9 : WEBP_QUALITY;

  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return source;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality),
      );

    let blob = await encode(outputType, outputQuality);
    // Repli JPEG : sans encodeur WebP, `toBlob` rend un PNG non compressé,
    // souvent plus lourd que la photo d'origine. Le JPEG, lui, est universel.
    if (blob && blob.type !== outputType && !heic) {
      blob = (await encode("image/jpeg", JPEG_QUALITY)) ?? blob;
    }
    if (!blob) return source;
    // On ne garde la version compressée que si elle est réellement plus légère.
    if (!heic && blob.size >= source.size) return source;
    const extension = EXTENSIONS[blob.type] ?? ".img";
    return new File([blob], source.name.replace(/\.[^.]+$/, "") + extension, {
      type: blob.type,
    });
  } catch {
    return source;
  }
}

/** Recompression d'un fichier déjà stocké (rattrapage des photos trop lourdes). */
export async function optimizeImageFile(file: File) {
  return await compressImage(file);
}

/**
 * Renvoie une fonction qui envoie un fichier vers le stockage Convex et
 * retourne son storageId (les images sont compressées au passage).
 */
export function useUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  return async function upload(file: File): Promise<Id<"_storage">> {
    const optimized = await compressImage(file);
    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": optimized.type },
      body: optimized,
    });
    if (!res.ok) throw new Error("Échec de l'envoi du fichier.");
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };
}
