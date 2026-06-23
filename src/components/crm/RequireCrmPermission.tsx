import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { CrmAction, CrmPageKey, canAccess, pageByKey } from "../../lib/crmPermissions";
import { FullSpinner } from "../ui/Spinner";

export function useCrmAccess() {
  return useQuery(api.permissions.myAccess);
}

export function RequireCrmPermission({
  page,
  action = "read",
  children,
}: {
  page: CrmPageKey;
  action?: CrmAction;
  children: ReactNode;
}) {
  const access = useCrmAccess();
  const pageDefinition = pageByKey(page);

  if (access === undefined) {
    return (
      <div className="p-6">
        <FullSpinner label="Vérification des accès…" />
      </div>
    );
  }

  if (!access.isStaff) {
    return (
      <AccessDenied
        title="Accès CRM réservé"
        description="Ce compte n'a pas de rôle staff ou admin dans Clerk."
      />
    );
  }

  if (!canAccess(access, page, action)) {
    return (
      <AccessDenied
        title="Accès non autorisé"
        description={`Votre compte n'a pas accès à la page ${pageDefinition?.label ?? page}.`}
      />
    );
  }

  return <>{children}</>;
}

function AccessDenied({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="max-w-md rounded-[28px] border border-red-500/20 bg-[linear-gradient(180deg,rgba(239,68,68,0.08),var(--crm-surface))] p-8 text-center shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-zinc-100">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
        <Link
          to="/crm"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--crm-border)] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100"
        >
          <LockKeyhole className="h-4 w-4" />
          Retour au CRM
        </Link>
      </div>
    </div>
  );
}
