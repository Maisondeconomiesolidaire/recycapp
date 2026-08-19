import QRCode from "qrcode";

/**
 * Impression des étiquettes dans un document isolé.
 *
 * Le CSS de l'application (Tailwind, thème sombre, conteneurs `fixed`) parasite
 * l'impression de la page courante : le navigateur retombe alors sur A4. On
 * fabrique donc un document minimal dans une iframe hors écran, avec sa propre
 * règle `@page`, et c'est CE document qu'on imprime. Le format demandé est ainsi
 * pré-rempli dans la boîte de dialogue.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Marge blanche autour du code, en nombre de modules. La norme QR impose 4 :
 * sans elle le code touche le bord de l'étiquette, paraît « découpé » et les
 * lecteurs peinent à en trouver les repères.
 */
export const QR_QUIET_ZONE_MODULES = 4;

/**
 * QR code en SVG inline, dimensionné en millimètres — zone de silence incluse,
 * donc `sizeMm` est bien l'encombrement total sur l'étiquette.
 */
export function qrSvgMarkup(value: string, sizeMm: number): string {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const count = modules.size;
  const data = modules.data;
  const margin = QR_QUIET_ZONE_MODULES;
  const extent = count + margin * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (data[row * count + col]) {
        path += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
  }
  return (
    `<svg viewBox="0 0 ${extent} ${extent}" width="${sizeMm}mm" height="${sizeMm}mm" ` +
    `shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${extent}" height="${extent}" fill="#fff"/>` +
    `<path d="${path}" fill="#000"/></svg>`
  );
}

/**
 * Ouvre la boîte d'impression sur un document dédié.
 *
 * @param pageCss  règle `@page` (format et marges) du document.
 * @param bodyCss  styles des étiquettes.
 * @param bodyHtml contenu à imprimer.
 */
export function printIsolatedDocument({
  title,
  pageCss,
  bodyCss,
  bodyHtml,
}: {
  title: string;
  pageCss: string;
  bodyCss: string;
  bodyHtml: string;
}): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  ${pageCss}
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    color: #000;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${bodyCss}
</style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  const cleanup = () => {
    // Retirer l'iframe trop tôt annule l'impression sur certains navigateurs.
    window.setTimeout(() => iframe.remove(), 1000);
  };

  const run = () => {
    const win = iframe.contentWindow;
    if (!win) {
      iframe.remove();
      return;
    }
    win.onafterprint = cleanup;
    win.focus();
    win.print();
    // Filet de sécurité si `onafterprint` n'est jamais appelé.
    window.setTimeout(() => iframe.remove(), 60_000);
  };

  if (doc.readyState === "complete") run();
  else iframe.onload = run;
}
