import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { QrCode } from "../ui/QrCode";
import { formatPrice } from "../../lib/format";
import { escapeHtml, printIsolatedDocument, qrSvgMarkup } from "../../lib/printLabels";

export interface LabelArticle {
  _id: string;
  title: string;
  price: number;
  internalReference?: string;
  gdrReference?: string;
  category: string;
  condition?: string;
}

/** « labels » = étiquette complète (prix, catégorie…), « qr » = QR code seul. */
export type PrintLabelsMode = "labels" | "qr";

/**
 * « brother » = une étiquette 62 × 29 mm par page, prête pour une Brother
 * QL-700 (rouleau DK 62 × 29). « a4 » = planche d'étiquettes sur feuille A4.
 */
type Sheet = "brother" | "a4";

const LABEL_WIDTH_MM = 62;
const LABEL_HEIGHT_MM = 29;
/** Taille du QR code sur une étiquette 62 × 29, en millimètres. */
const QR_ONLY_SIZE_MM = 19;
const QR_WITH_INFO_SIZE_MM = 20;

interface PrintLabelsProps {
  articles: LabelArticle[];
  mode?: PrintLabelsMode;
  onClose: () => void;
}

function labelReference(article: LabelArticle) {
  return article.internalReference ?? article.gdrReference ?? article._id.slice(-8);
}

export function PrintLabels({ articles, mode = "labels", onClose }: PrintLabelsProps) {
  const qrOnly = mode === "qr";
  // L'impression des QR codes vise la QL-700 : on part directement sur le
  // format 62 × 29 mm, sans réglage à faire avant d'imprimer.
  const [sheet, setSheet] = useState<Sheet>(qrOnly ? "brother" : "a4");
  const brother = sheet === "brother";
  const columns = qrOnly ? 4 : 3;

  function handlePrint() {
    if (brother) printBrotherLabels(articles, qrOnly);
    else printA4Sheet(articles, qrOnly, columns);
  }

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--crm-bg)]">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-zinc-100">
            {qrOnly ? "Impression des QR codes" : "Impression des étiquettes"} —{" "}
            {articles.length} article{articles.length > 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-zinc-400">
            {brother
              ? `Brother QL-700 · ${LABEL_WIDTH_MM} × ${LABEL_HEIGHT_MM} mm · une étiquette par page`
              : `Planche A4 · ${columns} étiquettes par ligne`}
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
            {articles.map((article) => (
              <div
                key={article._id}
                className="rounded-lg border border-[var(--crm-border)] bg-white shadow-sm"
              >
                <BrotherLabelPreview article={article} qrOnly={qrOnly} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div
              className={`grid gap-3 grid-cols-2 sm:grid-cols-3 ${
                qrOnly ? "lg:grid-cols-4" : "lg:grid-cols-3"
              }`}
            >
              {articles.map((article) => (
                <SheetLabelPreview key={article._id} article={article} qrOnly={qrOnly} />
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

/** Une étiquette 62 × 29 mm par page, QR code centré. */
function printBrotherLabels(articles: LabelArticle[], qrOnly: boolean) {
  const pages = articles
    .map((article) => {
      const ref = escapeHtml(labelReference(article));
      if (qrOnly) {
        return `<section class="page qr-only">
          <div class="stack">
            ${qrSvgMarkup(labelReference(article), QR_ONLY_SIZE_MM)}
            <span class="ref">${ref}</span>
          </div>
        </section>`;
      }
      const meta = [article.category, article.condition].filter(Boolean).join(" · ");
      return `<section class="page with-info">
        <div class="stack">
          ${qrSvgMarkup(labelReference(article), QR_WITH_INFO_SIZE_MM)}
          <span class="ref">${ref}</span>
        </div>
        <div class="info">
          <p class="title">${escapeHtml(article.title)}</p>
          <p class="meta">${escapeHtml(meta)}</p>
          <p class="price">${escapeHtml(formatPrice(article.price))}</p>
        </div>
      </section>`;
    })
    .join("");

  printIsolatedDocument({
    title: qrOnly ? "QR codes" : "Étiquettes",
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
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      /* QR seul : centré au milieu de l'étiquette. */
      .page.qr-only { justify-content: center; }
      .page.with-info { justify-content: flex-start; gap: 2mm; }
      .stack { display: flex; flex-direction: column; align-items: center; }
      .ref {
        margin-top: 0.6mm;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 7pt;
        font-weight: 600;
        line-height: 1;
        letter-spacing: 0.02em;
      }
      .info { flex: 1; min-width: 0; }
      .title {
        margin: 0;
        font-size: 7.5pt;
        font-weight: 700;
        line-height: 1.15;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta {
        margin: 0.4mm 0 0;
        font-size: 6pt;
        color: #444;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .price { margin: 0.6mm 0 0; font-size: 11pt; font-weight: 800; line-height: 1; }
    `,
    bodyHtml: pages,
  });
}

/** Planche A4 : plusieurs étiquettes par ligne. */
function printA4Sheet(articles: LabelArticle[], qrOnly: boolean, columns: number) {
  const cards = articles
    .map((article) => {
      const ref = escapeHtml(labelReference(article));
      const meta = [article.category, article.condition].filter(Boolean).join(" · ");
      return `<div class="card">
        <div class="qr">${qrSvgMarkup(labelReference(article), qrOnly ? 24 : 20)}</div>
        <p class="ref">${ref}</p>
        <hr />
        <p class="title">${escapeHtml(article.title)}</p>
        ${
          qrOnly
            ? ""
            : `<p class="meta">${escapeHtml(meta)}</p>
               <p class="price">${escapeHtml(formatPrice(article.price))}</p>`
        }
      </div>`;
    })
    .join("");

  printIsolatedDocument({
    title: qrOnly ? "QR codes" : "Étiquettes",
    pageCss: "@page { size: A4; margin: 8mm; }",
    bodyCss: `
      .sheet { display: grid; grid-template-columns: repeat(${columns}, 1fr); }
      .card {
        border: 0.5pt solid #ccc;
        padding: 4pt 6pt;
        box-sizing: border-box;
        page-break-inside: avoid;
        break-inside: avoid;
        text-align: center;
      }
      .qr { display: flex; justify-content: center; }
      .ref {
        margin: 2pt 0 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 8pt;
        font-weight: 600;
      }
      hr { border: 0; border-top: 0.5pt solid #e4e4e7; margin: 3pt 0; }
      .title {
        margin: 0;
        font-size: 7.5pt;
        font-weight: 600;
        line-height: 1.2;
        text-align: left;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .meta {
        margin: 2pt 0 0;
        font-size: 6.5pt;
        color: #71717a;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .price { margin: 3pt 0 0; font-size: 11pt; font-weight: 800; text-align: left; }
    `,
    bodyHtml: `<div class="sheet">${cards}</div>`,
  });
}

/* ─── Aperçu écran ───────────────────────────────────────────────────────── */

/** Aperçu à taille réelle d'une étiquette 62 × 29 mm. */
function BrotherLabelPreview({
  article,
  qrOnly,
}: {
  article: LabelArticle;
  qrOnly: boolean;
}) {
  const ref = labelReference(article);

  return (
    <div
      className={`flex items-center bg-white text-black ${
        qrOnly ? "justify-center" : "justify-start gap-[2mm]"
      }`}
      style={{
        width: `${LABEL_WIDTH_MM}mm`,
        height: `${LABEL_HEIGHT_MM}mm`,
        padding: "1.5mm 2mm",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div className="flex shrink-0 flex-col items-center">
        <QrCode
          value={ref}
          size={`${qrOnly ? QR_ONLY_SIZE_MM : QR_WITH_INFO_SIZE_MM}mm`}
          className="text-black"
        />
        <span
          className="mt-[0.6mm] font-mono font-semibold leading-none text-black"
          style={{ fontSize: "7pt" }}
        >
          {ref}
        </span>
      </div>

      {qrOnly ? null : (
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p
            className="font-bold leading-tight text-black"
            style={{
              fontSize: "7.5pt",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {article.title}
          </p>
          <p className="truncate leading-tight text-zinc-600" style={{ fontSize: "6pt" }}>
            {article.category}
            {article.condition ? ` · ${article.condition}` : ""}
          </p>
          <p
            className="mt-[0.6mm] font-extrabold leading-none text-black"
            style={{ fontSize: "11pt" }}
          >
            {formatPrice(article.price)}
          </p>
        </div>
      )}
    </div>
  );
}

/** Aperçu d'une étiquette de planche A4. */
function SheetLabelPreview({
  article,
  qrOnly,
}: {
  article: LabelArticle;
  qrOnly: boolean;
}) {
  const ref = labelReference(article);

  return (
    <div className="rounded-xl border border-[var(--crm-border)] bg-white p-4">
      <div className="flex justify-center">
        <QrCode value={ref} size={qrOnly ? 104 : 88} className="text-black" />
      </div>
      <p className="mt-1 text-center font-mono text-[11px] font-semibold text-black">
        {ref}
      </p>
      <div className="my-2 border-t border-zinc-200" />
      <p className="line-clamp-2 text-sm font-semibold leading-tight text-black">
        {article.title}
      </p>
      {qrOnly ? null : (
        <>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
            {article.category}
            {article.condition ? ` · ${article.condition}` : ""}
          </p>
          <p className="mt-2 text-xl font-extrabold text-black">
            {formatPrice(article.price)}
          </p>
        </>
      )}
    </div>
  );
}
