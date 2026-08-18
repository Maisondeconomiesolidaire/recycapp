import { useMemo } from "react";
import QRCode from "qrcode";

interface QrCodeProps {
  value: string;
  /** Taille du carré rendu, en pixels (défaut 96). */
  size?: number;
  /** Affiche la valeur en clair sous le QR code. */
  displayValue?: boolean;
  /** Marge en nombre de modules autour du code (défaut 0). */
  margin?: number;
  className?: string;
}

/**
 * QR code rendu en SVG vectoriel : il reste net à l'impression quelle que soit
 * la taille, et prend la couleur du texte courant (`currentColor`).
 */
export function QrCode({
  value,
  size = 96,
  displayValue = false,
  margin = 0,
  className,
}: QrCodeProps) {
  const qr = useMemo(() => {
    if (!value) return null;
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
      const count = modules.size;
      const data = modules.data;
      // Un seul `path` plutôt qu'un rect par module : plus léger à imprimer.
      let path = "";
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (data[row * count + col]) {
            path += `M${col + margin} ${row + margin}h1v1h-1z`;
          }
        }
      }
      return { path, extent: count + margin * 2 };
    } catch {
      return null;
    }
  }, [value, margin]);

  if (!qr) return null;

  return (
    <span className={`inline-flex flex-col items-center ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${qr.extent} ${qr.extent}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR code ${value}`}
      >
        <path d={qr.path} fill="currentColor" />
      </svg>
      {displayValue ? (
        <span className="mt-1 font-mono text-[11px] leading-none">{value}</span>
      ) : null}
    </span>
  );
}
