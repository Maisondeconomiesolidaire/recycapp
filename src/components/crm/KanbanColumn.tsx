import { ReactNode } from "react";

export function KanbanColumn({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 min-w-0 flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2">
          {accent && (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accent }}
            />
          )}
          <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
          <span className="rounded-full bg-[var(--crm-surface-3)] px-2 py-0.5 text-xs text-zinc-400">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 rounded-xl bg-[var(--crm-surface-2)] p-2 min-h-[120px]">
        {children}
      </div>
    </div>
  );
}
