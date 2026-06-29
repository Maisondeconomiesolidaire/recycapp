import { ReactNode } from "react";

/** Conteneur visuel commun aux formulaires publics. */
export function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-10 sm:px-7 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base text-zinc-500">{subtitle}</p>
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
