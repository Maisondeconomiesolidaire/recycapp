import { useState } from "react";
import { useQuery } from "convex/react";
import { Users, Mail, Phone, Search, ChevronRight, MapPin } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { FullSpinner, Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Field";
import { Drawer } from "../../components/ui/Drawer";
import { TypeBadge } from "../../components/crm/TypeBadge";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { formatDate, initials } from "../../lib/format";
import { OUTCOME_LABELS } from "../../lib/constants";

export function Clients() {
  const clients = useQuery(api.clients.list);
  const [q, setQ] = useState("");
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<Id<"requests"> | null>(null);

  const filtered = (clients ?? []).filter((c) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.city ?? "").toLowerCase().includes(term) ||
      (c.address ?? "").toLowerCase().includes(term) ||
      (c.postalCode ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        actions={
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 sm:w-64"
            />
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        {clients === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Aucun client"
            description="Les clients apparaissent dès qu'une demande est soumise."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-[var(--crm-border)] sm:block">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-[var(--crm-surface-2)] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">Contact</th>
                    <th className="px-4 py-3 text-left font-medium">Ville</th>
                    <th className="px-4 py-3 text-left font-medium">Demandes</th>
                    <th className="px-4 py-3 text-left font-medium">Dernière</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.map((c) => (
                    <tr
                      key={c.email}
                      onClick={() => setOpenEmail(c.email)}
                      className="cursor-pointer bg-[var(--crm-surface)] hover:bg-[var(--crm-surface-2)]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--crm-surface-3)] text-xs font-semibold text-zinc-300">
                            {initials(c.firstName, c.lastName)}
                          </span>
                          <span className="font-medium text-zinc-100">
                            {c.firstName} {c.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" /> {c.email}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {c.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{c.city ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {c.types.map((t) => (
                            <TypeBadge key={t} type={t} size="sm" solid />
                          ))}
                          <span className="ml-1 text-zinc-500">({c.requestCount})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          {formatDate(c.lastAt)}
                          <ChevronRight className="h-4 w-4 text-zinc-600" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 sm:hidden">
              {filtered.map((c) => (
                <button
                  key={c.email}
                  onClick={() => setOpenEmail(c.email)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3 text-left hover:bg-[var(--crm-surface-2)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--crm-surface-3)] text-sm font-semibold text-zinc-300">
                    {initials(c.firstName, c.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-100">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{c.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {c.types.map((t) => (
                        <TypeBadge key={t} type={t} size="sm" solid />
                      ))}
                      <span className="text-xs text-zinc-500">({c.requestCount})</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ClientSheet
        email={openEmail}
        onClose={() => setOpenEmail(null)}
        onOpenRequest={setOpenRequest}
      />
      <RequestDrawer
        requestId={openRequest}
        onClose={() => setOpenRequest(null)}
      />
    </div>
  );
}

function ClientSheet({
  email,
  onClose,
  onOpenRequest,
}: {
  email: string | null;
  onClose: () => void;
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const data = useQuery(api.clients.get, email ? { email } : "skip");
  return (
    <Drawer
      open={email !== null}
      onClose={onClose}
      title={
        data ? `${data.customer.firstName} ${data.customer.lastName}` : "Fiche client"
      }
    >
      {!data ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-1.5 text-sm text-zinc-400">
            <a
              href={`mailto:${data.customer.email}`}
              className="flex items-center gap-2 hover:text-zinc-200"
            >
              <Mail className="h-4 w-4" /> {data.customer.email}
            </a>
            <a
              href={`tel:${data.customer.phone}`}
              className="flex items-center gap-2 hover:text-zinc-200"
            >
              <Phone className="h-4 w-4" /> {data.customer.phone}
            </a>
            {(data.customer.address ||
              data.customer.postalCode ||
              data.customer.city) && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {data.customer.address && <p>{data.customer.address}</p>}
                  <p>
                    {[data.customer.postalCode, data.customer.city]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Demandes ({data.requests.length})
            </h4>
            <div className="space-y-2">
              {data.requests.map((r) => (
                <button
                  key={r._id}
                  onClick={() => {
                    onClose();
                    onOpenRequest(r._id);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3 text-left hover:bg-[var(--crm-surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <TypeBadge type={r.type} size="sm" solid />
                    <span className="text-sm text-zinc-400">
                      {r.outcome === "open"
                        ? "En cours"
                        : OUTCOME_LABELS[r.outcome]}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatDate(r.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
}
