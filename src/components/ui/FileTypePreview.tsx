import { cn } from "../../lib/cn";

export function getFileKind(name: string, mimeType?: string | null) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType?.includes("pdf") || extension === "pdf") return "PDF";
  if (mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return "IMG";
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || ["xls", "xlsx", "csv"].includes(extension)) return "XLS";
  if (mimeType?.includes("word") || ["doc", "docx"].includes(extension)) return "DOC";
  if (mimeType?.includes("presentation") || ["ppt", "pptx"].includes(extension)) return "PPT";
  if (mimeType?.startsWith("text/") || ["txt", "md", "rtf"].includes(extension)) return "TXT";
  if (["zip", "rar", "7z"].includes(extension)) return "ZIP";
  return extension ? extension.slice(0, 4).toUpperCase() : "FILE";
}

const KIND_THEME: Record<
  string,
  {
    accent: string;
    soft: string;
    text: string;
    mark: "pdf" | "sheet" | "doc" | "image" | "text" | "zip" | "slide" | "file";
  }
> = {
  PDF: { accent: "#ef1f1f", soft: "#fff4f4", text: "#222222", mark: "pdf" },
  XLS: { accent: "#168c4a", soft: "#f0fff6", text: "#123d28", mark: "sheet" },
  DOC: { accent: "#176fd2", soft: "#f2f8ff", text: "#17385f", mark: "doc" },
  TXT: { accent: "#6b7280", soft: "#f8fafc", text: "#27272a", mark: "text" },
  IMG: { accent: "#0899c5", soft: "#effbff", text: "#07556b", mark: "image" },
  PPT: { accent: "#e56b1f", soft: "#fff5eb", text: "#6f2f12", mark: "slide" },
  ZIP: { accent: "#d69a12", soft: "#fff8df", text: "#684808", mark: "zip" },
  FILE: { accent: "#7c3aed", soft: "#faf7ff", text: "#3b1a72", mark: "file" },
};

export function FileTypePreview({
  name,
  mimeType,
  size = "md",
}: {
  name: string;
  mimeType?: string | null;
  size?: "sm" | "md";
}) {
  const kind = getFileKind(name, mimeType);
  const theme = KIND_THEME[kind] ?? KIND_THEME.FILE;
  const compact = size === "sm";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-[#fbfbfb] shadow-[0_10px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]",
        compact ? "h-14 w-12 rounded-[13px]" : "h-[72px] w-16 rounded-[17px]",
      )}
      style={{
        border: `${compact ? 3 : 4}px solid ${theme.accent}`,
      }}
      aria-label={`${kind} file`}
    >
      <div
        className={cn(
          "absolute right-[-4px] top-[-4px] bg-white shadow-[-2px_2px_0_rgba(0,0,0,0.06)]",
          compact ? "h-5 w-5 rounded-bl-[8px]" : "h-7 w-7 rounded-bl-[10px]",
        )}
        style={{
          borderBottom: `${compact ? 2 : 3}px solid ${theme.accent}`,
          borderLeft: `${compact ? 2 : 3}px solid ${theme.accent}`,
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute rounded-full blur-xl",
          compact ? "-bottom-3 left-1 h-8 w-8" : "-bottom-4 left-1 h-12 w-12",
        )}
        style={{ backgroundColor: theme.soft }}
      />
      <div className="relative flex h-full flex-col items-center justify-center px-1.5">
        <FileMark theme={theme} compact={compact} />
        <span
          className={cn(
            "font-black leading-none tracking-[-0.075em]",
            compact ? "mt-[-1px] text-[14px]" : "mt-0.5 text-[20px]",
          )}
          style={{ color: theme.text }}
        >
          {kind}
        </span>
      </div>
    </div>
  );
}

function FileMark({
  theme,
  compact,
}: {
  theme: (typeof KIND_THEME)[string];
  compact: boolean;
}) {
  const stroke = theme.accent;
  const width = compact ? 30 : 42;
  const height = compact ? 27 : 36;

  if (theme.mark === "pdf") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <path
          d="M13.5 37.5c8.8-6.1 15.1-18.1 17-31 5.1 17.2 10.8 26.2 20 29.1-11.9-4.2-26.5-2.6-43 4.5 8.8-7.1 20.1-10 33.8-8.7"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (theme.mark === "sheet") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <rect x="10" y="8" width="38" height="32" rx="5" fill="white" stroke={stroke} strokeWidth="4" />
        <path d="M10 18h38M10 29h38M23 8v32M36 8v32" stroke={stroke} strokeWidth="3" />
        <path d="M18 35l7-8M25 35l-7-8" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (theme.mark === "doc") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <path d="M16 8h25l7 8v24H16z" fill="white" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M22 20h20M22 27h20M22 34h14" stroke={stroke} strokeWidth="3.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (theme.mark === "image") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <rect x="10" y="9" width="38" height="30" rx="6" fill="white" stroke={stroke} strokeWidth="4" />
        <circle cx="38" cy="18" r="4" fill={stroke} />
        <path d="M15 35l11-11 8 8 6-6 8 9" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (theme.mark === "slide") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <rect x="10" y="10" width="38" height="28" rx="5" fill="white" stroke={stroke} strokeWidth="4" />
        <path d="M25 18h9a7 7 0 010 14h-9z" fill={stroke} opacity=".9" />
        <path d="M17 38h24" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (theme.mark === "zip") {
    return (
      <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
        <path d="M18 8h23l7 8v24H18z" fill="white" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M28 9v30M28 14h7M28 20h-6M28 26h7M28 32h-6" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 58 48" fill="none" aria-hidden>
      <path d="M18 8h23l7 8v24H18z" fill="white" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 22h18M24 30h18" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}
