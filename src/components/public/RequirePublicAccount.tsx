import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Réserve un contenu du portail public aux utilisateurs connectés, en les
 * envoyant sur la page dédiée `/connexion` — qui les ramène ici ensuite.
 *
 * `title` / `description` restent acceptés pour les appelants existants mais ne
 * servent plus : le portail porte ses propres titres.
 */
export function RequirePublicAccount({
  children,
  title: _title,
  description: _description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  const location = useLocation();
  const redirectUrl = `${location.pathname}${location.search}`;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to={`/connexion?redirect_url=${encodeURIComponent(redirectUrl)}`} replace />
      </SignedOut>
    </>
  );
}
