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
    bg: string;
    text: string;
    mark: "pdf" | "sheet" | "doc" | "image" | "text" | "zip" | "slide" | "file";
  }
> = {
  PDF: { accent: "#ef1f1f", bg: "#fff7f7", text: "#222222", mark: "pdf" },
  XLS: { accent: "#1f9d55", bg: "#f3fff8", text: "#0f3d25", mark: "sheet" },
  DOC: { accent: "#2878d8", bg: "#f4f9ff", text: "#17385f", mark: "doc" },
  TXT: { accent: "#6b7280", bg: "#f8fafc", text: "#27272a", mark: "text" },
  IMG: { accent: "#06a7d8", bg: "#f1fbff", text: "#07556b", mark: "image" },
  PPT: { accent: "#e56b1f", bg: "#fff7ed", text: "#6f2f12", mark: "slide" },
  ZIP: { accent: "#d69a12", bg: "#fffbeb", text: "#684808", mark: "zip" },
  FILE: { accent: "#7c3aed", bg: "#faf7ff", text: "#3b1a72", mark: "file" },
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
        "relative shrink-0 rounded-[18px] bg-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]",
        compact ? "h-12 w-12" : "h-16 w-16",
      )}
      style={{
        border: `${compact ? 2 : 3}px solid ${theme.accent}`,
        backgroundColor: theme.bg,
      }}
      aria-label={`${kind} file`}
    >
      <div
        className={cn(
          "absolute right-[-2px] top-[-2px] rounded-bl-[12px] border-b border-l bg-white/90",
          compact ? "h-4 w-4" : "h-5 w-5",
        )}
        style={{ borderColor: theme.accent }}
      />
      <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1.5">
        <FileMark theme={theme} compact={compact} />
        <span
          className={cn(
            "font-black leading-none tracking-[-0.04em]",
            compact ? "text-[13px]" : "text-[17px]",
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
  const width = compact ? 24 : 34;
  const height = compact ? 22 : 30;

  if (theme.mark === "pdf") {
    return (
      <svg width={width} height={height} viewBox="0 0 48 42" fill="none" aria-hidden>
        <path
          d="M13 32c7-5 11-15 13-25 4 14 8 21 16 23-10-3-22-2-35 4 7-5 16-7 27-7"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (theme.mark === "sheet") {
    return (
      <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
        <rect x="8" y="7" width="28" height="26" rx="3" stroke={stroke} strokeWidth="3" />
        <path d="M8 16h28M8 24h28M18 7v26M28 7v26" stroke={stroke} strokeWidth="2.4" />
      </svg>
    );
  }

  if (theme.mark === "doc") {
    return (
      <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
        <path d="M12 7h20l5 6v20H12z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        <path d="M17 17h14M17 23h14M17 29h10" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (theme.mark === "image") {
    return (
      <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
        <rect x="8" y="8" width="28" height="24" rx="4" stroke={stroke} strokeWidth="3" />
        <circle cx="28" cy="16" r="3" fill={stroke} />
        <path d="M12 29l8-8 6 6 4-4 6 6" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (theme.mark === "slide") {
    return (
      <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
        <rect x="8" y="8" width="28" height="22" rx="3" stroke={stroke} strokeWidth="3" />
        <path d="M18 16h8a5 5 0 010 10h-8z" fill={stroke} opacity=".9" />
      </svg>
    );
  }

  if (theme.mark === "zip") {
    return (
      <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
        <path d="M14 7h16l6 7v19H14z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        <path d="M20 8v24M20 12h5M20 17h-4M20 22h5M20 27h-4" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} viewBox="0 0 44 40" fill="none" aria-hidden>
      <path d="M13 7h18l6 7v19H13z" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 18h14M18 24h14" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
