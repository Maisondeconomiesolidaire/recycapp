import { useEffect } from "react";
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

/** « labels » = étiquette complète (prix, catégorie…), « qr » = planche de QR codes. */
export type PrintLabelsMode = "labels" | "qr";

interface PrintLabelsProps {
  articles: LabelArticle[];
  mode?: PrintLabelsMode;
  onClose: () => void;
}

export function PrintLabels({ articles, mode = "labels", onClose }: PrintLabelsProps) {
  const qrOnly = mode === "qr";
  const columns = qrOnly ? 4 : 3;

  // Injecte le CSS d'impression : seules les étiquettes sortent sur le papier.
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "print-labels-css";
    style.textContent = `
      @media print {
        body > *:not(#print-labels-root) { display: none !important; }
        #print-labels-root .print-hidden { display: none !important; }
        #print-labels-root .print-only { display: block !important; }
        #print-labels-root .labels-grid {
          display: grid !important;
          grid-template-columns: repeat(${columns}, 1fr) !important;
          gap: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        #print-labels-root .label-card {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          border: 0.5pt solid #ccc !important;
          padding: 4pt 6pt !important;
          background: white !important;
          color: black !important;
        }
        @page { margin: 8mm; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("print-labels-css")?.remove();
  }, [columns]);

  function handlePrint() {
    window.print();
  }

  const content = (
    <div
      id="print-labels-root"
      className="fixed inset-0 z-50 flex flex-col bg-[color:var(--crm-bg)]"
    >
      {/* Barre d'outils — masquée à l'impression */}
      <div className="print-hidden flex items-center justify-between border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">
            {qrOnly ? "Impression des QR codes" : "Impression des étiquettes"} —{" "}
            {articles.length} article{articles.length > 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-zinc-400">
            {qrOnly
              ? "4 QR codes par ligne · à coller sur chaque article"
              : "3 étiquettes par ligne · Format 62 × 29 mm"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="mx-auto max-w-4xl">
          <div
            className={`labels-grid grid gap-3 ${qrOnly ? "grid-cols-4" : "grid-cols-3"}`}
          >
            {articles.map((article) => (
              <LabelCard key={article._id} article={article} qrOnly={qrOnly} preview />
            ))}
          </div>
        </div>
      </div>

      {/* Version imprimée (sans habillage d'aperçu) */}
      <div className="print-only hidden labels-grid">
        {articles.map((article) => (
          <LabelCard key={article._id} article={article} qrOnly={qrOnly} preview={false} />
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function LabelCard({
  article,
  preview,
  qrOnly,
}: {
  article: LabelArticle;
  preview: boolean;
  qrOnly: boolean;
}) {
  const ref = article.internalReference ?? article.gdrReference ?? article._id.slice(-8);

  return (
    <div
      className={`label-card ${
        preview
          ? "rounded-xl border border-[var(--crm-border)] bg-white p-4"
          : "border border-zinc-300 p-2 bg-white"
      }`}
    >
      {/* QR code */}
      <div className="flex justify-center">
        <QrCode
          value={ref}
          size={preview ? (qrOnly ? 104 : 88) : qrOnly ? 90 : 76}
          className="text-black"
        />
      </div>

      {/* Référence */}
      <p
        className={`text-center font-mono font-semibold text-black ${
          preview ? "mt-1 text-[11px]" : "mt-0.5 text-[8pt]"
        }`}
      >
        {ref}
      </p>

      {/* Séparateur */}
      <div className={`border-t border-zinc-200 ${preview ? "my-2" : "my-1"}`} />

      {/* Nom */}
      <p
        className={`font-semibold leading-tight text-black line-clamp-2 ${
          preview ? "text-sm" : "text-[7.5pt]"
        }`}
      >
        {article.title}
      </p>

      {qrOnly ? null : (
        <>
          {/* Catégorie + état */}
          <p
            className={`text-zinc-500 truncate ${
              preview ? "mt-0.5 text-[11px]" : "mt-0.5 text-[6.5pt]"
            }`}
          >
            {article.category}
            {article.condition ? ` · ${article.condition}` : ""}
          </p>

          {/* Prix */}
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
