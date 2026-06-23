import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException } from "@zxing/library";
import { X, Camera, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function CameraScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    // Aide le décodeur (essaie plus fort, formats courants dont QR + Code128).
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.DATA_MATRIX,
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
    let stopped = false;

    // Caméra arrière + haute résolution = code net même de près.
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };

    async function applyContinuousFocus() {
      const stream = (videoRef.current?.srcObject as MediaStream | null) ?? null;
      const track = stream?.getVideoTracks?.()[0];
      if (!track) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const caps = (track.getCapabilities?.() as any) ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const advanced: any[] = [];
      if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
        advanced.push({ focusMode: "continuous" });
      }
      if (advanced.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced } as any).catch(() => {});
      }
    }

    (async () => {
      try {
        if (!videoRef.current || stopped) return;
        controlsRef.current = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, err) => {
            if (result && !stopped) {
              stopped = true;
              onDetected(result.getText());
              onClose();
            }
            if (err && !(err instanceof NotFoundException)) {
              // Ignore "not found" errors (continuous scanning)
            }
          },
        );
        if (!stopped) {
          void applyContinuousFocus();
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!stopped) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("Permission") || msg.includes("NotAllowed")) {
            setError("Accès à la caméra refusé. Vérifiez les permissions du navigateur.");
          } else {
            setError("Impossible d'accéder à la caméra.");
          }
          setLoading(false);
        }
      }
    })();

    return () => {
      stopped = true;
      try {
        controlsRef.current?.stop();
      } catch {
        /* déjà arrêté */
      }
    };
  }, [onDetected, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 safe-top">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-zinc-300" />
          <span className="text-sm font-semibold text-zinc-200">Scanner un code-barres</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Overlay with cutout */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-52 w-72">
              {/* Dark overlay */}
              <div className="absolute inset-0 -top-[100vh] -bottom-[100vh] -left-[100vw] -right-[100vw] bg-black/50" />
              {/* Corner guides */}
              <div className="absolute inset-0 pointer-events-none">
                <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white rounded-tl-sm" />
                <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white rounded-tr-sm" />
                <span className="absolute left-0 bottom-0 h-8 w-8 border-l-2 border-b-2 border-white rounded-bl-sm" />
                <span className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-white rounded-br-sm" />
                {/* Scan line */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-500 opacity-80 animate-scan-line" />
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
              <p className="text-sm text-zinc-300">Initialisation de la caméra…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-zinc-200">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!error && !loading && (
        <div className="px-4 py-4 text-center safe-bottom">
          <p className="text-xs text-zinc-500">Centrez le code-barres dans le cadre</p>
        </div>
      )}
    </div>,
    document.body
  );
}
