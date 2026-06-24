import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import {
  ChevronDown,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { api } from "../../../convex/_generated/api";
import { Drawer } from "../ui/Drawer";
import { GlobalScanner } from "./GlobalScanner";
import { CRM_PAGES, canAccess } from "../../lib/crmPermissions";
import type { CrmPageKey } from "../../lib/crmPermissions";

export const ThemeContext = createContext(true); // true = dark
export function useThemeContext() { return useContext(ThemeContext); }

type NavItem = (typeof CRM_PAGES)[number];

const NAV_GROUPS: Array<{
  key: string;
  label: string;
  description: string;
  items: CrmPageKey[];
}> = [
  {
    key: "pilotage",
    label: "Pilotage",
    description: "Vue d'ensemble et échanges",
    items: ["dashboard", "notifications", "messages"],
  },
  {
    key: "demandes",
    label: "Demandes & planning",
    description: "Clients, demandes et tournées",
    items: ["demandes", "calendrier", "clients", "tournees"],
  },
  {
    key: "stock",
    label: "Boutique & stock",
    description: "Articles, caisse et flux",
    items: ["articles", "caisse", "arrivages", "sorties", "ateliers"],
  },
  {
    key: "documents",
    label: "Documents",
    description: "Fichiers, devis et factures",
    items: ["documents"],
  },
  {
    key: "admin",
    label: "Administration",
    description: "Équipe et accès",
    items: ["equipe", "admin"],
  },
];

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
        <div className="min-h-screen bg-[var(--crm-bg)] text-zinc-100 flex transition-colors duration-200">
          <Sidebar isDark={isDark} onToggleTheme={toggle} />
          <div className="flex-1 min-w-0 lg:pl-64">
            <MobileTopBar onToggleTheme={toggle} />
            <Outlet />
          </div>
        </div>
        <GlobalScanner />
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
  const location = useLocation();
  const counts = useQuery(api.requests.counts);
  const unreadNotifications = useQuery(api.notifications.unreadCount);
  const unreadMessages = useQuery(api.messages.staffUnreadCount);
  const access = useQuery(api.permissions.myAccess);
  const onNotificationsPage = location.pathname === "/crm/notifications";
  const isDark = useThemeContext();
  const nav = CRM_PAGES.filter((item) =>
    item.adminOnly ? access?.isAdmin : canAccess(access, item.key),
  );

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

        <div className="flex min-w-[56px] items-center justify-end gap-2">
          {!onNotificationsPage && (unreadNotifications ?? 0) > 0 && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {unreadNotifications}
            </span>
          )}
          <span className="rounded-full border border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
            {counts?.complete ?? "…"}
          </span>
        </div>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        variant="left"
        title="Navigation"
        bodyClassName="p-3"
      >
        <nav className="space-y-2">
          <GroupedNav
            nav={nav}
            counts={counts}
            unreadNotifications={unreadNotifications}
            unreadMessages={unreadMessages}
            onNavigate={() => setOpen(false)}
            itemClassName="py-3"
          />
          <div className="border-t border-[var(--crm-border)] pt-1 mt-1">
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
  const nav = CRM_PAGES.filter((item) =>
    item.adminOnly ? access?.isAdmin : canAccess(access, item.key),
  );
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--crm-border)] bg-[var(--crm-surface)] lg:flex">
      <div className="flex h-16 items-center justify-center border-b border-[var(--crm-border)] px-5">
        <img
          src="/recyclerie-logo.png"
          alt="Recyclerie"
          className="h-11 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        <GroupedNav
          nav={nav}
          counts={counts}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
      </nav>

      <div className="border-t border-[var(--crm-border)] p-3 space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--crm-surface-2)] px-3 py-2">
          <UserButton afterSignOutUrl="/crm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

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

function GroupedNav({
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
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_GROUPS.map((group) => [group.key, true])),
  );

  const navByKey = new Map(nav.map((item) => [item.key, item]));
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    navItems: group.items
      .map((key) => navByKey.get(key))
      .filter((item): item is NavItem => Boolean(item)),
  })).filter((group) => group.navItems.length > 0);

  useEffect(() => {
    const activeGroupKeys = groups
      .filter((group) => group.navItems.some((item) => isPathActive(location.pathname, item)))
      .map((group) => group.key);
    if (activeGroupKeys.length === 0) return;
    setOpenGroups((current) => {
      let changed = false;
      const next = { ...current };
      for (const key of activeGroupKeys) {
        if (!next[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [groups, location.pathname]);

  return (
    <>
      {groups.map((group) => {
        const isOpen = openGroups[group.key] ?? true;
        const hasActiveItem = group.navItems.some((item) => isPathActive(location.pathname, item));

        return (
          <div key={group.key} className="rounded-2xl border border-transparent">
            <button
              type="button"
              onClick={() => setOpenGroups((current) => ({ ...current, [group.key]: !isOpen }))}
              className={cn(
                "grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                hasActiveItem
                  ? "bg-[var(--crm-surface-2)] text-zinc-100"
                  : "text-zinc-500 hover:bg-[var(--crm-surface-2)] hover:text-zinc-200",
              )}
              aria-expanded={isOpen}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold uppercase tracking-[0.16em]">
                  {group.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-500">
                  {group.description}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 justify-self-end text-zinc-500 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            {isOpen && (
              <div className="mt-1 space-y-1">
                {group.navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-600/15 text-brand-300 shadow-[inset_3px_0_0_rgba(255,119,0,0.75)]"
                          : "text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
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
            )}
          </div>
        );
      })}
    </>
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

function isPathActive(pathname: string, item: NavItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
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
      <SignIn
        routing="hash"
        appearance={{ variables: { colorPrimary: "#ff7700" } }}
      />
    </div>
  );
}
