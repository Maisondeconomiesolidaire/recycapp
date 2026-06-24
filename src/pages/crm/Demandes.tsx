import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { BrainCircuit, CalendarClock, Inbox, Lightbulb, Plus, UsersRound } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { KanbanColumn } from "../../components/crm/KanbanColumn";
import { RequestCard } from "../../components/crm/RequestCard";
import { RequestDrawer } from "../../components/crm/RequestDrawer";
import { NewRequestDrawer } from "../../components/crm/NewRequestDrawer";
import { Drawer } from "../../components/ui/Drawer";
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
  const [analysisOpen, setAnalysisOpen] = useState(false);

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
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setAnalysisOpen(true)}>
              <BrainCircuit className="h-4 w-4" /> Analyse IA
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> Nouvelle demande
            </Button>
          </div>
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
      <div className="relative z-10 border-b border-zinc-800 px-4 sm:px-6">
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
      <RequestsAnalysisDrawer
        open={analysisOpen}
        onClose={() => setAnalysisOpen(false)}
        requests={requests ?? []}
        teamNames={teamNames}
        onOpenRequest={(id) => {
          setOpenId(id);
          setAnalysisOpen(false);
        }}
      />
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

function RequestsAnalysisDrawer({
  open,
  onClose,
  requests,
  teamNames,
  onOpenRequest,
}: {
  open: boolean;
  onClose: () => void;
  requests: Doc<"requests">[];
  teamNames: Map<string, string>;
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const analysis = buildRequestsAnalysis(requests, teamNames);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-brand-300" />
          Analyse IA des demandes
        </span>
      }
      panelClassName="max-w-3xl"
      bodyClassName="space-y-5"
    >
      <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4">
        <p className="text-sm font-semibold text-zinc-100">{analysis.summary}</p>
        <p className="mt-1 text-xs text-zinc-500">
          Analyse opérationnelle basée sur les demandes ouvertes, les dates programmées et les encadrants assignés.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AnalysisStat label="Demandes ouvertes" value={String(analysis.openCount)} />
        <AnalysisStat label="À planifier" value={String(analysis.waitingPlanning.length)} />
        <AnalysisStat label="Collectes planifiées" value={String(analysis.plannedCollectes.length)} />
      </div>

      <AnalysisSection icon={<Lightbulb className="h-4 w-4" />} title="Recommandations manager">
        {analysis.recommendations.map((item) => (
          <div key={item.title} className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
            <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">{item.text}</p>
            {item.requestIds.length > 0 && (
              <RequestLinkRow requestIds={item.requestIds} requests={requests} onOpenRequest={onOpenRequest} />
            )}
          </div>
        ))}
      </AnalysisSection>

      <AnalysisSection icon={<CalendarClock className="h-4 w-4" />} title="Planning collecte">
        {analysis.busyDays.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune collecte planifiée à analyser pour le moment.</p>
        ) : (
          analysis.busyDays.map((day) => (
            <div key={day.key} className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-zinc-100">{day.label}</p>
                <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300">
                  {day.requests.length} demande{day.requests.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Assigné à : {day.assignees.length > 0 ? day.assignees.join(", ") : "non assigné"}
              </p>
              <RequestLinkRow requestIds={day.requests.map((r) => r._id)} requests={requests} onOpenRequest={onOpenRequest} />
            </div>
          ))
        )}
      </AnalysisSection>

      <AnalysisSection icon={<UsersRound className="h-4 w-4" />} title="Demandes en attente de planification">
        {analysis.waitingPlanning.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune demande complète en attente de planification.</p>
        ) : (
          <RequestLinkRow requestIds={analysis.waitingPlanning.map((r) => r._id)} requests={requests} onOpenRequest={onOpenRequest} />
        )}
      </AnalysisSection>
    </Drawer>
  );
}

function AnalysisStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
    </div>
  );
}

function AnalysisSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-100">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RequestLinkRow({
  requestIds,
  requests,
  onOpenRequest,
}: {
  requestIds: Id<"requests">[];
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const byId = new Map(requests.map((r) => [r._id, r]));
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {requestIds.map((id) => {
        const request = byId.get(id);
        if (!request) return null;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpenRequest(id)}
            className="rounded-full border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-brand-500/50 hover:text-brand-300"
          >
            #{request.reference} · {TYPE_LABELS[request.type]}
          </button>
        );
      })}
    </div>
  );
}

function buildRequestsAnalysis(requests: Doc<"requests">[], teamNames: Map<string, string>) {
  const open = requests.filter((r) => r.outcome === "open");
  const plannedCollectes = open.filter((r) => r.type === "collecte" && Boolean(r.scheduledDate));
  const waitingPlanning = open
    .filter((r) => r.complete && !r.scheduledDate && r.type !== "article")
    .slice(0, 12);
  const dayMap = new Map<string, Doc<"requests">[]>();
  for (const request of plannedCollectes) {
    if (!request.scheduledDate) continue;
    const key = new Date(request.scheduledDate).toISOString().slice(0, 10);
    dayMap.set(key, [...(dayMap.get(key) ?? []), request]);
  }
  const busyDays = Array.from(dayMap.entries())
    .map(([key, dayRequests]) => ({
      key,
      label: formatShortDate(dayRequests[0].scheduledDate ?? Date.now()),
      requests: dayRequests,
      assignees: Array.from(
        new Set(
          dayRequests
            .map((request) => request.assignedTo ? teamNames.get(request.assignedTo) : undefined)
            .filter((name): name is string => Boolean(name)),
        ),
      ),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(0, 6);

  const busiest = busyDays[0];
  const recommendations = [
    {
      title: waitingPlanning.length > 0 ? "Planification à traiter" : "Planification maîtrisée",
      text: waitingPlanning.length > 0
        ? `${waitingPlanning.length} demande${waitingPlanning.length > 1 ? "s" : ""} complète${waitingPlanning.length > 1 ? "s" : ""} attendent une date. Priorité : les regrouper avec les journées déjà planifiées proches géographiquement.`
        : "Aucune demande complète en attente immédiate de planification.",
      requestIds: waitingPlanning.slice(0, 6).map((r) => r._id),
    },
    {
      title: busiest ? `Journée à surveiller : ${busiest.label}` : "Aucune journée chargée",
      text: busiest
        ? `${busiest.requests.length} collecte${busiest.requests.length > 1 ? "s" : ""} sont déjà planifiées ce jour-là${busiest.assignees.length ? `, assignées à ${busiest.assignees.join(", ")}` : ""}. Vérifiez la tournée avant d'ajouter de nouvelles demandes.`
        : "Aucune collecte planifiée détectée dans les demandes ouvertes.",
      requestIds: busiest ? busiest.requests.map((r) => r._id) : [],
    },
    {
      title: "Répartition par type",
      text: requestTypeSummary(open),
      requestIds: open.slice(0, 6).map((r) => r._id),
    },
  ];

  return {
    openCount: open.length,
    plannedCollectes,
    waitingPlanning,
    busyDays,
    recommendations,
    summary: `${open.length} demande${open.length > 1 ? "s" : ""} ouverte${open.length > 1 ? "s" : ""}, ${plannedCollectes.length} collecte${plannedCollectes.length > 1 ? "s" : ""} planifiée${plannedCollectes.length > 1 ? "s" : ""}, ${waitingPlanning.length} demande${waitingPlanning.length > 1 ? "s" : ""} à planifier.`,
  };
}

function requestTypeSummary(requests: Doc<"requests">[]) {
  const counts = REQUEST_TYPES.map((type) => ({
    type,
    count: requests.filter((request) => request.type === type).length,
  })).filter((entry) => entry.count > 0);
  if (counts.length === 0) return "Aucune demande ouverte à répartir pour le moment.";
  return counts
    .map((entry) => `${entry.count} ${TYPE_LABELS[entry.type]}`)
    .join(", ");
}

function formatShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
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
