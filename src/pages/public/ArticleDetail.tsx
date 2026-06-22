import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  PackageOpen,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatPrice } from "../../lib/format";
import { FullSpinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Field, Textarea } from "../../components/ui/Field";
import { EmptyState } from "../../components/ui/EmptyState";
import { CustomerFields } from "../../components/public/CustomerFields";
import { useCart } from "../../lib/useCart";

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

export function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const article = useQuery(api.articles.getPublic, {
    id: id as Id<"articles">,
  });
  const cart = useCart();
  const reserve = useMutation(api.requests.submitArticleReservation);
  const heartbeatView = useMutation(api.articles.heartbeatView);
  const leaveView = useMutation(api.articles.leaveView);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedBundledId, setSelectedBundledId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!submitted) return;
    const end = Date.now() + 3000;
    const colors = ["#ff7700", "#ffb347", "#fff", "#ffd700", "#ff9a3d"];
    function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    }
    frame();
  }, [submitted]);

  useEffect(() => {
    if (!id) return;

    const storageKey = "recycapp_article_view_session";
    let sessionId = window.sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, sessionId);
    }

    const articleId = id as Id<"articles">;
    const pulse = () =>
      heartbeatView({
        articleId,
        sessionId,
      }).catch(() => null);

    void pulse();
    const interval = window.setInterval(() => {
      void pulse();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
      void leaveView({ articleId, sessionId }).catch(() => null);
    };
  }, [heartbeatView, id, leaveView]);

  if (article === undefined) return <FullSpinner label="Chargement…" />;
  if (article === null) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-5 py-16 sm:px-7 lg:px-8">
        <EmptyState
          icon={<PackageOpen className="h-10 w-10" />}
          title="Article introuvable"
          action={
            <Link to="/boutique" className="font-medium text-brand-600">
              Retour à la boutique
            </Link>
          }
        />
      </div>
    );
  }

  const currentArticle = article as NonNullable<typeof article> & {
    bundledArticles?: Array<{
      _id: string;
      title: string;
      price: number;
      condition: string;
      imageUrls: string[];
      category: string;
      subcategory?: string;
    }>;
    similarArticles?: Array<{
      _id: string;
      title: string;
      price: number;
      condition: string;
      imageUrls: string[];
      category: string;
      subcategory?: string;
    }>;
  };
  const available = currentArticle.status === "disponible";
  const bundledArticles = currentArticle.bundledArticles ?? [];
  const similarArticles = currentArticle.similarArticles ?? [];
  const selectedBundledArticle =
    bundledArticles.find((item) => item._id === selectedBundledId) ?? null;
  const displayImage =
    selectedBundledArticle?.imageUrls[0] ?? currentArticle.imageUrls[activeImage];
  const inCart = cart.has(currentArticle._id);

  async function onSubmit(data: FormData) {
    await reserve({
      articleId: currentArticle._id,
      customer: data.customer,
      comment: data.comment || undefined,
    });
    setSubmitted(true);
  }

  return (
    <div className="bg-[#f6f4ef]">
      <div className="mx-auto w-full max-w-[92rem] px-5 py-8 sm:px-7 sm:py-10 lg:px-8">
        <Link
          to="/boutique"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la boutique
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <section>
            <div className="relative overflow-hidden rounded-[24px] bg-[#f2eee7]">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={selectedBundledArticle?.title ?? currentArticle.title}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-zinc-300">
                  <PackageOpen className="h-16 w-16" />
                </div>
              )}
            </div>

            {currentArticle.imageUrls.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {currentArticle.imageUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setSelectedBundledId(null);
                      setActiveImage(index);
                    }}
                    className={`overflow-hidden rounded-2xl border-2 bg-white transition ${
                      index === activeImage
                        ? "border-brand-500 shadow-[0_10px_28px_rgba(255,119,0,0.18)]"
                        : "border-transparent"
                    }`}
                  >
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {currentArticle.isLot ? "Lot" : currentArticle.category}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {currentArticle.condition}
                </span>
                {!available && (
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    Réservé
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                {currentArticle.title}
              </h1>
              {currentArticle.isLot && bundledArticles.length > 0 && (
                <p className="mt-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
                  Lot de {bundledArticles.length} articles
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {currentArticle.originalPrice && currentArticle.originalPrice > currentArticle.price ? (
                  <>
                    <span className="rounded-2xl bg-brand-500 px-4 py-3 text-3xl font-extrabold leading-none text-white shadow-[0_16px_34px_rgba(255,119,0,0.24)] sm:text-4xl">
                      {formatPrice(currentArticle.price)}
                    </span>
                    <span className="text-xl font-semibold text-zinc-400 line-through sm:text-2xl">
                      {formatPrice(currentArticle.originalPrice)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Bonne affaire
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-zinc-950 sm:text-4xl">
                    {formatPrice(currentArticle.price)}
                  </span>
                )}
              </div>

              {available && (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    className="rounded-2xl bg-zinc-950 hover:bg-zinc-900"
                    onClick={() => cart.add(currentArticle._id)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {inCart ? "Déjà dans le panier" : "Ajouter au panier"}
                  </Button>
                  {cart.count > 0 && (
                    <Link
                      to="/boutique/panier"
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 text-base font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                    >
                      Voir le panier ({cart.count})
                    </Link>
                  )}
                </div>
              )}

              <p className="mt-6 whitespace-pre-line text-base leading-8 text-zinc-600">
                {currentArticle.description}
              </p>

              {currentArticle.isLot && bundledArticles.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                    Articles inclus dans le lot
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Cliquez sur un article pour le visualiser dans la photo principale.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {bundledArticles.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedBundledId(item._id)}
                        className={`flex items-center gap-3 rounded-2xl border bg-white/80 p-2.5 text-left shadow-sm transition hover:border-brand-300 hover:bg-white ${
                          selectedBundledId === item._id
                            ? "border-brand-500 ring-2 ring-brand-500/15"
                            : "border-black/5"
                        }`}
                      >
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f2eee7]">
                          {item.imageUrls[0] ? (
                            <img
                              src={item.imageUrls[0]}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-zinc-300">
                              <PackageOpen className="h-5 w-5" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-sm font-semibold text-zinc-950">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {item.condition} · {formatPrice(item.price)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="p-1">
                  <ShieldCheck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Sélection contrôlée</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Objet choisi et préparé par l’équipe.</p>
                </div>
                <div className="p-1">
                  <Truck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Retrait accompagné</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Nous vous recontactons pour organiser le retrait.</p>
                </div>
                <div className="p-1">
                  <BadgeCheck className="h-5 w-5 text-brand-500" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900">Réservation simple</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">Laissez vos coordonnées, nous faisons le reste.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-[0_22px_60px_rgba(24,24,27,0.08)]">
              {submitted ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 shadow-[0_10px_28px_rgba(255,119,0,0.28)]">
                      <Check className="h-5 w-5 text-white" strokeWidth={3} />
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                      Votre demande a bien été envoyée !
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm leading-7 text-zinc-700">
                    <p>
                      Votre article est désormais mis de côté pendant{" "}
                      <strong className="text-zinc-900">48 heures</strong>.
                    </p>
                    <p className="mt-3">
                      En cas d’indisponibilité, merci de nous en informer à l’adresse email
                      suivante :{" "}
                      <a
                        href="mailto:accueil.recyclerie@eco-solidaire.fr"
                        className="font-semibold text-brand-600 underline underline-offset-2"
                      >
                        accueil.recyclerie@eco-solidaire.fr
                      </a>{" "}
                      en communiquant la référence de l’article qui vous a été envoyé par email.
                    </p>
                    <p className="mt-3 text-zinc-500">
                      Pensez à consulter vos spams en cas d’email non reçu.
                    </p>
                  </div>
                  <Link
                    to="/boutique"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à la boutique
                  </Link>
                </div>
              ) : available ? (
                <>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
                    Réserver cet article
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Laissez vos coordonnées pour bloquer l’article et être recontacté rapidement.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
                    <CustomerFields
                      register={register}
                      errors={errors}
                      withAddress
                      watch={watch}
                      setValue={setValue}
                    />
                    <Field label="Message (facultatif)">
                      <Textarea
                        {...register("comment")}
                        placeholder="Une question sur l’article ?"
                      />
                    </Field>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-2xl"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Envoi…" : "Réserver maintenant"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex items-center gap-3 text-zinc-600">
                  <Check className="h-5 w-5 text-amber-500" />
                  <p className="font-medium">
                    Cet article est actuellement réservé par un autre client.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {similarArticles.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Sélection liée
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
                  Articles similaires
                </h2>
              </div>
              <Link
                to="/boutique"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Voir la boutique
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {similarArticles.map((item) => (
                <Link
                  key={item._id}
                  to={`/boutique/${item._id}`}
                  className="group overflow-hidden rounded-[24px] bg-white shadow-[0_14px_34px_rgba(24,24,27,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(24,24,27,0.14)]"
                >
                  <div className="aspect-square bg-[#f2eee7]">
                    {item.imageUrls[0] ? (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-300">
                        <PackageOpen className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {item.condition}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-brand-600">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
