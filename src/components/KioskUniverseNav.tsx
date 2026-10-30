/**
 * Bascule entre les vitrines du dépôt.
 *
 * Le même écran d'entrée présente deux univers : la Recyclerie (Recycapp) et
 * le Bâtiment (BâtiRe). Cette barre est le seul chemin de l'un à l'autre.
 *
 * Copie IDENTIQUE dans `~/recycapp` et `~/batire` (même chemin) : composant
 * volontairement autonome — liens absolus, couleurs et police fixées, aucun
 * import local — pour que les deux vitrines affichent exactement la même barre,
 * quelle que soit la typographie de l'app.
 */
export const KIOSK_UNIVERSES = [
  {
    id: "recyclerie",
    label: "Univers Recyclerie",
    href: "https://mesrecycleries.groupemes.fr/kiosk",
    logo: "/recyclerie-logo.png",
    // Les messages de la banderole de la boutique Recycapp, moins la
    // réservation : en vitrine, on ne réserve pas.
    marquee: [
      "Déstockage jusqu'à -70% sur une sélection de belles pièces",
      "Bonnes affaires en boutique, quantités limitées",
      "Retrait accompagné par notre équipe",
    ],
    marqueeBg: "#f1104f",
  },
  {
    id: "batiment",
    label: "Univers Bâtiment",
    href: "https://batire.groupemes.fr/kiosk",
    logo: "/batire-logo.jpg",
    marquee: [
      "Matériaux du bâtiment de réemploi à petit prix",
      "Nouveaux arrivages réguliers, quantités limitées",
      "Retrait accompagné par notre équipe",
    ],
    // Bleu du logo BâtiRe (`brand-700`).
    marqueeBg: "#1e718a",
  },
] as const;

export type KioskUniverse = (typeof KIOSK_UNIVERSES)[number]["id"];

export function KioskUniverseNav({ current }: { current: KioskUniverse }) {
  const { marquee, marqueeBg } = KIOSK_UNIVERSES.find((universe) => universe.id === current)!;
  return (
    <header
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white"
      style={{ fontFamily: '"Inter Variable", ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Banderole défilante. L'animation vit ici, pas dans le CSS de l'app :
          BâtiRe n'a pas l'animation `marquee` de Recycapp. */}
      <style>{`@keyframes kiosk-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div className="overflow-hidden border-b border-white/10" style={{ backgroundColor: marqueeBg }}>
        <div className="flex min-h-10 items-center">
          <div
            className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-white"
            style={{ animation: "kiosk-marquee 48s linear infinite" }}
          >
            {/* Quatre passages : sur l'écran large du dépôt, deux ne couvrent
                pas toute la largeur et la boucle laisserait un vide. */}
            {[...marquee, ...marquee, ...marquee, ...marquee].map((item, index) => (
              <span key={`${item}-${index}`} className="mx-8 inline-block">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
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
