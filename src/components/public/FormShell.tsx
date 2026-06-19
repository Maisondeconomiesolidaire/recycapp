import { ReactNode } from "react";

/** Conteneur visuel commun aux formulaires publics. */
export function FormShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-10 sm:px-7 lg:px-8">
      <div className="mb-6">
        <div className="flex items-start gap-3">
          {accent ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600">
              {accent}
            </span>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-zinc-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
