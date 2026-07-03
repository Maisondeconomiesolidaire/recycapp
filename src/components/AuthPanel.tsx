import { useEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/clerk-react";

/**
 * Formulaire d'authentification monté en pleine page (connexion + inscription).
 *
 * On monte À LA FOIS `<SignIn>` et `<SignUp>` (un seul visible à la fois) et on
 * bascule selon le hash. Sans `<SignUp>` local, le lien « m'inscrire » de
 * `<SignIn>` retombait sur le Portail hébergé de Clerk — d'où la page en
 * anglais, aux couleurs par défaut. Routing « hash » (et non « virtual ») pour
 * que les étapes internes (email → code → 2FA) soient gérées via l'URL.
 *
 * L'apparence (couleur de marque, français) est héritée du `<ClerkProvider>`,
 * pour rester identique au reste des portails de connexion de l'app.
 */
export function AuthPanel() {
  const [isSignUp, setIsSignUp] = useState(() =>
    window.location.hash.startsWith("#/sign-up"),
  );

  useEffect(() => {
    // Bascule uniquement sur les liens explicites #/sign-up et #/sign-in. Les
    // autres hashs (#/verify-email-address, #/factor-one…) sont des étapes
    // internes de Clerk et ne doivent pas changer de formulaire.
    const sync = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/sign-up")) setIsSignUp(true);
      else if (hash.startsWith("#/sign-in")) setIsSignUp(false);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return isSignUp ? (
    <SignUp routing="hash" fallbackRedirectUrl="/" signInUrl="#/sign-in" />
  ) : (
    <SignIn routing="hash" fallbackRedirectUrl="/" signUpUrl="#/sign-up" />
  );
}
