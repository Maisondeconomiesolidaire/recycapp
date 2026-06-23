import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  CircleDashed,
  KeyRound,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
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

export function Admin() {
  const data = useQuery(api.permissions.listManaged);
  const upsert = useMutation(api.permissions.upsert);
  const remove = useMutation(api.permissions.remove);
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [active, setActive] = useState(true);
  const [grants, setGrants] = useState<CrmGrant[]>(emptyGrants);
  const [saving, setSaving] = useState(false);

  const people = data?.people ?? [];
  const filteredPeople = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) =>
      [person.name, person.email, person.teamRole]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [people, search]);

  const selectedPerson = people.find((person) => person.email === selectedEmail) ?? null;

  useEffect(() => {
    if (!data) return;
    if (selectedEmail && people.some((person) => person.email === selectedEmail)) return;
    setSelectedEmail(people[0]?.email ?? null);
  }, [data, people, selectedEmail]);

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
        subtitle="Contrôlez les accès CRM par page et par fonctionnalité."
        actions={
          <Button onClick={startManualAccess} variant="secondary">
            <Plus className="h-4 w-4" />
            Nouvel accès
          </Button>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Mode admin"
            value="Admins illimités"
            description="Le rôle Clerk admin garde toujours tous les accès."
          />
          <MetricCard
            icon={<KeyRound className="h-5 w-5" />}
            label="Pages contrôlées"
            value={`${CRM_PAGES.filter((page) => !page.adminOnly).length}`}
            description="Chaque page possède ses propres actions."
          />
          <MetricCard
            icon={<Sparkles className="h-5 w-5" />}
            label="Stock sécurisé"
            value="Serveur + UI"
            description="Lecture, création, modification et suppression sont vérifiées côté Convex."
          />
        </div>

        {data === undefined ? (
          <FullSpinner label="Chargement des accès…" />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-[28px] border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <div className="border-b border-[var(--crm-border)] p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un membre…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-[640px] overflow-y-auto p-2">
                {filteredPeople.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      icon={<Mail className="h-8 w-8" />}
                      title="Aucun accès"
                      description="Ajoutez un membre dans Équipe avec un email ou créez un accès manuel."
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
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-surface-2)] text-sm font-black text-zinc-300">
                        {(person.name ?? person.email).slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {person.name || person.email}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          {person.email}
                        </span>
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
                  <Field label="Email Clerk / staff" required>
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

function MetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--crm-border)] bg-[linear-gradient(135deg,var(--crm-surface),var(--crm-surface-2))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-300">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </p>
          <p className="text-lg font-semibold text-zinc-100">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
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
