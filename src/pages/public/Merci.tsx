import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const messages: Record<string, string> = {
  aerogommage:
    "Votre demande d'aérogommage a bien été reçue. Nous reviendrons vers vous avec un devis.",
  collecte:
    "Votre demande de collecte a bien été enregistrée. Nous vous recontactons pour fixer une date.",
  article:
    "Votre réservation est enregistrée ! Nous vous contactons pour organiser le retrait.",
  article_payment:
    "Votre paiement Stripe test a bien été validé. La commande a été enregistrée côté boutique.",
  velo:
    "Votre demande à l'atelier Cycle en Bray est bien reçue. Nous revenons vers vous rapidement.",
  livraison:
    "Votre demande de livraison a bien été enregistrée. Nous vous recontactons pour organiser l'acheminement.",
};

export function Merci() {
  const [params] = useSearchParams();
  const type = params.get("type") ?? "";
  const message =
    messages[type] ?? "Votre demande a bien été envoyée. Merci !";

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-20 sm:px-7 lg:px-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
          <CheckCircle2 className="h-9 w-9 text-brand-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Merci pour votre demande !
        </h1>
        <p className="mt-3 text-zinc-600">{message}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Retour à l'accueil
          </Link>
          <Link
            to="/boutique"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Voir la boutique
          </Link>
        </div>
      </div>
    </div>
  );
}
