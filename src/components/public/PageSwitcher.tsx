import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bike, ChevronDown, PackageCheck, SprayCan, Store, Truck } from "lucide-react";

const PAGES = [
  { to: "/boutique", label: "Boutique", icon: Store },
  { to: "/collecte", label: "Collecte", icon: Truck },
  { to: "/aerogommage", label: "Aérogommage", icon: SprayCan },
  { to: "/velo", label: "Cycle en Bray", icon: Bike },
  { to: "/livraison", label: "Livraison", icon: PackageCheck },
];

function matchPage(pathname: string) {
  if (pathname.startsWith("/boutique")) return PAGES[0];
  return PAGES.find((p) => pathname.startsWith(p.to)) ?? PAGES[0];
}

export function PageSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = matchPage(location.pathname);
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/55 bg-white/85 px-4 text-sm font-semibold text-zinc-900 shadow-[0_12px_30px_rgba(24,24,27,0.08)] backdrop-blur transition hover:-translate-y-0.5 sm:h-14"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-black/6 bg-white p-1.5 shadow-[0_28px_70px_rgba(24,24,27,0.18)]">
          {PAGES.map(({ to, label, icon: Icon }) => {
            const active = current.to === to;
            return (
              <button
                key={to}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!active) navigate(to);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500/10 text-brand-700"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-brand-600" : "text-zinc-400"}`} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Petit en-tête de page (pictogramme + nom), pour les pages hors boutique. */
export const PAGE_HEADERS: Record<string, { icon: typeof Store; title: string; subtitle: string }> = {
  "/collecte": {
    icon: Truck,
    title: "Collecte à domicile",
    subtitle: "Nous venons récupérer vos objets réemployables chez vous.",
  },
  "/aerogommage": {
    icon: SprayCan,
    title: "Aérogommage",
    subtitle: "Décapage doux de vos meubles et objets.",
  },
  "/velo": {
    icon: Bike,
    title: "Cycle en Bray",
    subtitle: "Réparation et reconditionnement de vélos.",
  },
  "/livraison": {
    icon: PackageCheck,
    title: "Livraison d'un article",
    subtitle: "Faites-vous livrer un article à votre adresse.",
  },
};
