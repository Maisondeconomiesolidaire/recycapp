const MESOUTILS_URL =
  (import.meta.env.VITE_MESOUTILS_URL ?? "https://eco-solidaire.fr").replace(/\/$/, "");

function currentUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function needsCentralAuthRedirect() {
  const host = window.location.hostname;
  return !(
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".eco-solidaire.fr") ||
    host === "eco-solidaire.fr"
  );
}

export function centralAuthUrl(mode: "sign-in" | "sign-up", redirectUrl?: string) {
  const url = new URL(`${MESOUTILS_URL}/${mode}`);
  url.searchParams.set("redirect_url", redirectUrl ?? currentUrl());
  return url.toString();
}

export function redirectToCentralAuth(mode: "sign-in" | "sign-up", redirectUrl?: string) {
  window.location.assign(centralAuthUrl(mode, redirectUrl));
}
