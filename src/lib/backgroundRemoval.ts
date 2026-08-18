/**
 * Détourage des photos d'articles, côté navigateur.
 *
 * Le modèle tourne en local (`@imgly/background-removal`, chargé à la demande),
 * puis le sujet détouré est recomposé sur un fond « produit » chaud et lumineux
 * pour homogénéiser les visuels de la boutique.
 */

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
      (blob) => (blob ? resolve(blob) : reject(new Error("Export PNG impossible."))),
      "image/png",
      0.95,
    );
  });
}

export async function composePremiumProductBackground(foregroundBlob: Blob) {
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

/**
 * Télécharge la photo, détoure le sujet et renvoie le fichier PNG final, prêt à
 * être uploadé dans le stockage Convex.
 */
export async function buildDetouredPhotoFile(
  sourceUrl: string,
  index = 0,
): Promise<File> {
  const { removeBackground } = await import("@imgly/background-removal");
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Photo ${index + 1} impossible à charger.`);
  }

  const sourceBlob = await response.blob();
  const foregroundBlob = await removeBackground(sourceBlob, {
    output: { format: "image/png", quality: 0.95 },
  });
  const finalBlob = await composePremiumProductBackground(foregroundBlob);
  return new File([finalBlob], `article-detoure-${Date.now()}-${index + 1}.png`, {
    type: "image/png",
  });
}
