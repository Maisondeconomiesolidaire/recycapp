import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthPanel } from "../../components/AuthPanel";

/**
 * Page dédiée de connexion / inscription : montée HORS de `PublicLayout`, donc
 * sans en-tête ni bandeau boutique. Le portail est un écran plein — l'afficher
 * dans le shell le comprimait dans une colonne et doublait son titre.
 */
export function AuthPage({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  const location = useLocation();
  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect_url") || "/boutique";
  }, [location.search]);

  return (
    <>
      <SignedIn>
        <Navigate to={redirectUrl} replace />
      </SignedIn>
      <SignedOut>
        <AuthPanel initialMode={initialMode} redirectUrl={redirectUrl} />
      </SignedOut>
    </>
  );
}
