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

const KIND_STYLES: Record<string, string> = {
  PDF: "border-red-400/25 bg-red-500/12 text-red-200",
  IMG: "border-sky-400/25 bg-sky-500/12 text-sky-200",
  XLS: "border-emerald-400/25 bg-emerald-500/12 text-emerald-200",
  DOC: "border-blue-400/25 bg-blue-500/12 text-blue-200",
  PPT: "border-orange-400/25 bg-orange-500/12 text-orange-200",
  TXT: "border-zinc-400/25 bg-zinc-500/12 text-zinc-200",
  ZIP: "border-amber-400/25 bg-amber-500/12 text-amber-200",
  FILE: "border-violet-400/25 bg-violet-500/12 text-violet-200",
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
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border font-black tracking-[0.08em] shadow-[inset_0_-18px_24px_rgba(0,0,0,0.18)]",
        size === "sm" ? "h-10 w-10 text-[10px]" : "h-14 w-14 text-[13px]",
        KIND_STYLES[kind] ?? KIND_STYLES.FILE,
      )}
    >
      <span className="absolute right-0 top-0 h-4 w-4 rounded-bl-lg border-b border-l border-current/25 bg-white/10" />
      <span className="relative z-10">{kind}</span>
    </div>
  );
}
