import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  /** Height of the barcode bars in pixels (default 40) */
  height?: number;
  /** Width multiplier for bar thickness (default 1.5) */
  width?: number;
  /** Show human-readable text below bars (default false) */
  displayValue?: boolean;
  className?: string;
}

export function Barcode({
  value,
  height = 40,
  width = 1.5,
  displayValue = false,
  className,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width,
        height,
        displayValue,
        margin: 0,
        background: "transparent",
        lineColor: "currentColor",
      });
    } catch {
      // Invalid barcode value — render empty
    }
  }, [value, height, width, displayValue]);

  if (!value) return null;
  return <svg ref={svgRef} className={className} />;
}
