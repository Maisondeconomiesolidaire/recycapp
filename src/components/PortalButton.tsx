/**
 * Retour au portail du réemploi.
 *
 * Sur mobile et sur la vitrine du dépôt, le visiteur n'a aucun autre chemin
 * vers les autres boutiques du groupe : ce bouton est ce chemin. Composant
 * volontairement autonome (aucune dépendance locale) pour être copié tel quel
 * dans chaque application.
 */
import { LayoutGrid } from "lucide-react";

export const PORTAL_URL = "https://portailreemploi.groupemes.fr";

export function PortalButton({
  className = "",
  label = "Portail",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={PORTAL_URL}
      className={`inline-flex shrink-0 items-center gap-1.5 font-semibold transition ${className}`}
      title="Toutes les boutiques du groupe"
    >
      <LayoutGrid className="h-4 w-4" />
      {label}
    </a>
  );
}
