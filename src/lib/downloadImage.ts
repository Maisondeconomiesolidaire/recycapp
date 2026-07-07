/**
 * Télécharge une image depuis une URL (stockage Convex) en forçant
 * l'enregistrement du fichier. On passe par un blob car un simple
 * `<a download>` n'impose pas le téléchargement pour une URL cross-origin.
 */
export async function downloadImage(url: string, filename?: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || defaultFilename(url, blob.type);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Repli : on ouvre l'image dans un nouvel onglet.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function defaultFilename(url: string, mimeType: string) {
  const fromUrl = url.split("?")[0].split("/").pop();
  if (fromUrl && /\.[a-z0-9]+$/i.test(fromUrl)) return fromUrl;
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return `photo-${Date.now()}.${ext}`;
}
