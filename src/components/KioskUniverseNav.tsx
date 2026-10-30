/**
 * Bascule entre les vitrines du dépôt.
 *
 * Le même écran d'entrée présente deux univers : la Recyclerie (Recycapp) et
 * le Bâtiment (BâtiRe). Cette barre est le seul chemin de l'un à l'autre.
 *
 * Copie IDENTIQUE dans `~/recycapp` et `~/batire` (même chemin) : composant
 * volontairement autonome — liens absolus, couleurs neutres, aucun import
 * local — pour que les deux vitrines affichent exactement la même barre.
 */
export const KIOSK_UNIVERSES = [
  {
    id: "recyclerie",
    label: "Univers Recyclerie",
    href: "https://recycapp.groupemes.fr/kiosk",
    logo: "/recyclerie-logo.png",
  },
  {
    id: "batiment",
    label: "Univers Bâtiment",
    href: "https://batire.groupemes.fr/kiosk",
    logo: "/batire-logo.jpg",
  },
] as const;

export type KioskUniverse = (typeof KIOSK_UNIVERSES)[number]["id"];

export function KioskUniverseNav({ current }: { current: KioskUniverse }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-[92rem] gap-2 px-5 py-3 sm:px-7 lg:px-8">
        {KIOSK_UNIVERSES.map((universe) => {
          const active = universe.id === current;
          const content = (
            <>
              <img
                src={universe.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain"
              />
              <span className="truncate">{universe.label}</span>
            </>
          );
          const className = `flex min-w-0 flex-1 items-center justify-center gap-3 rounded-2xl px-4 py-3 text-base font-bold transition sm:text-lg ${
            active
              ? "bg-zinc-950 text-white shadow-[0_12px_30px_rgba(24,24,27,0.18)]"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950"
          }`;
          // L'univers courant n'est pas un lien : le toucher rechargerait la
          // vitrine et effacerait la recherche en cours.
          return active ? (
            <span key={universe.id} className={className} aria-current="page">
              {content}
            </span>
          ) : (
            <a key={universe.id} href={universe.href} className={className}>
              {content}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
