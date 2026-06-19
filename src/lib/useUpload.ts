import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Renvoie une fonction qui envoie un fichier vers le stockage Convex et
 * retourne son storageId.
 */
export function useUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  return async function upload(file: File): Promise<Id<"_storage">> {
    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Échec de l'envoi du fichier.");
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };
}
