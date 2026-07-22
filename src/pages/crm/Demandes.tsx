import { useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { BrainCircuit, Inbox, Loader2, Plus, Search, Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";
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
  getDisplayedProcessStep,
} from "../../lib/constants";
import { STEP } from "../../../convex/processes";
import { cn } from "../../lib/cn";
import { formatPrice } from "../../lib/format";

type Tab = "complete" | "incomplete" | "closed";
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  hidden?: boolean;
};

const ANALYSIS_LOADING_MESSAGES = [
  "En cours d'analyse par l'assistant IA...",
  "Je parcours les demandes et les dates...",
  "Je repère les regroupements possibles...",
  "Ça ne devrait plus tarder...",
  "Je prépare les priorités manager...",
];

const TABS: { key: Tab; label: string }[] = [
  { key: "complete", label: "Demandes complètes" },
  { key: "incomplete", label: "Demandes incomplètes" },
  { key: "closed", label: "Gagnées / Perdues" },
];

/**
 * Étapes proposées par le filtre « Étape du process ». On liste toutes les
 * étapes de tous les types de demandes (une demande n'en utilise qu'un
 * sous-ensemble) plus l'état initial, avant toute étape cochée.
 */
const NEW_REQUEST_STEP = "Nouvelle demande";
const PROCESS_STEP_OPTIONS = [
  NEW_REQUEST_STEP,
  STEP.contact,
  STEP.acompteVerse,
  STEP.devisEdite,
  STEP.devisSigne,
  STEP.prestaPlanifiee,
  STEP.prestaTerminee,
  STEP.factureEditee,
  STEP.factureReglee,
];

function quoteTotal(requests: Doc<"requests">[]) {
  return requests.reduce((sum, request) => sum + (request.quoteAmount ?? 0), 0);
}

export function Demandes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("complete");
  const [typeFilter, setTypeFilter] = useState<RequestType | null>(null);
  const [openId, setOpenId] = useState<Id<"requests"> | null>(null);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [stepFilter, setStepFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const requests = useQuery(api.requests.list, {
    type: typeFilter ?? undefined,
  });
  const team = useQuery(api.team.list, {}) ?? [];
  const teamNames = new Map(team.map((m) => [m._id as string, m.name]));
  const assigneeName = (r: Doc<"requests">) =>
    r.assignedTo ? teamNames.get(r.assignedTo) : undefined;

  const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
  const displayedRequests = useMemo(
    () =>
      (requests ?? [])
        .filter((r) => !staffFilter || r.assignedTo === staffFilter)
        .filter((r) => !siteFilter || r.site === siteFilter)
        .filter((r) => !stepFilter || getDisplayedProcessStep(r) === stepFilter)
        .filter((r) => matchesRequestSearch(r, normalizedSearch, assigneeName(r)))
        .sort((a, b) =>
          sortOrder === "desc"
            ? b.createdAt - a.createdAt
            : a.createdAt - b.createdAt,
        ),
    [
      requests,
      staffFilter,
      siteFilter,
      stepFilter,
      normalizedSearch,
      sortOrder,
      team,
    ],
  );

  useEffect(() => {
    if (searchParams.get("action") !== "new") return;
    setNewOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const requestId = searchParams.get("open");
    if (!requestId) return;
    setOpenId(requestId as Id<"requests">);
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      <div className="relative z-10 border-b border-[var(--crm-border)] px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 overflow-visible py-3">
          <SortFilter value={sortOrder} onChange={setSortOrder} />
          <div className="h-4 w-px shrink-0 bg-[var(--crm-surface-3)]" />
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
          <div className="h-4 w-px shrink-0 bg-[var(--crm-surface-3)]" />
          <SiteFilter value={siteFilter} onChange={setSiteFilter} />
          <StaffFilter value={staffFilter} onChange={setStaffFilter} team={team} />
          <StepFilter value={stepFilter} onChange={setStepFilter} />
        </div>
        <div className="pb-3">
          <SearchFilter value={search} onChange={setSearch} />
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
            total={formatPrice(quoteTotal(cards))}
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
      <KanbanColumn
        title="Gagnées"
        count={won.length}
        total={formatPrice(quoteTotal(won))}
        accent="#196b24"
      >
        {won.map((r) => (
          <RequestCard
            key={r._id}
            request={r}
            onOpen={() => onOpen(r._id)}
            assigneeName={assigneeName(r)}
          />
        ))}
      </KanbanColumn>
      <KanbanColumn
        title="Perdues"
        count={lost.length}
        total={formatPrice(quoteTotal(lost))}
        accent="#ef4444"
      >
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
          const cards = filtered.filter((r) => deriveStage(r) === s.key);
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                stage === s.key
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-[var(--crm-surface-2)] text-zinc-400 hover:text-zinc-200",
              )}
            >
              {s.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  stage === s.key ? "bg-[var(--crm-surface-3)] text-zinc-100" : "bg-[var(--crm-surface-3)] text-zinc-400",
                )}
              >
                {cards.length}
              </span>
              <span
                className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {formatPrice(quoteTotal(cards))}
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
            {label} <span className="text-zinc-500">({items.length})</span>{" "}
            <span className="text-zinc-900 dark:text-zinc-100">{formatPrice(quoteTotal(items))}</span>
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
  onOpenRequest,
}: {
  open: boolean;
  onClose: () => void;
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const runChat = useAction(api.requestAnalysis.chat);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  async function ask(nextMessages: ChatMessage[]) {
    setLoading(true);
    setError(null);
    try {
      const result = await runChat({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      });
      setMessages([...nextMessages, { role: "assistant", content: result.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'analyse IA a échoué.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || started) return;
    const first: ChatMessage[] = [
      {
        role: "user",
        hidden: true,
        content:
          "Fais une analyse manager complète de toutes les demandes : priorités, demandes à planifier, regroupements possibles, journées chargées, encadrants disponibles ou déjà assignés, et prochaines actions concrètes.",
      },
    ];
    setStarted(true);
    setMessages(first);
    void ask(first);
  }, [open, started]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % ANALYSIS_LOADING_MESSAGES.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function submitMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setInput("");
    setMessages(nextMessages);
    await ask(nextMessages);
  }

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
      bodyClassName="flex flex-col gap-4"
      footer={
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitMessage();
              }
            }}
            rows={2}
            placeholder="Pose une question : quelles collectes regrouper cette semaine ? Qui est déjà assigné ?"
            className="min-h-12 flex-1 resize-none rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => void submitMessage()}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        {messages.filter((message) => !message.hidden).map((message, index) => (
          <ChatBubble
            key={`${message.role}-${index}`}
            message={message}
            requests={requests}
            onOpenRequest={onOpenRequest}
          />
        ))}
        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span
              key={loadingStep}
              className="inline-block animate-[crm-text-flip_420ms_cubic-bezier(0.22,1,0.36,1)]"
            >
              {ANALYSIS_LOADING_MESSAGES[loadingStep]}
            </span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function ChatBubble({
  message,
  requests,
  onOpenRequest,
}: {
  message: ChatMessage;
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          mine
            ? "bg-brand-500 text-white"
            : "border border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-200"
        }`}
      >
        {mine ? message.content : <LinkedAssistantText text={message.content} requests={requests} onOpenRequest={onOpenRequest} />}
      </div>
    </div>
  );
}

function LinkedAssistantText({
  text,
  requests,
  onOpenRequest,
}: {
  text: string;
  requests: Doc<"requests">[];
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const byReference = new Map(
    requests
      .filter((request) => Boolean(request.reference))
      .map((request) => [request.reference as string, request]),
  );
  const lines = text.split("\n").filter((line) => line.trim() !== "---");
  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => (
        <MarkdownLine
          key={lineIndex}
          line={line}
          byReference={byReference}
          onOpenRequest={onOpenRequest}
        />
      ))}
    </div>
  );
}

function MarkdownLine({
  line,
  byReference,
  onOpenRequest,
}: {
  line: string;
  byReference: Map<string, Doc<"requests">>;
  onOpenRequest: (id: Id<"requests">) => void;
}) {
  const trimmed = line.trim();
  if (!trimmed) return <div className="h-2" />;

  const heading = trimmed.match(/^(#{1,4})\s*(.*)$/);
  if (heading) {
    const level = heading[1].length;
    const content = heading[2].replace(/^\d+\)\s*/, "");
    return (
      <p
        className={
          level <= 2
            ? "pt-2 text-base font-bold text-zinc-100"
            : "pt-1 text-sm font-bold text-zinc-100"
        }
      >
        {renderInlineMarkdown(content, byReference, onOpenRequest)}
      </p>
    );
  }

  const bullet = trimmed.match(/^[-*]\s+(.*)$/);
  if (bullet) {
    return (
      <div className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
        <p className="min-w-0 text-sm leading-6 text-zinc-300">
          {renderInlineMarkdown(bullet[1], byReference, onOpenRequest)}
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm leading-6 text-zinc-300">
      {renderInlineMarkdown(trimmed, byReference, onOpenRequest)}
    </p>
  );
}

function renderInlineMarkdown(
  text: string,
  byReference: Map<string, Doc<"requests">>,
  onOpenRequest: (id: Id<"requests">) => void,
) {
  return text.split(/(\*\*[^*]+\*\*|#[0-9A-Za-z]{6})/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const reference = part.startsWith("#") ? part.slice(1) : "";
    const request = reference ? byReference.get(reference) : undefined;
    if (request) {
      const fullName = [request.customer.lastName, request.customer.firstName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={() => onOpenRequest(request._id)}
          className="mx-0.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-300 transition hover:bg-brand-500/20"
        >
          {fullName && <span className="font-semibold">{fullName} </span>}
          {part}
        </button>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function countForTab(requests: Doc<"requests">[], tab: Tab): number {
  if (tab === "closed")
    return requests.filter((r) => r.outcome !== "open").length;
  return requests.filter(
    (r) => r.outcome === "open" && r.complete === (tab === "complete"),
  ).length;
}

function matchesRequestSearch(
  request: Doc<"requests">,
  query: string,
  assignee?: string,
): boolean {
  if (!query) return true;

  const haystack = [
    request.reference,
    request.customer.firstName,
    request.customer.lastName,
    `${request.customer.firstName ?? ""} ${request.customer.lastName ?? ""}`.trim(),
    `${request.customer.lastName ?? ""} ${request.customer.firstName ?? ""}`.trim(),
    request.customer.email,
    request.customer.phone,
    request.customer.address,
    request.customer.postalCode,
    request.customer.city,
    request.collecte?.collectAddress?.address,
    request.collecte?.collectAddress?.postalCode,
    request.collecte?.collectAddress?.city,
    request.article?.articleTitle,
    request.livraison?.articleTitle,
    request.livraison?.deliveryAddress?.address,
    request.livraison?.deliveryAddress?.postalCode,
    request.livraison?.deliveryAddress?.city,
    request.livraison?.reference,
    request.velo?.bikeType,
    request.velo?.service,
    request.velo?.brand,
    request.velo?.description,
    assignee,
    request.site,
    TYPE_LABELS[request.type],
    request.type,
    requestSummary(request),
    ...(request.aerogommage ?? []).flatMap((item) => [
      item.objectType,
      item.label,
      item.woodType,
      item.coating,
      item.coatingOther,
      item.comment,
    ]),
    ...(request.articles ?? []).flatMap((item) => [
      item.articleTitle,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr-FR");

  return haystack.includes(query);
}

function requestSummary(r: Doc<"requests">): string {
  switch (r.type) {
    case "aerogommage": {
      const items = r.aerogommage ?? [];
      if (items.length === 0) return "Aérogommage";
      if (items.length > 1) return `${items.length} objets`;
      const objectType = items[0].objectType?.trim();
      if (objectType === "Autre (veuillez préciser)") return "Autre";
      return objectType || items[0].label?.trim() || "1 objet";
    }
    case "collecte": {
      const ca = r.collecte?.collectAddress;
      return (
        [ca?.postalCode, ca?.city].filter(Boolean).join(" ") ||
        "Collecte à domicile"
      );
    }
    case "article":
      if (r.articles && r.articles.length > 1) {
        return `${r.articles.length} articles réservés`;
      }
      return r.article?.articleTitle ?? "Réservation article";
    case "velo":
      return (
        [r.velo?.bikeType, r.velo?.service].filter(Boolean).join(" · ") ||
        "Atelier vélo"
      );
    case "livraison":
      return (
        r.livraison?.articleTitle ||
        [r.livraison?.deliveryAddress?.postalCode, r.livraison?.deliveryAddress?.city]
          .filter(Boolean)
          .join(" ") ||
        "Livraison article"
      );
    default:
      return "";
  }
}

function TypeFilter({
  value,
  onChange,
}: {
  value: RequestType | null;
  onChange: (v: RequestType | null) => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-1">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          value === null
            ? "bg-[var(--crm-surface-3)] text-zinc-100"
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
      className="h-9 w-[150px] rounded-xl bg-[var(--crm-surface-2)] px-3 text-xs font-medium text-zinc-300"
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
      className="h-9 w-[180px] rounded-xl bg-[var(--crm-surface-2)] px-3 text-xs font-medium text-zinc-300"
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

/** Filtre sur l'étape de process en cours (dernière étape cochée). */
function StepFilter({
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
      className="h-9 w-[200px] rounded-xl bg-[var(--crm-surface-2)] px-3 text-xs font-medium text-zinc-300"
    >
      <option value="">Toutes les étapes</option>
      {PROCESS_STEP_OPTIONS.map((step) => (
        <option key={step} value={step}>
          {step}
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
      className="h-9 w-[140px] rounded-xl bg-[var(--crm-surface-2)] px-3 text-xs font-medium text-zinc-300"
    >
      <option value="desc">Plus récent</option>
      <option value="asc">Plus ancien</option>
    </Select>
  );
}

function SearchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher par nom, prénom, référence, email, objet..."
        className="h-10 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}
