import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { SignedIn, useUser } from "@clerk/clerk-react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { ArrowRight, Heart, Menu, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_CATEGORY_SLUGS,
} from "../../lib/constants";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { Input } from "../ui/Field";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { PhoneInput } from "../ui/PhoneInput";
import { AddressAutocomplete } from "../ui/AddressAutocomplete";
import { formatPrice } from "../../lib/format";
import { useCart } from "../../lib/useCart";
import { AccountMenu } from "./AccountMenu";
import { PageSwitcher } from "./PageSwitcher";

const PUBLIC_CONTAINER = "mx-auto w-full max-w-[92rem] px-5 sm:px-7 lg:px-8";
const BRAND = "#f1104f";
const BRAND_DARK = "#c90d40";

const MARQUEE_ITEMS = [
  "Déstockage jusqu'à -70% sur une sélection de belles pièces",
  "Bonnes affaires en boutique, quantités limitées",
  "Réservation simple et retrait accompagné par notre équipe",
];

export function PublicLayout() {
  const [params] = useSearchParams();
  const location = useLocation();
  const embed = params.get("embed") === "1";

  // À chaque changement de page (ou de catégorie / recherche), on ramène
  // l'utilisateur en haut : la page « remonte » au lieu de rester bloquée en
  // bas après une navigation.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Sur tactile (mobile), le défilement « smooth » est souvent annulé par
    // l'élan tactile résiduel après un tap → la page ne remonte pas. On force
    // donc un saut instantané, fiable, et on garde le fluide au pointeur fin.
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const behavior = prefersReducedMotion || coarsePointer ? "auto" : "smooth";
    // rAF : on scrolle après le montage/peinture de la nouvelle page, sinon
    // certains navigateurs mobiles restaurent l'ancienne position juste après.
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior });
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname, location.search]);

  const isBoutiqueListing =
    location.pathname === "/boutique" ||
    location.pathname.startsWith("/boutique/categorie/");
  const isBoutiqueDetail = /^\/boutique\/[^/]+$/.test(location.pathname);
  const showBoutiqueVideoBackground = isBoutiqueListing || isBoutiqueDetail;

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col text-zinc-900",
        showBoutiqueVideoBackground ? "bg-transparent" : "bg-[#f6f4ef]",
      )}
    >
      {!embed && showBoutiqueVideoBackground && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <video autoPlay muted loop playsInline className="h-full w-full object-cover">
            <source src="/Beautiful%20Wallpaper%20Video.mp4" type="video/mp4" />
          </video>
          {isBoutiqueDetail && (
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,244,239,0.48)_0%,rgba(246,244,239,0.64)_16%,rgba(246,244,239,0.78)_34%,rgba(246,244,239,0.88)_100%)]" />
          )}
        </div>
      )}
      {!embed && <Header />}
      <main className="relative z-10 flex-1">
        {/* `key` = pathname : le contenu se remonte et « balaie » à chaque page. */}
        <div key={location.pathname} className="animate-page-sweep">
          <Outlet />
        </div>
      </main>
      <SignedIn>
        <PublicProfileOnboarding />
      </SignedIn>
      {!embed && <Footer />}
    </div>
  );
}

function PublicProfileOnboarding() {
  const { user, isLoaded } = useUser();
  const profile = useQuery(api.users.getMyProfile, {});
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
  });

  const profileLoaded = profile !== undefined;
  const needsOnboarding =
    isLoaded &&
    user &&
    profileLoaded &&
    !(
      (profile?.firstName || user.firstName)?.trim() &&
      (profile?.lastName || user.lastName)?.trim() &&
      profile?.phone?.trim() &&
      profile?.address?.trim() &&
      profile?.postalCode?.trim() &&
      profile?.city?.trim()
    );

  useEffect(() => {
    if (!isLoaded || !user || !profileLoaded) return;
    setForm((current) => ({
      firstName: current.firstName || profile?.firstName || user.firstName || "",
      lastName: current.lastName || profile?.lastName || user.lastName || "",
      phone: current.phone || profile?.phone || "",
      address: current.address || profile?.address || "",
      postalCode: current.postalCode || profile?.postalCode || "",
      city: current.city || profile?.city || "",
    }));
  }, [isLoaded, profileLoaded, profile, user]);

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      city: form.city.trim(),
    };
    if (!next.firstName || !next.lastName || !next.phone || !next.address || !next.postalCode || !next.city) {
      setError("Merci de compléter tous les champs pour continuer.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (
        user &&
        (next.firstName !== (user.firstName ?? "") || next.lastName !== (user.lastName ?? ""))
      ) {
        await user.update({ firstName: next.firstName, lastName: next.lastName });
      }
      await updateProfile(next);
      await user?.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer vos informations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(needsOnboarding)}
      onClose={() => undefined}
      hideClose
      title="Finaliser mon inscription"
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm leading-6 text-zinc-600">
          Ajoutez votre prénom, nom, téléphone et adresse pour continuer.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} placeholder="Marie" />
          </Field>
          <Field label="Nom" required>
            <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} placeholder="Dupont" />
          </Field>
          <Field label="Téléphone" required>
            <PhoneInput value={form.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="06 12 34 56 78" />
          </Field>
          <Field label="Adresse" required>
            <AddressAutocomplete
              value={form.address}
              onValueChange={(value) => setField("address", value)}
              onSelect={(address) => {
                setForm((current) => ({
                  ...current,
                  address: address.address,
                  postalCode: address.postalCode,
                  city: address.city,
                }));
              }}
              placeholder="12 rue des Lilas"
            />
          </Field>
          <Field label="Code postal" required>
            <Input value={form.postalCode} onChange={(event) => setField("postalCode", event.target.value)} placeholder="60000" />
          </Field>
          <Field label="Ville" required>
            <Input value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="Beauvais" />
          </Field>
        </div>
        {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full rounded-2xl bg-orange-500 text-white hover:bg-orange-600" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer et continuer"}
        </Button>
      </form>
    </Modal>
  );
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  // Barre complète (recherche, panier, catégories) : boutique uniquement.
  // Collecte / Aérogommage / Cycle en Bray sont des formulaires → barre minimale.
  const isBoutiqueArea = location.pathname.startsWith("/boutique");
  const isBoutiqueListing =
    location.pathname === "/boutique" ||
    location.pathname.startsWith("/boutique/categorie/");
  const [params, setParams] = useSearchParams();
  const articles = useQuery(api.articles.listPublic, {});
  const cart = useCart();
  const cartArticles = useQuery(
    api.articles.getManyPublic,
    cart.count > 0 ? { ids: cart.ids as Id<"articles">[] } : "skip",
  );
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const cartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setQuery(params.get("q") ?? ""); }, [params]);

  useEffect(() => {
    if (!searchOpen && !cartOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchRef.current?.contains(target) && !cartRef.current?.contains(target)) {
        setSearchOpen(false);
        setCartOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen, cartOpen]);

  // Close mini-cart when navigating to the cart page
  useEffect(() => {
    if (location.pathname === "/boutique/panier") setCartOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const suggestions = useMemo(() => {
    if (!articles) return [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return articles
      .filter((article) =>
        [article.title, article.description, article.category, article.subcategory]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 6);
  }, [articles, query]);

  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-white/84 text-zinc-950 shadow-sm"
        : isBoutiqueListing
          ? "text-zinc-700 hover:bg-white/70 hover:text-zinc-950"
          : "text-zinc-700 hover:bg-white hover:text-zinc-900",
    );

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    const nextParams = new URLSearchParams(params);
    if (nextQuery.trim()) nextParams.set("q", nextQuery);
    else nextParams.delete("q");
    setParams(nextParams, { replace: true });
  }

  const cartTotal = (cartArticles ?? [])
    .filter((a) => a.status === "disponible")
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-black/5 backdrop-blur-xl",
        isBoutiqueListing ? "bg-[#f6f4ef]/58" : "bg-[#f6f4ef]/92",
      )}
    >
      {/* Marquee */}
      <div className="overflow-hidden border-b border-white/10" style={{ backgroundColor: BRAND }}>
        <div className="flex min-h-10 items-center">
          <div className="animate-[marquee_24s_linear_infinite] whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-white">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
              <span key={`${item}-${index}`} className="mx-8 inline-block">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={`${PUBLIC_CONTAINER} py-4`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 sm:hidden">
            <Link to="/boutique" className="shrink-0">
              <img src="/recyclerie-logo.png" alt="Recyclerie" className="h-12 w-auto object-contain" />
            </Link>
            <div className="flex items-center gap-2">
              <PageSwitcher />
              <AccountMenu />
              {isBoutiqueArea ? (
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/85 text-zinc-900 shadow-[0_12px_30px_rgba(24,24,27,0.08)] backdrop-blur"
                  aria-label={menuOpen ? "Fermer le menu boutique" : "Ouvrir le menu boutique"}
                >
                  {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              ) : null}
            </div>
          </div>

          <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-5">
            <Link to="/boutique" className="shrink-0">
              <img src="/recyclerie-logo.png" alt="Recyclerie" className="h-14 w-auto object-contain" />
            </Link>

            {isBoutiqueArea ? (
              <div ref={searchRef} className="animate-navbar-sweep relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Rechercher un article"
                  className="h-12 rounded-full border-white/55 bg-white/82 pl-11 text-sm shadow-[0_12px_30px_rgba(24,24,27,0.08)] backdrop-blur sm:h-14 sm:text-base"
                />
                {searchOpen && query.trim() && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-[28px] border border-white/60 bg-white/94 shadow-[0_24px_60px_rgba(24,24,27,0.14)] backdrop-blur-xl">
                    {suggestions.length > 0 ? (
                      <div className="max-h-[420px] overflow-y-auto p-2">
                        {suggestions.map((article) => (
                          <Link
                            key={article._id}
                            to={`/boutique/${article._id}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-4 rounded-[22px] px-3 py-3 transition hover:bg-zinc-50"
                          >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]">
                              {article.imageUrls[0] && (
                                <img src={article.imageUrls[0]} alt={article.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-zinc-950">{article.title}</p>
                              <p className="mt-1 truncate text-xs text-zinc-500">{article.category}</p>
                            </div>
                            <div className="shrink-0 text-sm font-bold text-zinc-950">{formatPrice(article.price)}</div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-sm text-zinc-500">Aucun article ne correspond.</div>
                    )}
                  </div>
                )}
              </div>
            ) : <div className="flex-1" />}

            {isBoutiqueArea && (
              <Link
                to="/favoris"
                aria-label="Mes favoris"
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white text-zinc-700 shadow-sm transition hover:-translate-y-0.5 hover:text-brand-600 sm:h-14 sm:w-14"
              >
                <Heart className="h-5 w-5" />
              </Link>
            )}

            {isBoutiqueArea && (
              <div ref={cartRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCartOpen((v) => !v)}
                  aria-label="Mon panier"
                  className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_14px_34px_rgba(241,16,79,0.28)] transition hover:-translate-y-0.5 sm:h-14 sm:w-14"
                  style={{ backgroundColor: cartOpen ? BRAND_DARK : BRAND }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cart.count > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold ring-2 ring-[#f6f4ef]" style={{ color: BRAND }}>
                      {cart.count}
                    </span>
                  )}
                </button>

                {/* Mini cart panel */}
                {cartOpen && (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(96vw,400px)] overflow-hidden rounded-[28px] border border-black/6 bg-white shadow-[0_32px_80px_rgba(24,24,27,0.2)]">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <ShoppingCart className="h-4 w-4" style={{ color: BRAND }} />
                        <span className="text-sm font-bold text-zinc-950">
                          Mon panier
                        </span>
                        {cart.count > 0 && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
                            {cart.count}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCartOpen(false)}
                        className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {cart.count === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <ShoppingCart className="mx-auto h-8 w-8 text-zinc-200" />
                        <p className="mt-3 text-sm font-medium text-zinc-400">Votre panier est vide</p>
                        <button
                          type="button"
                          onClick={() => setCartOpen(false)}
                          className="mt-4 text-xs font-semibold underline underline-offset-2"
                          style={{ color: BRAND }}
                        >
                          Découvrir les articles
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Items */}
                        <div className="max-h-[340px] overflow-y-auto divide-y divide-zinc-50">
                          {(cartArticles ?? []).map((article) => (
                            <div key={article._id} className="flex items-center gap-3 px-4 py-3">
                              <Link
                                to={`/boutique/${article._id}`}
                                onClick={() => setCartOpen(false)}
                                className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]"
                              >
                                {article.imageUrls[0] && (
                                  <img src={article.imageUrls[0]} alt={article.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-950">
                                  {article.title}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-400">{article.condition}</p>
                                <p className="mt-1 text-sm font-bold" style={{ color: BRAND }}>
                                  {formatPrice(article.price)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cart.remove(article._id)}
                                className="shrink-0 rounded-full p-1.5 text-zinc-300 transition hover:bg-zinc-100 hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-zinc-100 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-500">Total estimé</span>
                            <span className="text-xl font-extrabold text-zinc-950">{formatPrice(cartTotal)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setCartOpen(false); navigate("/boutique/panier"); }}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(241,16,79,0.32)] transition hover:-translate-y-0.5"
                            style={{ backgroundColor: BRAND }}
                          >
                            Réserver mon panier
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCartOpen(false)}
                            className="flex w-full items-center justify-center rounded-2xl py-2.5 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
                          >
                            Continuer mes achats
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <AccountMenu />
            <PageSwitcher />
          </div>

          {isBoutiqueArea && menuOpen && (
            <div className="sm:hidden">
              <div className="rounded-[28px] border border-white/60 bg-white/92 p-4 shadow-[0_24px_60px_rgba(24,24,27,0.14)] backdrop-blur-xl">
                <div ref={searchRef} className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={query}
                    onChange={(event) => updateQuery(event.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Rechercher un article"
                    className="h-12 rounded-full border-white/55 bg-white pl-11 text-sm shadow-[0_12px_30px_rgba(24,24,27,0.08)]"
                  />
                  {searchOpen && query.trim() && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_24px_60px_rgba(24,24,27,0.14)]">
                      {suggestions.length > 0 ? (
                        <div className="max-h-[340px] overflow-y-auto p-2">
                          {suggestions.map((article) => (
                            <Link
                              key={article._id}
                              to={`/boutique/${article._id}`}
                              onClick={() => {
                                setSearchOpen(false);
                                setMenuOpen(false);
                              }}
                              className="flex items-center gap-3 rounded-[20px] px-3 py-3 transition hover:bg-zinc-50"
                            >
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#f2eee7]">
                                {article.imageUrls[0] ? (
                                  <img src={article.imageUrls[0]} alt={article.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-zinc-950">{article.title}</p>
                                <p className="mt-1 truncate text-xs text-zinc-500">{article.category}</p>
                              </div>
                              <div className="shrink-0 text-sm font-bold text-zinc-950">{formatPrice(article.price)}</div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-5 text-sm text-zinc-500">Aucun article ne correspond.</div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/boutique/panier");
                  }}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(241,16,79,0.28)]"
                  style={{ backgroundColor: BRAND }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Panier
                  {cart.count > 0 ? ` (${cart.count})` : ""}
                </button>

                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Catégories
                  </p>
                  <nav className="flex flex-col gap-2">
                    <NavLink
                      to="/boutique"
                      end
                      onClick={() => setMenuOpen(false)}
                      className={link}
                    >
                      Tout
                    </NavLink>
                    {ARTICLE_CATEGORIES.map((category) => (
                      <NavLink
                        key={category}
                        to={`/boutique/categorie/${ARTICLE_CATEGORY_SLUGS[category]}`}
                        onClick={() => setMenuOpen(false)}
                        className={link}
                      >
                        {category}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}

          {isBoutiqueArea && (
            <nav className="animate-navbar-sweep hidden gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex sm:flex-wrap sm:overflow-visible sm:px-0">
              <NavLink to="/boutique" end className={link}>Tout</NavLink>
              {ARTICLE_CATEGORIES.map((category) => (
                <NavLink key={category} to={`/boutique/categorie/${ARTICLE_CATEGORY_SLUGS[category]}`} className={link}>
                  {category}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const location = useLocation();
  const isBoutiqueListing =
    location.pathname === "/boutique" ||
    location.pathname.startsWith("/boutique/categorie/");
  return (
    <footer
      className={cn(
        "relative z-10 border-t border-black/5",
        isBoutiqueListing ? "bg-white/58 backdrop-blur-xl" : "bg-white/80",
      )}
    >
      <div className={`${PUBLIC_CONTAINER} flex flex-col items-center justify-between gap-3 py-8 text-sm text-zinc-500 sm:flex-row`}>
        <p>© {new Date().getFullYear()} Boutique solidaire de seconde main</p>
        <Link to="/crm" className="hover:text-zinc-800">Espace professionnel</Link>
      </div>
    </footer>
  );
}
