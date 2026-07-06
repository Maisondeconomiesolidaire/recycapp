import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  PackageOpen,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { formatPrice } from "../../lib/format";
import { useCart } from "../../lib/useCart";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete";
import { useProfileAutofill } from "../../components/public/useProfileAutofill";
import { CustomerSummary } from "../../components/public/CustomerSummary";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthPanel } from "../../components/AuthPanel";

const BRAND = "#f1104f";

const schema = z.object({
  customer: z.object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(6, "Téléphone requis"),
    address: z.string().min(1, "Adresse requise"),
    postalCode: z.string().min(1, "Code postal requis"),
    city: z.string().min(1, "Ville requise"),
  }),
  comment: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CartPage() {
  const cart = useCart();
  const [submitted, setSubmitted] = useState(false);
  const reserve = useMutation(api.requests.submitArticleCartReservation);
  const updateMyProfile = useMutation(api.users.updateMyProfile);
  const articles = useQuery(api.articles.getManyPublic, {
    ids: cart.ids as Id<"articles">[],
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const [editingCustomer, setEditingCustomer] = useState(false);
  const {
    profileLoaded: customerProfileLoaded,
    customer: profileCustomer,
    profileComplete: customerProfileComplete,
  } = useProfileAutofill({ watch, setValue, enabled: true, withAddress: true });
  // On n'affiche le résumé que si le profil *enregistré* est complet. Un nouvel
  // inscrit (sans téléphone/adresse) voit le formulaire pour tout renseigner ;
  // ses coordonnées sont ensuite sauvegardées sur son compte à la validation.
  const showCustomerSummary = customerProfileComplete && !editingCustomer;

  if (submitted) return <Navigate to="/merci" replace />;

  if (cart.count === 0) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-5 py-24 sm:px-7 lg:px-8">
        <div className="mx-auto max-w-sm rounded-[34px] bg-white/90 p-12 text-center shadow-[0_24px_70px_rgba(24,24,27,0.1)] backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${BRAND}15` }}>
            <ShoppingBag className="h-9 w-9" style={{ color: BRAND }} />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-950">Panier vide</h1>
          <p className="mt-2 text-sm text-zinc-500">Ajoutez des articles pour les réserver en une seule demande.</p>
          <Link
            to="/boutique"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(241,16,79,0.28)] transition hover:-translate-y-0.5"
            style={{ backgroundColor: BRAND }}
          >
            Découvrir les articles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (articles === undefined) return <FullSpinner label="Chargement du panier…" />;

  const availableArticles = articles.filter((a) => a.status === "disponible");
  const unavailableArticles = articles.filter((a) => a.status !== "disponible");
  const total = availableArticles.reduce((sum, a) => sum + a.price, 0);
  const addressValue = String(watch("customer.address") ?? "");

  // Mémorise les coordonnées saisies sur le profil du client connecté.
  async function persistProfile(data: FormData) {
    try {
      await updateMyProfile({
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        phone: data.customer.phone,
        address: data.customer.address,
        postalCode: data.customer.postalCode,
        city: data.customer.city,
      });
    } catch {
      /* profil non connecté ou indisponible — sans gravité */
    }
  }

  async function onSubmit(data: FormData) {
    if (availableArticles.length === 0) return;
    await persistProfile(data);
    await reserve({
      articleIds: availableArticles.map((a) => a._id),
      customer: data.customer,
      comment: data.comment || undefined,
    });
    cart.clear();
    setSubmitted(true);
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 lg:px-8">
      <Link
        to="/boutique"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/82 px-4 py-2.5 text-sm font-medium text-zinc-500 shadow-sm backdrop-blur transition hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Continuer mes achats
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_440px] lg:items-start">
        {/* ── Cart items ── */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              Votre sélection
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950">
              Panier ({availableArticles.length} article{availableArticles.length > 1 ? "s" : ""})
            </h1>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {availableArticles.map((article) => (
              <div
                key={article._id}
                className="group flex items-center gap-4 rounded-[22px] border border-black/4 bg-white p-3.5 shadow-sm transition hover:shadow-md"
              >
                <Link
                  to={`/boutique/${article._id}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]"
                >
                  {article.imageUrls[0] ? (
                    <img
                      src={article.imageUrls[0]}
                      alt={article.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PackageOpen className="h-6 w-6 text-zinc-300" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold leading-snug text-zinc-950">{article.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">{article.category} · {article.condition}</p>
                  <p className="mt-2 text-lg font-extrabold" style={{ color: BRAND }}>
                    {formatPrice(article.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cart.remove(article._id)}
                  className="shrink-0 rounded-full p-2 text-zinc-300 transition hover:bg-red-50 hover:text-red-400"
                  title="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {unavailableArticles.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {unavailableArticles.length} article{unavailableArticles.length > 1 ? "s" : ""} du panier {unavailableArticles.length > 1 ? "ne sont" : "n'est"} plus disponible{unavailableArticles.length > 1 ? "s" : ""} et {unavailableArticles.length > 1 ? "seront exclus" : "sera exclu"} de la réservation.
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-[22px] px-6 py-5 text-white shadow-[0_12px_40px_rgba(241,16,79,0.28)]" style={{ backgroundColor: BRAND }}>
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-[0.15em]">Total</p>
            </div>
            <span className="text-3xl font-extrabold">{formatPrice(total)}</span>
          </div>
        </div>

        {/* ── Reservation form ── */}
        <div className="rounded-[28px] bg-white p-7 shadow-[0_24px_70px_rgba(24,24,27,0.1)]">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: BRAND }}
            >
              1
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-950">Finaliser la réservation</h2>
              <p className="text-xs text-zinc-400">Vos articles seront mis de côté 48h</p>
            </div>
          </div>

          <SignedOut>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center">
              <p className="text-base font-bold text-zinc-900">Créez un compte pour réserver</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-500">
                Un compte est nécessaire pour réserver : il vous permet de suivre l'avancement de
                votre demande et d'échanger avec notre équipe.
              </p>
              <div className="mx-auto mt-4 max-w-sm text-left">
                <AuthPanel redirectUrl="/boutique/panier" />
              </div>
            </div>
          </SignedOut>

          <SignedIn>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!customerProfileLoaded ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-400">
                Chargement de vos coordonnées…
              </div>
            ) : showCustomerSummary ? (
              <CustomerSummary
                customer={profileCustomer}
                withAddress
                onEdit={() => setEditingCustomer(true)}
              />
            ) : (
              <>
                {/* Name row */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prénom" required error={errors.customer?.firstName?.message}>
                    <Input {...register("customer.firstName")} placeholder="Marie" />
                  </Field>
                  <Field label="Nom" required error={errors.customer?.lastName?.message}>
                    <Input {...register("customer.lastName")} placeholder="Dupont" />
                  </Field>
                </div>

                {/* Contact row */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" required error={errors.customer?.email?.message}>
                    <Input type="email" {...register("customer.email")} placeholder="marie@email.fr" />
                  </Field>
                  <Field label="Téléphone" required error={errors.customer?.phone?.message}>
                    <PhoneInput {...register("customer.phone")} placeholder="06 12 34 56 78" />
                  </Field>
                </div>

                {/* Address */}
                <Field label="Adresse" required error={errors.customer?.address?.message} htmlFor="cart-address">
                  <AddressAutocomplete
                    id="cart-address"
                    value={addressValue}
                    onValueChange={(v) => setValue("customer.address", v, { shouldValidate: true })}
                    onSelect={(addr) => {
                      setValue("customer.address", addr.address, { shouldValidate: true });
                      setValue("customer.postalCode", addr.postalCode, { shouldValidate: true });
                      setValue("customer.city", addr.city, { shouldValidate: true });
                    }}
                    placeholder="12 rue des Lilas"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Code postal" required error={errors.customer?.postalCode?.message}>
                    <Input {...register("customer.postalCode")} placeholder="75011" />
                  </Field>
                  <Field label="Ville" required error={errors.customer?.city?.message}>
                    <Input {...register("customer.city")} placeholder="Paris" />
                  </Field>
                </div>
              </>
            )}

            <Field label="Message (facultatif)">
              <Textarea {...register("comment")} placeholder="Une précision sur votre réservation ?" />
            </Field>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-50 p-3">
              {[
                { icon: Lock, text: "Données sécurisées" },
                { icon: ShoppingBag, text: "Retrait en boutique" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting || availableArticles.length === 0 || !customerProfileLoaded}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                style={{ backgroundColor: BRAND }}
              >
                {isSubmitting ? "Envoi en cours…" : "Réserver mes articles"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
          </SignedIn>
        </div>
      </div>
    </div>
  );
}
