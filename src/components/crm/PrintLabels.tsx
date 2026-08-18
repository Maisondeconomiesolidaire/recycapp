import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { QrCode } from "../ui/QrCode";
import { formatPrice } from "../../lib/format";

export interface LabelArticle {
  _id: string;
  title: string;
  price: number;
  internalReference?: string;
  gdrReference?: string;
  category: string;
  condition?: string;
}

/** « labels » = étiquette complète (prix, catégorie…), « qr » = QR code + référence. */
export type PrintLabelsMode = "labels" | "qr";

/**
 * « brother » = une étiquette 62 × 29 mm par page, prête pour une Brother
 * QL-700 (rouleau DK 62 × 29). « a4 » = planche d'étiquettes sur feuille A4.
 */
type Sheet = "brother" | "a4";

const BROTHER_WIDTH_MM = 62;
const BROTHER_HEIGHT_MM = 29;

interface PrintLabelsProps {
  articles: LabelArticle[];
  mode?: PrintLabelsMode;
  onClose: () => void;
}

export function PrintLabels({ articles, mode = "labels", onClose }: PrintLabelsProps) {
  const qrOnly = mode === "qr";
  // L'impression des QR codes vise la QL-700 : on part directement sur le
  // format 62 × 29 mm, sans réglage à faire avant d'imprimer.
  const [sheet, setSheet] = useState<Sheet>(qrOnly ? "brother" : "a4");
  const columns = qrOnly ? 4 : 3;

  // Injecte le CSS d'impression : seules les étiquettes sortent sur le papier.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "print-labels-css";
    const common = `
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        body > *:not(#print-labels-root) { display: none !important; }
        #print-labels-root {
          position: static !important;
          inset: auto !important;
          display: block !important;
          height: auto !important;
          overflow: visible !important;
          background: white !important;
        }
        #print-labels-root .print-hidden { display: none !important; }
        #print-labels-root .print-only { display: block !important; }
        #print-labels-root .label-card {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: white !important;
          color: black !important;
        }
      }
    `;
    const brother = `
      @media print {
        @page { size: ${BROTHER_WIDTH_MM}mm ${BROTHER_HEIGHT_MM}mm; margin: 0; }
        #print-labels-root .labels-grid {
          display: block !important;
          padding: 0 !important;
          background: white !important;
        }
        #print-labels-root .label-card {
          width: ${BROTHER_WIDTH_MM}mm !important;
          height: ${BROTHER_HEIGHT_MM}mm !important;
          box-sizing: border-box !important;
          padding: 1.5mm 2mm !important;
          border: 0 !important;
          border-radius: 0 !important;
          overflow: hidden !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        #print-labels-root .label-card:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;
    const a4 = `
      @media print {
        @page { size: A4; margin: 8mm; }
        #print-labels-root .labels-grid {
          display: grid !important;
          grid-template-columns: repeat(${columns}, 1fr) !important;
          gap: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        #print-labels-root .label-card {
          border: 0.5pt solid #ccc !important;
          padding: 4pt 6pt !important;
        }
      }
    `;
    style.textContent = common + (sheet === "brother" ? brother : a4);
    document.head.appendChild(style);
    return () => document.getElementById("print-labels-css")?.remove();
  }, [columns, sheet]);

  function handlePrint() {
    window.print();
  }

  const brother = sheet === "brother";

  const content = (
    <div
      id="print-labels-root"
      className="fixed inset-0 z-50 flex flex-col bg-[color:var(--crm-bg)]"
    >
      {/* Barre d'outils — masquée à l'impression */}
      <div className="print-hidden flex flex-wrap items-center justify-between gap-3 border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">
            {qrOnly ? "Impression des QR codes" : "Impression des étiquettes"} —{" "}
            {articles.length} article{articles.length > 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-zinc-400">
            {brother
              ? `Brother QL-700 · ${BROTHER_WIDTH_MM} × ${BROTHER_HEIGHT_MM} mm · une étiquette par page`
              : `Planche A4 · ${columns} étiquettes par ligne`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--crm-border)] p-0.5">
            {(
              [
                ["brother", `QL-700 ${BROTHER_WIDTH_MM}×${BROTHER_HEIGHT_MM}`],
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
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,16,79,0.3)] hover:shadow-[0_6px_20px_rgba(241,16,79,0.4)] transition"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2.5 text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Aperçu écran */}
      <div className="flex-1 overflow-auto p-6 print-hidden">
        {brother ? (
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4">
            {articles.map((article) => (
              <div
                key={article._id}
                className="rounded-lg border border-[var(--crm-border)] bg-white shadow-sm"
              >
                <BrotherLabel article={article} qrOnly={qrOnly} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            <div
              className={`labels-grid grid gap-3 ${qrOnly ? "grid-cols-4" : "grid-cols-3"}`}
            >
              {articles.map((article) => (
                <SheetLabel key={article._id} article={article} qrOnly={qrOnly} preview />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Version imprimée (sans habillage d'aperçu) */}
      <div className="print-only hidden labels-grid">
        {articles.map((article) =>
          brother ? (
            <BrotherLabel key={article._id} article={article} qrOnly={qrOnly} />
          ) : (
            <SheetLabel key={article._id} article={article} qrOnly={qrOnly} preview={false} />
          ),
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function labelReference(article: LabelArticle) {
  return article.internalReference ?? article.gdrReference ?? article._id.slice(-8);
}

/**
 * Étiquette 62 × 29 mm : QR code à gauche, informations à droite. Les tailles
 * sont en millimètres pour que l'aperçu écran corresponde exactement au papier.
 */
function BrotherLabel({
  article,
  qrOnly,
}: {
  article: LabelArticle;
  qrOnly: boolean;
}) {
  const ref = labelReference(article);

  return (
    <div
      className="label-card flex items-center gap-[2mm] bg-white text-black"
      style={{
        width: `${BROTHER_WIDTH_MM}mm`,
        height: `${BROTHER_HEIGHT_MM}mm`,
        padding: "1.5mm 2mm",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div className="flex shrink-0 flex-col items-center">
        <QrCode value={ref} size="21mm" className="text-black" />
        <span
          className="mt-[0.5mm] font-mono font-semibold leading-none text-black"
          style={{ fontSize: "6pt" }}
        >
          {ref}
        </span>
      </div>

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
        {qrOnly ? null : (
          <>
            <p
              className="truncate leading-tight text-zinc-600"
              style={{ fontSize: "6pt" }}
            >
              {article.category}
              {article.condition ? ` · ${article.condition}` : ""}
            </p>
            <p
              className="mt-[0.5mm] font-extrabold leading-none text-black"
              style={{ fontSize: "11pt" }}
            >
              {formatPrice(article.price)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Étiquette de planche A4 (plusieurs par ligne). */
function SheetLabel({
  article,
  preview,
  qrOnly,
}: {
  article: LabelArticle;
  preview: boolean;
  qrOnly: boolean;
}) {
  const ref = labelReference(article);

  return (
    <div
      className={`label-card ${
        preview
          ? "rounded-xl border border-[var(--crm-border)] bg-white p-4"
          : "border border-zinc-300 p-2 bg-white"
      }`}
    >
      <div className="flex justify-center">
        <QrCode
          value={ref}
          size={preview ? (qrOnly ? 104 : 88) : qrOnly ? 90 : 76}
          className="text-black"
        />
      </div>

      <p
        className={`text-center font-mono font-semibold text-black ${
          preview ? "mt-1 text-[11px]" : "mt-0.5 text-[8pt]"
        }`}
      >
        {ref}
      </p>

      <div className={`border-t border-zinc-200 ${preview ? "my-2" : "my-1"}`} />

      <p
        className={`font-semibold leading-tight text-black line-clamp-2 ${
          preview ? "text-sm" : "text-[7.5pt]"
        }`}
      >
        {article.title}
      </p>

      {qrOnly ? null : (
        <>
          <p
            className={`text-zinc-500 truncate ${
              preview ? "mt-0.5 text-[11px]" : "mt-0.5 text-[6.5pt]"
            }`}
          >
            {article.category}
            {article.condition ? ` · ${article.condition}` : ""}
          </p>
          <p
            className={`font-extrabold text-black ${
              preview ? "mt-2 text-xl" : "mt-1 text-[11pt]"
            }`}
          >
            {formatPrice(article.price)}
          </p>
        </>
      )}
    </div>
  );
}
