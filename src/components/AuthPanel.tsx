import { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

/**
 * Panneau d'authentification local et aux couleurs de l'app (logo + brand).
 *
 * On monte `<SignIn>` / `<SignUp>` en `routing="virtual"` (Clerk gère ses étapes
 * en interne, sans toucher à l'URL) et on bascule entre les deux via un simple
 * hash `#sign-in` / `#sign-up`. Comme le lien de bascule pointe vers un hash où
 * l'autre composant EST monté, Clerk ne retombe jamais sur son portail hébergé
 * (page anglaise aux couleurs par défaut).
 */

const BRAND = "#ff7700";
const LOGO = "/recyclerie-logo.png";

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: BRAND,
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#18181b",
    borderRadius: "14px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "shadow-none border-0 bg-transparent px-0 py-2",
    headerTitle: "text-zinc-950",
    headerSubtitle: "text-zinc-500",
    footerActionLink: "text-orange-600 hover:text-orange-700 font-semibold",
    formFieldInput: "focus:border-orange-500 focus:ring-orange-500/25",
  },
} as const;

type AuthMode = "choice" | "sign-in" | "sign-up";

function readMode(): AuthMode {
  const hash = window.location.hash;
  if (hash === "#sign-up" || hash.startsWith("#/sign-up")) return "sign-up";
  if (hash === "#sign-in" || hash.startsWith("#/sign-in")) return "sign-in";
  return "choice";
}

export function AuthPanel({ redirectUrl }: { redirectUrl?: string }) {
  const targetUrl = redirectUrl ?? `${window.location.pathname}${window.location.search}`;
  const signInUrl = `${window.location.pathname}${window.location.search}#sign-in`;
  const signUpUrl = `${window.location.pathname}${window.location.search}#sign-up`;
  const [mode, setMode] = useState<AuthMode>(readMode);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash === "#sign-up" || hash.startsWith("#/sign-up")) setMode("sign-up");
      else if (hash === "#sign-in" || hash.startsWith("#/sign-in")) setMode("sign-in");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function choose(next: Exclude<AuthMode, "choice">) {
    setMode(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${next}`,
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <img src={LOGO} alt="" className="mb-5 h-14 w-auto object-contain" />
      {mode === "choice" ? (
        <div className="grid w-full gap-3">
          <button
            type="button"
            onClick={() => choose("sign-in")}
            className="rounded-2xl px-5 py-4 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            style={{ backgroundColor: BRAND }}
          >
            J'ai déjà un compte, me connecter
          </button>
          <button
            type="button"
            onClick={() => choose("sign-up")}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base font-bold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-orange-50"
          >
            Je m'inscris
          </button>
        </div>
      ) : mode === "sign-up" ? (
        <SignUp
          routing="virtual"
          fallbackRedirectUrl={targetUrl}
          forceRedirectUrl={targetUrl}
          signInUrl={signInUrl}
          appearance={CLERK_APPEARANCE}
        />
      ) : (
        <SignIn
          routing="virtual"
          fallbackRedirectUrl={targetUrl}
          forceRedirectUrl={targetUrl}
          signUpUrl={signUpUrl}
          appearance={CLERK_APPEARANCE}
        />
      )}
    </div>
  );
}
