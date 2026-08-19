import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { QrCode } from "../ui/QrCode";
import {
  escapeHtml,
  printIsolatedDocument,
  QR_QUIET_ZONE_MODULES,
  qrSvgMarkup,
} from "../../lib/printLabels";

/**
 * Une étiquette d'ARTICLE ne porte que des QR codes — ni titre, ni prix, ni
 * référence en clair — et le même code y est répété sur la largeur : collée
 * autour d'un objet fin (un stylo, un manche, un pied de chaise), une étiquette
 * s'enroule et masque une partie d'elle-même. Avec un code unique et centré,
 * plus rien n'est scannable ; répété, il reste toujours un exemplaire entier
 * sur la face visible.
 *
 * Une étiquette de CAISSE (`caption` renseigné) suit une autre logique : la
 * caisse est grande et plate, l'enroulement ne la concerne pas, mais on doit
 * pouvoir l'identifier de loin sans scanner. Un seul QR code, et son numéro
 * imprimé en très gros à côté.
 */
export interface LabelItem {
  /** Clé React. */
  id: string;
  /** Valeur encodée dans le QR code. */
  reference: string;
  /**
   * Numéro imprimé en très gros à côté du QR code (caisses uniquement).
   * Absent = étiquette d'article, QR code seul et répété.
   */
  caption?: string;
}

/**
 * « brother » = une étiquette 62 × 29 mm par page, prête pour une Brother
 * QL-700 (rouleau DK 62 × 29). « a4 » = planche d'étiquettes sur feuille A4.
 */
type Sheet = "brother" | "a4";

const LABEL_WIDTH_MM = 62;
const LABEL_HEIGHT_MM = 29;
/**
 * Marge de sécurité : le rouleau DK 62 mm a une bande non imprimable de l'ordre
 * du millimètre sur chaque bord. On garde 1,5 mm pour qu'aucun code ne soit
 * rogné, et on remplit tout le reste.
 */
const LABEL_PADDING_MM = 1.5;
const QR_GAP_MM = 2;

const USABLE_WIDTH_MM = LABEL_WIDTH_MM - LABEL_PADDING_MM * 2;
const USABLE_HEIGHT_MM = LABEL_HEIGHT_MM - LABEL_PADDING_MM * 2;

/**
 * Étiquette d'article : 3 codes occupant toute la largeur utile —
 * 3 × 18,3 mm + 2 gouttières de 2 mm = les 59 mm disponibles.
 */
const QR_REPEATS = 3;
const QR_SIZE_MM =
  (USABLE_WIDTH_MM - QR_GAP_MM * (QR_REPEATS - 1)) / QR_REPEATS;

/** Étiquette de caisse : le QR code occupe toute la hauteur utile. */
const CAPTION_QR_SIZE_MM = USABLE_HEIGHT_MM;

const A4_COLUMNS = 4;
/** Largeur utile approximative d'une carte de planche A4 (marges 8 mm, 4 colonnes). */
const A4_CARD_WIDTH_MM = (210 - 16) / A4_COLUMNS - 4;
const A4_QR_SIZE_MM =
  (A4_CARD_WIDTH_MM - QR_GAP_MM * (QR_REPEATS - 1)) / QR_REPEATS;
const A4_CAPTION_QR_SIZE_MM = 22;

/**
 * Corps du numéro de caisse, en points, pour qu'il remplisse exactement la
 * place laissée par le QR code.
 *
 * Dans une graisse extra-bold, un chiffre avance d'environ 0,60 em et sa
 * hauteur de capitale vaut environ 0,72 em (les chiffres n'ont ni jambage ni
 * ascendante). On prend donc la plus contraignante des deux dimensions.
 */
function captionFontPt(widthMm: number, heightMm: number, chars: number): number {
  const emMm = Math.min(widthMm / (0.6 * Math.max(chars, 1)), heightMm / 0.72);
  return Math.floor((emMm / 25.4) * 72);
}

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
            {items.some((item) => item.caption)
              ? " · numéro de caisse en gros à côté du QR code"
              : ` · code répété ${QR_REPEATS}× pour rester scannable une fois enroulé`}
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
                <BrotherLabelPreview reference={item.reference} caption={item.caption} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <SheetLabelPreview
                  key={item.id}
                  reference={item.reference}
                  caption={item.caption}
                />
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
    .map((item) =>
      item.caption
        ? `<section class="page caption">
             ${qrSvgMarkup(item.reference, CAPTION_QR_SIZE_MM)}
             <span class="number" style="font-size:${captionFontPt(
               USABLE_WIDTH_MM - CAPTION_QR_SIZE_MM - QR_GAP_MM,
               USABLE_HEIGHT_MM,
               item.caption.length,
             )}pt">${escapeHtml(item.caption)}</span>
           </section>`
        : `<section class="page">${repeatQr(item.reference, QR_SIZE_MM)}</section>`,
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
        padding: ${LABEL_PADDING_MM}mm;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: ${QR_GAP_MM}mm;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      /* Étiquette de caisse : QR à gauche, numéro en très gros à droite. */
      .page.caption { gap: ${QR_GAP_MM}mm; }
      .number {
        font-weight: 800;
        line-height: 0.8;
        letter-spacing: -0.04em;
        white-space: nowrap;
      }
    `,
    bodyHtml: pages,
  });
}

/** Planche A4 : plusieurs étiquettes par ligne. */
function printA4Sheet(items: LabelItem[], title: string) {
  const cards = items
    .map((item) =>
      item.caption
        ? `<div class="card">
             ${qrSvgMarkup(item.reference, A4_CAPTION_QR_SIZE_MM)}
             <span class="number" style="font-size:${captionFontPt(
               A4_CARD_WIDTH_MM - A4_CAPTION_QR_SIZE_MM - QR_GAP_MM,
               A4_CAPTION_QR_SIZE_MM,
               item.caption.length,
             )}pt">${escapeHtml(item.caption)}</span>
           </div>`
        : `<div class="card">${repeatQr(item.reference, A4_QR_SIZE_MM)}</div>`,
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
      .number {
        font-weight: 800;
        line-height: 0.8;
        letter-spacing: -0.04em;
        white-space: nowrap;
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
        <QrCode
          key={index}
          value={reference}
          size={size}
          margin={QR_QUIET_ZONE_MODULES}
          className="text-black"
        />
      ))}
    </>
  );
}

/** Aperçu à taille réelle d'une étiquette 62 × 29 mm. */
function BrotherLabelPreview({
  reference,
  caption,
}: {
  reference: string;
  caption?: string;
}) {
  return (
    <div
      className="flex items-center justify-center bg-white text-black"
      style={{
        width: `${LABEL_WIDTH_MM}mm`,
        height: `${LABEL_HEIGHT_MM}mm`,
        padding: `${LABEL_PADDING_MM}mm`,
        gap: `${QR_GAP_MM}mm`,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {caption ? (
        <>
          <QrCode
            value={reference}
            size={`${CAPTION_QR_SIZE_MM}mm`}
            margin={QR_QUIET_ZONE_MODULES}
            className="text-black"
          />
          <span
            className="font-extrabold text-black"
            style={{
              fontSize: `${captionFontPt(
                USABLE_WIDTH_MM - CAPTION_QR_SIZE_MM - QR_GAP_MM,
                USABLE_HEIGHT_MM,
                caption.length,
              )}pt`,
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
            }}
          >
            {caption}
          </span>
        </>
      ) : (
        <RepeatedQr reference={reference} size={`${QR_SIZE_MM}mm`} />
      )}
    </div>
  );
}

/** Aperçu d'une étiquette de planche A4. */
function SheetLabelPreview({
  reference,
  caption,
}: {
  reference: string;
  caption?: string;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-[var(--crm-border)] bg-white p-3"
      style={{ gap: `${QR_GAP_MM}mm` }}
    >
      {caption ? (
        <>
          <QrCode
            value={reference}
            size={`${A4_CAPTION_QR_SIZE_MM}mm`}
            margin={QR_QUIET_ZONE_MODULES}
            className="text-black"
          />
          <span
            className="font-extrabold text-black"
            style={{
              fontSize: `${captionFontPt(
                A4_CARD_WIDTH_MM - A4_CAPTION_QR_SIZE_MM - QR_GAP_MM,
                A4_CAPTION_QR_SIZE_MM,
                caption.length,
              )}pt`,
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
            }}
          >
            {caption}
          </span>
        </>
      ) : (
        <RepeatedQr reference={reference} size={`${A4_QR_SIZE_MM}mm`} />
      )}
    </div>
  );
}
