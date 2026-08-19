import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { QrCode } from "../ui/QrCode";
import { printIsolatedDocument, qrSvgMarkup } from "../../lib/printLabels";

/**
 * Une étiquette ne porte QUE des QR codes — ni titre, ni prix, ni référence en
 * clair. Les étiquettes d'articles et de caisses sont donc strictement
 * identiques, et un changement de prix ne périme jamais une étiquette collée.
 *
 * Le même code est répété plusieurs fois sur la largeur : collée autour d'un
 * objet fin (un stylo, un manche, un pied de chaise), une étiquette s'enroule et
 * masque une partie d'elle-même. Avec un code unique et centré, plus rien n'est
 * scannable ; répété, il reste toujours un exemplaire entier sur la face
 * visible.
 */
export interface LabelItem {
  /** Clé React. */
  id: string;
  /** Valeur encodée dans le QR code ET imprimée en clair dessous. */
  reference: string;
}

/**
 * « brother » = une étiquette 62 × 29 mm par page, prête pour une Brother
 * QL-700 (rouleau DK 62 × 29). « a4 » = planche d'étiquettes sur feuille A4.
 */
type Sheet = "brother" | "a4";

const LABEL_WIDTH_MM = 62;
const LABEL_HEIGHT_MM = 29;
/**
 * Taille d'un QR code sur une étiquette 62 × 29, en millimètres, et nombre de
 * répétitions sur la largeur. 3 × 16 mm + gouttières tiennent dans les 58 mm
 * utiles, et 16 mm reste très au-dessus du minimum lisible pour une référence
 * courte imprimée à 300 dpi.
 */
const QR_SIZE_MM = 16;
const QR_REPEATS = 3;
const QR_GAP_MM = 2;

const A4_COLUMNS = 4;
/** Même principe sur la planche A4, sur des cartes d'environ 44 mm utiles. */
const A4_QR_SIZE_MM = 12;

interface PrintLabelsProps {
  items: LabelItem[];
  /** Titre affiché dans la barre d'outils et le document imprimé. */
  title?: string;
  onClose: () => void;
}

export function PrintLabels({ items, title = "QR codes", onClose }: PrintLabelsProps) {
  // L'impression vise la QL-700 : on part directement sur le format 62 × 29 mm,
  // sans réglage à faire avant d'imprimer.
  const [sheet, setSheet] = useState<Sheet>("brother");
  const brother = sheet === "brother";

  function handlePrint() {
    if (brother) printBrotherLabels(items, title);
    else printA4Sheet(items, title);
  }

  const content = (
    <div className="fixed inset-0 z-[400] flex flex-col bg-[color:var(--crm-bg)]">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-100">
            Impression des QR codes — {items.length} étiquette
            {items.length > 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-zinc-400">
            {brother
              ? `Brother QL-700 · ${LABEL_WIDTH_MM} × ${LABEL_HEIGHT_MM} mm · une étiquette par page`
              : `Planche A4 · ${A4_COLUMNS} étiquettes par ligne`}
            {" · "}
            code répété {QR_REPEATS}× pour rester scannable une fois enroulé
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--crm-border)] p-0.5">
            {(
              [
                ["brother", `QL-700 ${LABEL_WIDTH_MM}×${LABEL_HEIGHT_MM}`],
                ["a4", "Planche A4"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSheet(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  sheet === value
                    ? "bg-brand-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] transition hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)]"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Aperçu — à taille réelle pour le format étiquette */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {brother ? (
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--crm-border)] bg-white shadow-sm"
              >
                <BrotherLabelPreview reference={item.reference} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <SheetLabelPreview key={item.id} reference={item.reference} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ─── Impression ─────────────────────────────────────────────────────────── */

/** Le même QR code, répété `QR_REPEATS` fois côte à côte. */
function repeatQr(reference: string, sizeMm: number): string {
  return Array.from({ length: QR_REPEATS }, () => qrSvgMarkup(reference, sizeMm)).join(
    "",
  );
}

/** Une étiquette 62 × 29 mm par page, QR code répété et centré. */
function printBrotherLabels(items: LabelItem[], title: string) {
  const pages = items
    .map(
      (item) => `<section class="page">${repeatQr(item.reference, QR_SIZE_MM)}</section>`,
    )
    .join("");

  printIsolatedDocument({
    title,
    pageCss: `@page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }`,
    bodyCss: `
      .page {
        width: ${LABEL_WIDTH_MM}mm;
        height: ${LABEL_HEIGHT_MM}mm;
        box-sizing: border-box;
        padding: 1.5mm 2mm;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${QR_GAP_MM}mm;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
    `,
    bodyHtml: pages,
  });
}

/** Planche A4 : plusieurs étiquettes par ligne. */
function printA4Sheet(items: LabelItem[], title: string) {
  const cards = items
    .map(
      (item) => `<div class="card">${repeatQr(item.reference, A4_QR_SIZE_MM)}</div>`,
    )
    .join("");

  printIsolatedDocument({
    title,
    pageCss: "@page { size: A4; margin: 8mm; }",
    bodyCss: `
      .sheet { display: grid; grid-template-columns: repeat(${A4_COLUMNS}, 1fr); }
      .card {
        border: 0.5pt solid #ccc;
        padding: 4pt;
        box-sizing: border-box;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${QR_GAP_MM}mm;
      }
    `,
    bodyHtml: `<div class="sheet">${cards}</div>`,
  });
}

/* ─── Aperçu écran ───────────────────────────────────────────────────────── */

/** Les mêmes QR codes répétés, pour l'aperçu écran. */
function RepeatedQr({ reference, size }: { reference: string; size: number | string }) {
  return (
    <>
      {Array.from({ length: QR_REPEATS }, (_, index) => (
        <QrCode key={index} value={reference} size={size} className="text-black" />
      ))}
    </>
  );
}

/** Aperçu à taille réelle d'une étiquette 62 × 29 mm. */
function BrotherLabelPreview({ reference }: { reference: string }) {
  return (
    <div
      className="flex items-center justify-center bg-white text-black"
      style={{
        width: `${LABEL_WIDTH_MM}mm`,
        height: `${LABEL_HEIGHT_MM}mm`,
        padding: "1.5mm 2mm",
        gap: `${QR_GAP_MM}mm`,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <RepeatedQr reference={reference} size={`${QR_SIZE_MM}mm`} />
    </div>
  );
}

/** Aperçu d'une étiquette de planche A4. */
function SheetLabelPreview({ reference }: { reference: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[var(--crm-border)] bg-white p-3"
      style={{ gap: `${QR_GAP_MM}mm` }}
    >
      <RepeatedQr reference={reference} size={`${A4_QR_SIZE_MM}mm`} />
    </div>
  );
}
