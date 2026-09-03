import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import { AuthPanel } from "../AuthPanel";

/**
 * `title` / `description` restent acceptés pour les appelants existants, mais
 * ne sont plus affichés : le portail partagé porte ses propres titres, et les
 * empiler dans une carte le repliait en version étroite.
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
        <AuthPanel redirectUrl={redirectUrl} />
      </SignedOut>
    </>
  );
}
