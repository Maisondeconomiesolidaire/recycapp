import { useState } from "react";
import { useQuery } from "convex/react";
import { Inbox, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { KanbanColumn } from "../../components/crm/KanbanColumn";
import { RequestCard } from "../../components/crm/RequestCard";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { NewRequestDrawer } from "../../components/crm/NewRequestDrawer";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import {
  STAGES,
  RequestType,
  RequestStage,
  REQUEST_TYPES,
  TYPE_LABELS,
  TYPE_COLORS,
  deriveStage,
} from "../../lib/constants";
import { cn } from "../../lib/cn";

type Tab = "complete" | "incomplete" | "closed";

const TABS: { key: Tab; label: string }[] = [
  { key: "complete", label: "Demandes complètes" },
  { key: "incomplete", label: "Demandes incomplètes" },
  { key: "closed", label: "Gagnées / Perdues" },
];

export function Demandes() {
  const [tab, setTab] = useState<Tab>("complete");
  const [typeFilter, setTypeFilter] = useState<RequestType | null>(null);
  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [newOpen, setNewOpen] = useState(false);

  const requests = useQuery(api.requests.list, {
    type: typeFilter ?? undefined,
  });
  const team = useQuery(api.team.list, {}) ?? [];
  const teamNames = new Map(team.map((m) => [m._id as string, m.name]));
  const assigneeName = (r: Doc<"requests">) =>
    r.assignedTo ? teamNames.get(r.assignedTo) : undefined;

  const displayedRequests = (requests ?? [])
    .filter((r) => !staffFilter || r.assignedTo === staffFilter)
    .filter((r) => !siteFilter || r.site === siteFilter)
    .sort((a, b) =>
      sortOrder === "desc"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:h-[calc(100vh)]">
      <PageHeader
        title="Demandes"
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvelle demande
          </Button>
        }
      />

      {/* Onglets */}
      <div className="px-4 pt-4 sm:px-6">
        <UnderlineTabs
          items={TABS}
          value={tab}
          onChange={setTab}
          counts={
            requests
              ? {
                  complete: countForTab(displayedRequests, "complete"),
                  incomplete: countForTab(displayedRequests, "incomplete"),
                  closed: countForTab(displayedRequests, "closed"),
                }
              : undefined
          }
        />
      </div>

      {/* Filtres – défilement horizontal sur mobile */}
      <div className="relative z-[80] border-b border-zinc-800 px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 overflow-visible py-3">
          <SortFilter value={sortOrder} onChange={setSortOrder} />
          <div className="h-4 w-px shrink-0 bg-zinc-800" />
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
          <div className="h-4 w-px shrink-0 bg-zinc-800" />
          <SiteFilter value={siteFilter} onChange={setSiteFilter} />
          <StaffFilter value={staffFilter} onChange={setStaffFilter} team={team} />
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {requests === undefined ? (
          <FullSpinner label="Chargement des demandes…" />
        ) : (
          <>
            {/* Vue liste sur mobile */}
            <div className="lg:hidden space-y-4">
              {tab === "closed" ? (
                <MobileClosedBoard
                  requests={displayedRequests}
                  onOpen={setOpenId}
                  assigneeName={assigneeName}
                />
              ) : (
                <MobileOpenBoard
                  requests={displayedRequests}
                  complete={tab === "complete"}
                  onOpen={setOpenId}
                  assigneeName={assigneeName}
                />
              )}
            </div>
            {/* Kanban sur desktop */}
            <div className="hidden lg:flex gap-4 h-full">
              {tab === "closed" ? (
                <ClosedBoard
                  requests={displayedRequests}
                  onOpen={setOpenId}
                  assigneeName={assigneeName}
                />
              ) : (
                <OpenBoard
                  requests={displayedRequests}
                  complete={tab === "complete"}
                  onOpen={setOpenId}
                  assigneeName={assigneeName}
                />
              )}
            </div>
          </>
        )}
      </div>

      <RequestDrawer requestId={openId} onClose={() => setOpenId(null)} />
      <NewRequestDrawer open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function OpenBoard({
  requests,
  complete,
  onOpen,
  assigneeName,
}: {
  requests: Doc<"requests">[];
  complete: boolean;
  onOpen: (id: Id<"requests">) => void;
  assigneeName: (r: Doc<"requests">) => string | undefined;
}) {
  const filtered = requests.filter(
    (r) => r.outcome === "open" && r.complete === complete,
  );
  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-10 w-10" />}
        title={
          complete ? "Aucune demande complète" : "Aucune demande incomplète"
        }
        description="Les nouvelles demandes des formulaires apparaîtront ici."
      />
    );
  }
  return (
    <>
      {STAGES.map((s) => {
        const cards = filtered.filter((r) => deriveStage(r) === s.key);
        return (
          <KanbanColumn
            key={s.key}
            title={s.label}
            count={cards.length}
            accent={s.key === "planifie" ? "#a78bfa" : undefined}
          >
            {cards.map((r) => (
              <RequestCard
                key={r._id}
                request={r}
                onOpen={() => onOpen(r._id)}
                assigneeName={assigneeName(r)}
              />
            ))}
          </KanbanColumn>
        );
      })}
    </>
  );
}

function ClosedBoard({
  requests,
  onOpen,
  assigneeName,
}: {
  requests: Doc<"requests">[];
  onOpen: (id: Id<"requests">) => void;
  assigneeName: (r: Doc<"requests">) => string | undefined;
}) {
  const won = requests.filter((r) => r.outcome === "gagnee");
  const lost = requests.filter((r) => r.outcome === "perdue");
  return (
    <>
      <KanbanColumn title="Gagnées" count={won.length} accent="#196b24">
        {won.map((r) => (
          <RequestCard
            key={r._id}
            request={r}
            onOpen={() => onOpen(r._id)}
            assigneeName={assigneeName(r)}
          />
        ))}
      </KanbanColumn>
      <KanbanColumn title="Perdues" count={lost.length} accent="#ef4444">
        {lost.map((r) => (
          <RequestCard
            key={r._id}
            request={r}
            onOpen={() => onOpen(r._id)}
            assigneeName={assigneeName(r)}
          />
        ))}
      </KanbanColumn>
    </>
  );
}

function MobileOpenBoard({
  requests,
  complete,
  onOpen,
  assigneeName,
}: {
  requests: Doc<"requests">[];
  complete: boolean;
  onOpen: (id: Id<"requests">) => void;
  assigneeName: (r: Doc<"requests">) => string | undefined;
}) {
  const [stage, setStage] = useState<RequestStage>("nouveau");
  const filtered = requests.filter((r) => r.outcome === "open" && r.complete === complete);
  const stageCards = filtered.filter((r) => deriveStage(r) === stage);

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-10 w-10" />}
        title={complete ? "Aucune demande complète" : "Aucune demande incomplète"}
        description="Les nouvelles demandes des formulaires apparaîtront ici."
      />
    );
  }

  return (
    <>
      {/* Stage tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
        {STAGES.map((s) => {
          const count = filtered.filter((r) => deriveStage(r) === s.key).length;
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                stage === s.key
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200",
              )}
            >
              {s.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  stage === s.key ? "bg-zinc-800 text-zinc-100" : "bg-zinc-800 text-zinc-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {stageCards.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">Aucune demande dans cette étape.</p>
      ) : (
        <div className="space-y-3">
          {stageCards.map((r) => (
            <RequestCard
              key={r._id}
              request={r}
              onOpen={() => onOpen(r._id)}
              assigneeName={assigneeName(r)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MobileClosedBoard({
  requests,
  onOpen,
  assigneeName,
}: {
  requests: Doc<"requests">[];
  onOpen: (id: Id<"requests">) => void;
  assigneeName: (r: Doc<"requests">) => string | undefined;
}) {
  const won = requests.filter((r) => r.outcome === "gagnee");
  const lost = requests.filter((r) => r.outcome === "perdue");
  return (
    <div className="space-y-6">
      {[
        { label: "Gagnées", items: won, accent: "text-emerald-400" },
        { label: "Perdues", items: lost, accent: "text-red-400" },
      ].map(({ label, items, accent }) => (
        <div key={label}>
          <h3 className={cn("mb-3 text-sm font-semibold", accent)}>
            {label} <span className="text-zinc-500">({items.length})</span>
          </h3>
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucune demande.</p>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <RequestCard
                  key={r._id}
                  request={r}
                  onOpen={() => onOpen(r._id)}
                  assigneeName={assigneeName(r)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function countForTab(requests: Doc<"requests">[], tab: Tab): number {
  if (tab === "closed")
    return requests.filter((r) => r.outcome !== "open").length;
  return requests.filter(
    (r) => r.outcome === "open" && r.complete === (tab === "complete"),
  ).length;
}

function TypeFilter({
  value,
  onChange,
}: {
  value: RequestType | null;
  onChange: (v: RequestType | null) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-1">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          value === null
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        Tous
      </button>
      {REQUEST_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === t ? "text-white" : "text-zinc-500 hover:text-zinc-300",
          )}
          style={value === t ? { backgroundColor: TYPE_COLORS[t] } : undefined}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: TYPE_COLORS[t] }}
          />
          {TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function SiteFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-9 w-[150px] rounded-xl bg-zinc-900 px-3 text-xs font-medium text-zinc-300"
    >
      <option value="">Tous les sites</option>
      <option value="60">Recyclerie 60</option>
      <option value="76">Recyclerie 76</option>
    </Select>
  );
}

function StaffFilter({
  value,
  onChange,
  team,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  team: { _id: string; name: string }[];
}) {
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-9 w-[180px] rounded-xl bg-zinc-900 px-3 text-xs font-medium text-zinc-300"
    >
      <option value="">Tous les encadrants</option>
      {team.map((m) => (
        <option key={m._id} value={m._id}>
          {m.name}
        </option>
      ))}
    </Select>
  );
}

function SortFilter({
  value,
  onChange,
}: {
  value: "desc" | "asc";
  onChange: (v: "desc" | "asc") => void;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as "desc" | "asc")}
      className="h-9 w-[140px] rounded-xl bg-zinc-900 px-3 text-xs font-medium text-zinc-300"
    >
      <option value="desc">Plus récent</option>
      <option value="asc">Plus ancien</option>
    </Select>
  );
}
