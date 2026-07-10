import { createContext, useContext, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  SignedIn,
  SignedOut,
  useUser,
} from "@clerk/clerk-react";
import { AuthPanelInner } from "../AuthPanel";
import { AppSwitcher } from "../AppSwitcher";
import {
  Menu,
  Sun,
  Moon,
  Store,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { api } from "../../../convex/_generated/api";
import { Drawer } from "../ui/Drawer";
import { GlobalScanner } from "./GlobalScanner";
import { CRM_PAGES, canAccess } from "../../lib/crmPermissions";
import type { CrmPageKey } from "../../lib/crmPermissions";
import { PersonaProvider, usePersonaContext } from "../../lib/persona";

export const ThemeContext = createContext(true); // true = dark
export function useThemeContext() { return useContext(ThemeContext); }

type NavItem = (typeof CRM_PAGES)[number];

// Modules temporairement masqués de la navigation (les pages/routes restent
// accessibles et seront réintégrées plus tard).
const HIDDEN_NAV_KEYS: CrmPageKey[] = [
  "tournees",
  "caisse",
  "arrivages",
  "sorties",
  "ateliers",
  "documents",
];

function visibleNav(access: ReturnType<typeof useQuery<typeof api.permissions.myAccess>>) {
  return CRM_PAGES.filter(
    (item) =>
      !HIDDEN_NAV_KEYS.includes(item.key) &&
      (item.adminOnly ? access?.isAdmin : canAccess(access, item.key)),
  );
}

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem("crm-theme");
    return stored !== null ? stored === "dark" : true;
  });

  useEffect(() => {
    const cls = isDark ? "dark" : "crm-light";
    document.body.classList.remove("dark", "crm-light");
    document.body.classList.add(cls);
    return () => document.body.classList.remove("dark", "crm-light");
  }, [isDark]);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("crm-theme", next ? "dark" : "light");
      return next;
    });
  }

  return { isDark, toggle };
}

export function CrmLayout() {
  const { isDark, toggle } = useTheme();

  return (
    <ThemeContext.Provider value={isDark}>
    <div className={isDark ? "dark" : "crm-light"}>
      <SignedIn>
        <PersonaProvider>
          <div className="min-h-screen bg-[var(--crm-bg)] text-zinc-100 flex transition-colors duration-200">
            <Sidebar isDark={isDark} onToggleTheme={toggle} />
            <div className="flex-1 min-w-0 lg:pl-64">
              <MobileTopBar onToggleTheme={toggle} />
              <Outlet />
            </div>
          </div>
          <GlobalScanner />
        </PersonaProvider>
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </div>
    </ThemeContext.Provider>
  );
}

function MobileTopBar({ onToggleTheme }: { onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const location = useLocation();
  const counts = useQuery(api.requests.counts);
  const unreadNotifications = useQuery(api.notifications.unreadCount);
  const unreadMessages = useQuery(api.messages.staffUnreadCount);
  const access = useQuery(api.permissions.myAccess);
  const onNotificationsPage = location.pathname === "/crm/notifications";
  const isDark = useThemeContext();
  const nav = visibleNav(access);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--crm-border)] bg-[color:color-mix(in_srgb,var(--crm-bg)_92%,transparent)] px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-zinc-300 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <img
          src="/recyclerie-logo.png"
          alt="Recyclerie"
          className="h-9 w-auto object-contain"
        />

        <Link
          to="/crm/compte"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:ring-2 hover:ring-brand-500/45"
          aria-label="Ouvrir mon compte"
        >
          <CrmUserAvatar user={user} />
          {!onNotificationsPage && (unreadNotifications ?? 0) > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-[var(--crm-bg)]">
              {unreadNotifications}
            </span>
          ) : null}
        </Link>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        variant="left"
        title="Navigation"
        bodyClassName="p-3"
      >
        <nav className="space-y-2">
          <FlatNav
            nav={nav}
            counts={counts}
            unreadNotifications={unreadNotifications}
            unreadMessages={unreadMessages}
            onNavigate={() => setOpen(false)}
            itemClassName="py-3"
          />
          <div className="border-t border-[var(--crm-border)] pt-1 mt-1">
            <Link
              to="/boutique"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
            >
              <Store className="h-5 w-5" />
              <span>Retour à la boutique</span>
            </Link>
            <button
              type="button"
              onClick={() => { onToggleTheme(); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span>{isDark ? "Mode clair" : "Mode sombre"}</span>
            </button>
          </div>
        </nav>
      </Drawer>
    </>
  );
}

function CrmUserAvatar({ user }: { user: ReturnType<typeof useUser>["user"] }) {
  const label = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Moi";

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-xs font-semibold text-white">
      {user?.imageUrl ? (
        <img src={user.imageUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        label.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

function Sidebar({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  const { user } = useUser();
  const counts = useQuery(api.requests.counts);
  const unreadNotifications = useQuery(api.notifications.unreadCount);
  const unreadMessages = useQuery(api.messages.staffUnreadCount);
  const access = useQuery(api.permissions.myAccess);
  const nav = visibleNav(access);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--crm-border)] bg-[var(--crm-surface)] lg:flex">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-[var(--crm-border)] px-5">
        <img
          src="/recyclerie-logo.png"
          alt="Recyclerie"
          className="h-11 w-auto object-contain"
        />
        <AppSwitcher current="recycapp" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <FlatNav
          nav={nav}
          counts={counts}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
      </nav>

      <div className="border-t border-[var(--crm-border)] p-3 space-y-2">
        <PersonaBar />
        <Link
          to="/boutique"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
        >
          <Store className="h-4 w-4 shrink-0" />
          <span className="truncate">Retour à la boutique</span>
        </Link>

        <Link to="/crm/compte" className="flex items-center gap-3 rounded-lg bg-[var(--crm-surface-2)] px-3 py-2 transition-colors hover:bg-[var(--crm-surface-3)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500 text-xs font-semibold text-white">
            {user?.imageUrl ? <img src={user.imageUrl} alt="" className="h-full w-full object-cover" /> : (user?.fullName ?? "Moi").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
        >
          {isDark ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          <span>{isDark ? "Basculer en mode clair" : "Basculer en mode sombre"}</span>
        </button>
      </div>
    </aside>
  );
}

/** Persona actif du compte partagé « accueil » + bouton pour en changer. */
function PersonaBar() {
  const { persona, requiresPersona, setPersona } = usePersonaContext();
  if (!requiresPersona) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
        {(persona ?? "?").slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Connecté·e en tant que</p>
        <p className="truncate text-sm font-semibold text-zinc-100">{persona ?? "—"}</p>
      </div>
      <button
        type="button"
        onClick={() => setPersona(null)}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-400 hover:bg-[var(--crm-surface-2)]"
      >
        Changer
      </button>
    </div>
  );
}

function FlatNav({
  nav,
  counts,
  unreadNotifications,
  unreadMessages,
  onNavigate,
  itemClassName,
}: {
  nav: NavItem[];
  counts: { complete?: number } | undefined;
  unreadNotifications: number | undefined;
  unreadMessages: number | undefined;
  onNavigate?: () => void;
  itemClassName?: string;
}) {
  return (
    <div className="space-y-1">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-brand-500 bg-brand-600/15 text-brand-300"
                : "border-transparent text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
              itemClassName,
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 justify-self-center",
                  isActive ? "text-brand-300" : "text-zinc-500",
                )}
              />
              <span className="min-w-0 truncate">{item.label}</span>
              <NavBadge
                item={item}
                isActive={isActive}
                counts={counts}
                unreadNotifications={unreadNotifications}
                unreadMessages={unreadMessages}
              />
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

function NavBadge({
  item,
  isActive,
  counts,
  unreadNotifications,
  unreadMessages,
}: {
  item: NavItem;
  isActive: boolean;
  counts: { complete?: number } | undefined;
  unreadNotifications: number | undefined;
  unreadMessages: number | undefined;
}) {
  if (item.to === "/crm/notifications" && !isActive && (unreadNotifications ?? 0) > 0) {
    return (
      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {unreadNotifications}
      </span>
    );
  }

  if (item.to === "/crm/messages" && !isActive && (unreadMessages ?? 0) > 0) {
    return (
      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        {unreadMessages}
      </span>
    );
  }

  if (item.to === "/crm/demandes") {
    return (
      <span className="rounded-full border border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
        {counts?.complete ?? "…"}
      </span>
    );
  }

  return <span aria-hidden="true" />;
}

function SignInScreen() {
  return (
    <div className="min-h-screen bg-[var(--crm-bg)] flex flex-col items-center justify-center p-4 gap-8 dark">
      <div className="text-center text-zinc-100">
        <img
          src="/recyclerie-logo.png"
          alt="Recyclerie"
          className="mx-auto h-14 w-auto object-contain"
        />
        <p className="text-sm text-zinc-500 leading-tight">
          Espace professionnel
        </p>
      </div>
      <div className="w-full max-w-xl rounded-[28px] border border-[var(--crm-border)] bg-[var(--crm-surface)] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-8">
        <AuthPanelInner showLogo={false} theme="dark" />
      </div>
    </div>
  );
}
