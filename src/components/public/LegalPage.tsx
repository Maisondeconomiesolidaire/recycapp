import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Mise en page commune aux pages légales (CGU, Politique de confidentialité) :
 * un document lisible, centré, avec titres, paragraphes et listes homogènes.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-7 sm:py-16 lg:px-8">
      <Link
        to="/boutique"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la boutique
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {title}
      </h1>
      {updatedAt && (
        <p className="mt-2 text-sm text-zinc-500">Version en vigueur au {updatedAt}</p>
      )}
      <div className="mt-8 space-y-8 text-[15px] leading-7 text-zinc-700">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-1 list-disc space-y-1.5 pl-5 marker:text-zinc-400">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
