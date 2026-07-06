import { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

type AuthMode = "choice" | "sign-in" | "sign-up";
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#ff7700",
    colorText: "#18181b",
    colorTextSecondary: "#71717a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#18181b",
    borderRadius: "14px",
  },
  elements: {
    card: "shadow-[0_24px_70px_rgba(24,24,27,0.12)] border border-orange-100",
    headerTitle: "text-zinc-950",
    headerSubtitle: "text-zinc-500",
    formButtonPrimary:
      "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_10px_26px_rgba(255,119,0,0.28)]",
    footerActionLink: "text-orange-600 hover:text-orange-700",
    identityPreviewEditButton: "text-orange-600 hover:text-orange-700",
    formFieldInput: "focus:border-orange-500 focus:ring-orange-500/25",
  },
};

/**
 * Choix d'authentification puis formulaire Clerk local.
 *
 * On garde `<SignIn>` et `<SignUp>` locaux pour éviter le portail hébergé Clerk,
 * mais on n'affiche Clerk qu'après le choix explicite de l'utilisateur.
 */
export function AuthPanel({ redirectUrl }: { redirectUrl?: string }) {
  const targetUrl = redirectUrl ?? `${window.location.pathname}${window.location.search}`;
  const signInUrl = `${window.location.pathname}${window.location.search}#/sign-in`;
  const signUpUrl = `${window.location.pathname}${window.location.search}#/sign-up`;
  const [mode, setMode] = useState<AuthMode>(() => {
    if (window.location.hash.startsWith("#/sign-up")) return "sign-up";
    if (window.location.hash.startsWith("#/sign-in")) return "sign-in";
    return "choice";
  });

  useEffect(() => {
    // Bascule uniquement sur les liens explicites #/sign-up et #/sign-in. Les
    // autres hashs (#/verify-email-address, #/factor-one…) sont des étapes
    // internes de Clerk et ne doivent pas changer de formulaire.
    const sync = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/sign-up")) setMode("sign-up");
      else if (hash.startsWith("#/sign-in")) setMode("sign-in");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function choose(next: Exclude<AuthMode, "choice">) {
    setMode(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#/${next}`,
    );
  }

  if (mode === "choice") {
    return (
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => choose("sign-in")}
          className="rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800"
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
    );
  }

  return mode === "sign-up" ? (
    <SignUp
      routing="hash"
      fallbackRedirectUrl={targetUrl}
      forceRedirectUrl={targetUrl}
      signInUrl={signInUrl}
      appearance={CLERK_APPEARANCE}
    />
  ) : (
    <SignIn
      routing="hash"
      fallbackRedirectUrl={targetUrl}
      forceRedirectUrl={targetUrl}
      signUpUrl={signUpUrl}
      appearance={CLERK_APPEARANCE}
      withSignUp
    />
  );
}
