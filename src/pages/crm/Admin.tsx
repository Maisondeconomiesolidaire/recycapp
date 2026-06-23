import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Check,
  CircleDashed,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Field, Input } from "../../components/ui/Field";
import { FullSpinner } from "../../components/ui/Spinner";
import { cn } from "../../lib/cn";
import {
  ACTION_LABELS,
  CRM_PAGES,
  CrmAction,
  CrmGrant,
  CrmPageDefinition,
} from "../../lib/crmPermissions";

type ClerkUser = {
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string | null;
  createdAt: number | null;
  lastSignInAt: number | null;
};

type PermissionPerson = {
  email: string;
  name?: string;
  permissionActive?: boolean;
  grants: CrmGrant[];
  updatedAt?: number;
};

type ManagedPerson = PermissionPerson & {
  clerkId?: string;
  imageUrl?: string | null;
  createdAt?: number | null;
  lastSignInAt?: number | null;
  source: "clerk" | "manual";
};

type ClerkUsersState = {
  users: ClerkUser[];
  totalCount: number;
  setupError: string | null;
};

function emptyGrants() {
  return CRM_PAGES.filter((page) => !page.adminOnly).map((page) => ({
    pageKey: page.key,
    actions: [] as string[],
  }));
}

function mergeGrants(grants: CrmGrant[]) {
  const source = new Map(grants.map((grant) => [grant.pageKey, grant.actions]));
  return emptyGrants().map((grant) => ({
    ...grant,
    actions: source.get(grant.pageKey) ?? [],
  }));
}

function hasAction(grants: CrmGrant[], pageKey: string, action: CrmAction) {
  return Boolean(grants.find((grant) => grant.pageKey === pageKey)?.actions.includes(action));
}

function toggleAction(grants: CrmGrant[], pageKey: string, action: CrmAction) {
  return grants.map((grant) => {
    if (grant.pageKey !== pageKey) return grant;
    const actions = grant.actions.includes(action)
      ? grant.actions.filter((entry) => entry !== action)
      : [...grant.actions, action];
    return { ...grant, actions };
  });
}

function setPageAll(grants: CrmGrant[], page: CrmPageDefinition, checked: boolean) {
  return grants.map((grant) =>
    grant.pageKey === page.key
      ? { ...grant, actions: checked ? [...page.actions] : [] }
      : grant,
  );
}

function mergeUsers(clerkUsers: ClerkUser[], permissionPeople: PermissionPerson[]) {
  const people = new Map<string, ManagedPerson>();

  for (const user of clerkUsers) {
    people.set(user.email, {
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      permissionActive: undefined,
      grants: [],
      source: "clerk",
    });
  }

  for (const permission of permissionPeople) {
    const existing = people.get(permission.email);
    people.set(permission.email, {
      ...existing,
      email: permission.email,
      name: existing?.name ?? permission.name,
      permissionActive: permission.permissionActive,
      grants: permission.grants,
      updatedAt: permission.updatedAt,
      source: existing ? "clerk" : "manual",
    });
  }

  return Array.from(people.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, "fr"),
  );
}

export function Admin() {
  const permissionsData = useQuery(api.permissions.listManaged);
  const listClerkUsers = useAction(api.permissions.listClerkUsers);
  const upsert = useMutation(api.permissions.upsert);
  const remove = useMutation(api.permissions.remove);
  const [search, setSearch] = useState("");
  const [clerkData, setClerkData] = useState<ClerkUsersState | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [active, setActive] = useState(true);
  const [grants, setGrants] = useState<CrmGrant[]>(emptyGrants);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setClerkData(null);
    listClerkUsers({ limit: 300 })
      .then((result) => {
        if (cancelled) return;
        setClerkData(result as ClerkUsersState);
      })
      .catch(() => {
        if (cancelled) return;
        setClerkData({
          users: [],
          totalCount: 0,
          setupError: "clerk_api_error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [listClerkUsers]);

  const people = useMemo(
    () => mergeUsers(clerkData?.users ?? [], permissionsData?.people ?? []),
    [clerkData?.users, permissionsData?.people],
  );
  const filteredPeople = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) =>
      [person.name, person.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [people, search]);

  const selectedPerson = people.find((person) => person.email === selectedEmail) ?? null;

  useEffect(() => {
    if (!permissionsData || clerkData === null) return;
    if (selectedEmail && people.some((person) => person.email === selectedEmail)) return;
    setSelectedEmail(people[0]?.email ?? null);
  }, [permissionsData, clerkData, people, selectedEmail]);

  useEffect(() => {
    if (!selectedPerson) {
      setDraftName("");
      setDraftEmail("");
      setActive(true);
      setGrants(emptyGrants());
      return;
    }
    setDraftName(selectedPerson.name ?? "");
    setDraftEmail(selectedPerson.email);
    setActive(selectedPerson.permissionActive ?? true);
    setGrants(mergeGrants(selectedPerson.grants));
  }, [selectedPerson]);

  async function save() {
    const email = draftEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    try {
      await upsert({
        email,
        name: draftName.trim() || undefined,
        active,
        grants: grants
          .map((grant) => ({
            pageKey: grant.pageKey,
            actions: grant.actions,
          }))
          .filter((grant) => grant.actions.length > 0),
      });
      setSelectedEmail(email);
    } finally {
      setSaving(false);
    }
  }

  async function removeAccess() {
    if (!selectedPerson) return;
    setSaving(true);
    try {
      await remove({ email: selectedPerson.email });
    } finally {
      setSaving(false);
    }
  }

  function startManualAccess() {
    setSelectedEmail(null);
    setDraftName("");
    setDraftEmail("");
    setActive(true);
    setGrants(emptyGrants());
  }

  return (
    <div>
      <PageHeader
        title="Admin"
        actions={
          <Button onClick={startManualAccess} variant="secondary">
            <Plus className="h-4 w-4" />
            Nouvel accès
          </Button>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {permissionsData === undefined || clerkData === null ? (
          <FullSpinner label="Chargement des utilisateurs Clerk…" />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-[28px] border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <div className="border-b border-[var(--crm-border)] p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un utilisateur…"
                    className="pl-9"
                  />
                </div>
                {clerkData.setupError && (
                  <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-200">
                    {clerkData.setupError === "missing_clerk_secret_key"
                      ? "Ajoute CLERK_SECRET_KEY dans les variables Convex pour afficher tous les utilisateurs Clerk."
                      : "Impossible de charger les utilisateurs Clerk pour le moment."}
                  </div>
                )}
              </div>

              <div className="max-h-[640px] overflow-y-auto p-2">
                {filteredPeople.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={<Mail className="h-8 w-8" />}
                      title="Aucun utilisateur Clerk"
                      description="Les utilisateurs Clerk apparaîtront ici dès que la clé serveur Clerk sera configurée."
                    />
                  </div>
                ) : (
                  filteredPeople.map((person) => (
                    <button
                      key={person.email}
                      type="button"
                      onClick={() => setSelectedEmail(person.email)}
                      className={cn(
                        "mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                        selectedEmail === person.email
                          ? "bg-brand-500/14 text-zinc-100 ring-1 ring-brand-400/35"
                        : "text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--crm-surface-2)] text-sm font-black text-zinc-300">
                        {person.imageUrl ? (
                          <img
                            src={person.imageUrl}
                            alt={person.name ?? person.email}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (person.name ?? person.email).slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {person.name || person.email}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {person.email}
                        </span>
                        {person.source === "manual" && (
                          <span className="mt-0.5 block text-[11px] text-amber-300/80">
                            Accès manuel hors liste Clerk
                          </span>
                        )}
                      </span>
                      {person.permissionActive === false ? (
                        <ShieldOff className="h-4 w-4 text-red-400" />
                      ) : person.grants.length > 0 ? (
                        <Check className="h-4 w-4 text-brand-300" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-zinc-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="overflow-hidden rounded-[28px] border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <div className="border-b border-[var(--crm-border)] p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <Field label="Nom affiché">
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Jean Dupont"
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={draftEmail}
                      onChange={(event) => setDraftEmail(event.target.value)}
                      placeholder="prenom@recyclerie.fr"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => setActive((current) => !current)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition",
                      active
                        ? "border-brand-400/35 bg-brand-500/12 text-brand-200"
                        : "border-red-400/30 bg-red-500/10 text-red-300",
                    )}
                  >
                    {active ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                    {active ? "Accès actif" : "Accès coupé"}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--crm-border)]">
                {CRM_PAGES.filter((page) => !page.adminOnly).map((page) => (
                  <PermissionRow
                    key={page.key}
                    page={page}
                    grants={grants}
                    onToggle={(action) => setGrants((current) => toggleAction(current, page.key, action))}
                    onSetAll={(checked) => setGrants((current) => setPageAll(current, page, checked))}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-zinc-500">
                  Les admins ne sont pas limités par cette matrice. Pour les autres comptes,
                  l'email doit correspondre à l'email Clerk connecté.
                </p>
                <div className="flex gap-2">
                  {selectedPerson?.grants.length ? (
                    <Button variant="danger" onClick={removeAccess} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      Réinitialiser
                    </Button>
                  ) : null}
                  <Button onClick={save} disabled={saving || !draftEmail.trim()}>
                    <Save className="h-4 w-4" />
                    {saving ? "Enregistrement…" : "Enregistrer les droits"}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function PermissionRow({
  page,
  grants,
  onToggle,
  onSetAll,
}: {
  page: CrmPageDefinition;
  grants: CrmGrant[];
  onToggle: (action: CrmAction) => void;
  onSetAll: (checked: boolean) => void;
}) {
  const Icon = page.icon;
  const enabledActions = page.actions.filter((action) => hasAction(grants, page.key, action));
  const allChecked = enabledActions.length === page.actions.length;

  return (
    <div className="grid gap-4 p-5 xl:grid-cols-[minmax(220px,1fr)_auto] xl:items-center">
      <div className="flex gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            enabledActions.length
              ? "border-brand-400/30 bg-brand-500/12 text-brand-300"
              : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-500",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-zinc-100">{page.label}</h3>
            <button
              type="button"
              onClick={() => onSetAll(!allChecked)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                allChecked
                  ? "bg-brand-500 text-white"
                  : "bg-[var(--crm-surface-2)] text-zinc-500 hover:text-zinc-200",
              )}
            >
              {allChecked ? "Tout activé" : "Tout activer"}
            </button>
          </div>
          <p className="mt-1 text-sm leading-5 text-zinc-500">{page.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {page.actions.map((action) => {
          const checked = hasAction(grants, page.key, action);
          return (
            <button
              key={action}
              type="button"
              onClick={() => onToggle(action)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                checked
                  ? "border-brand-400/30 bg-brand-500/15 text-brand-200"
                  : "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-500 hover:text-zinc-200",
              )}
            >
              {ACTION_LABELS[action]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
