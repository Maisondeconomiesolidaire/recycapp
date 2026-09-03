import { AuthSwitch } from "./ui/auth-switch";

/** Écran d’authentification personnalisé, connecté aux flux Clerk partagés. */
export function AuthPanel({ redirectUrl: _redirectUrl }: { redirectUrl?: string } = {}) {
  return <AuthSwitch appName="Recycapp" logoSrc="/recyclerie-logo.png" homeHref="/" homeLabel="Retour à la boutique" />;
}

export function AuthPanelInner({ redirectUrl: _redirectUrl, showLogo: _showLogo, theme: _theme }: { redirectUrl?: string; showLogo?: boolean; theme?: "light" | "dark" }) {
  return <AuthSwitch appName="Recycapp" logoSrc="/recyclerie-logo.png" homeHref="/" homeLabel="Retour à la boutique" />;
}
