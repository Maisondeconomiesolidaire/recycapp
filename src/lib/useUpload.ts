import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Compresse/redimensionne une image côté client avant l'envoi : les photos
 * prises au téléphone (plusieurs Mo) sont ramenées à ~1600px de côté en WebP,
 * ce qui allège fortement le chargement de la boutique. Les non-images (ou les
 * GIF animés) sont renvoyées telles quelles.
 */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

function isHeicImage(file: File) {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const heic = isHeicImage(file);
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    if (heic) {
      throw new Error("Le format HEIC n'est pas pris en charge ici. Envoyez une photo en JPEG ou PNG.");
    }
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    // On ne garde la version compressée que si elle est réellement plus légère.
    if (!blob) {
      if (heic) {
        throw new Error("Impossible de convertir cette photo HEIC. Envoyez une photo en JPEG ou PNG.");
      }
      return file;
    }
    if (!heic && blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
    });
  } catch {
    if (heic) {
      throw new Error("Le format HEIC n'est pas pris en charge ici. Envoyez une photo en JPEG ou PNG.");
    }
    return file;
  }
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
