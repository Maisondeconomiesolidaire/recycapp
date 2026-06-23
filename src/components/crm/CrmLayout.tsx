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
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { api } from "../../../convex/_generated/api";
import { Drawer } from "../ui/Drawer";
import { GlobalScanner } from "./GlobalScanner";
import { CRM_PAGES, canAccess } from "../../lib/crmPermissions";

export const ThemeContext = createContext(true); // true = dark
export function useThemeContext() { return useContext(ThemeContext); }

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
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600/15 text-brand-300"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-[var(--crm-surface-2)]",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
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
  const location = useLocation();
  const counts = useQuery(api.requests.counts);
  const unreadNotifications = useQuery(api.notifications.unreadCount);
  const unreadMessages = useQuery(api.messages.staffUnreadCount);
  const access = useQuery(api.permissions.myAccess);
  const onNotificationsPage = location.pathname === "/crm/notifications";
  const onMessagesPage = location.pathname === "/crm/messages";
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

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600/15 text-brand-300"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-[var(--crm-surface-2)]",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/crm/notifications" &&
              !onNotificationsPage &&
              (unreadNotifications ?? 0) > 0 && (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                {unreadNotifications ?? "…"}
              </span>
            )}
            {item.to === "/crm/messages" &&
              !onMessagesPage &&
              (unreadMessages ?? 0) > 0 && (
              <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                {unreadMessages}
              </span>
            )}
            {item.to === "/crm/demandes" && (
              <span className="rounded-full border border-[var(--crm-border-strong)] bg-[var(--crm-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-zinc-300">
                {counts?.complete ?? "…"}
              </span>
            )}
          </NavLink>
        ))}
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
