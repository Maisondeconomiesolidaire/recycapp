import { AuthSwitch } from "./ui/auth-switch";

/**
 * Écran d'authentification Recycapp, branché sur le portail partagé de
 * l'écosystème (voir `ui/auth-switch`).
 *
 * Le portail occupe TOUTE la page : ne le remets pas dans une carte étroite,
 * il s'y replierait en version mobile au milieu d'un grand écran.
 */
export function AuthPanel({ redirectUrl }: { redirectUrl?: string } = {}) {
  return (
    <AuthSwitch
      appName="Recycapp"
      logoSrc="/recyclerie-logo.png"
      redirectUrl={redirectUrl}
      homeHref="/"
      homeLabel="Retour à la boutique"
    />
  );
}

export function AuthPanelInner({ redirectUrl, showLogo: _showLogo, theme: _theme }: { redirectUrl?: string; showLogo?: boolean; theme?: "light" | "dark" }) {
  return <AuthPanel redirectUrl={redirectUrl} />;
}
