import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, LogOut, MessageSquare, Package, Settings, User } from "lucide-react";
import { api } from "../../../convex/_generated/api";

const BRAND = "#f1104f";

/** Crée/rafraîchit le profil Convex à la connexion et rattache les demandes. */
function ProfileSync() {
  const syncProfile = useMutation(api.users.syncProfile);
  useEffect(() => {
    void syncProfile({});
  }, [syncProfile]);
  return null;
}

export function AccountMenu() {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const unread = useQuery(api.messages.myUnreadCount);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items = [
    { to: "/compte", icon: User, label: "Informations personnelles" },
    { to: "/compte/commandes", icon: Package, label: "Commandes" },
    { to: "/compte/messagerie", icon: MessageSquare, label: "Messagerie", badge: unread ?? 0 },
    { to: "/compte/parametres", icon: Settings, label: "Paramètres" },
  ];

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/55 bg-white/85 px-5 text-sm font-semibold text-zinc-900 shadow-[0_12px_30px_rgba(24,24,27,0.08)] backdrop-blur transition hover:-translate-y-0.5 sm:h-14"
          >
            <User className="h-4 w-4" />
            S'inscrire
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <ProfileSync />
        <div ref={ref} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/55 bg-white/85 px-4 text-sm font-semibold text-zinc-900 shadow-[0_12px_30px_rgba(24,24,27,0.08)] backdrop-blur transition hover:-translate-y-0.5 sm:h-14"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Mon compte</span>
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
            {(unread ?? 0) > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-white ring-2 ring-[#f6f4ef]"
                style={{ backgroundColor: BRAND }}
              >
                {unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_28px_70px_rgba(24,24,27,0.18)]">
              <div className="p-1.5">
                {items.map(({ to, icon: Icon, label, badge }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    <Icon className="h-4 w-4 text-zinc-400" />
                    <span className="flex-1">{label}</span>
                    {typeof badge === "number" && badge > 0 && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <div className="border-t border-zinc-100 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut(() => navigate("/boutique"));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}
