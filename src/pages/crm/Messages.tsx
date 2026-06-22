import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowLeft, Loader2, Mail, MessageSquare, Phone } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MessageThread } from "../../components/MessageThread";

const TYPE_LABELS: Record<string, string> = {
  article: "Boutique",
  aerogommage: "Aérogommage",
  collecte: "Collecte",
  velo: "Vélo",
};

function formatAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function Messages() {
  const conversations = useQuery(api.messages.listConversations);
  const [selected, setSelected] = useState<Id<"requests"> | null>(null);
  const context = useQuery(
    api.messages.getConversationContext,
    selected ? { requestId: selected } : "skip",
  );

  // Auto-select the first conversation on desktop.
  useEffect(() => {
    if (selected === null && conversations && conversations.length > 0) {
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setSelected(conversations[0].requestId);
      }
    }
  }, [conversations, selected]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Relation client</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-100">Messages</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Échangez avec vos clients ; chaque conversation est rattachée à une demande.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <div className={`${selected ? "hidden lg:block" : "block"}`}>
          <div className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
            {conversations === undefined ? (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <MessageSquare className="mx-auto h-9 w-9 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-400">Aucune conversation pour le moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--crm-border)]">
                {conversations.map((c) => (
                  <button
                    key={c.requestId}
                    type="button"
                    onClick={() => setSelected(c.requestId)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--crm-surface-2)] ${
                      selected === c.requestId ? "bg-[var(--crm-surface-2)]" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {c.customerName
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-100">
                          {c.customerName || "Client"}
                        </p>
                        <span className="shrink-0 text-[11px] text-zinc-500">{formatAgo(c.lastAt)}</span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <span className="rounded bg-[var(--crm-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                          {TYPE_LABELS[c.requestType] ?? c.requestType}
                          {c.reference ? ` #${c.reference}` : ""}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {c.lastSenderRole === "staff" ? "Vous : " : ""}
                        {c.lastBody}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={`${selected ? "block" : "hidden lg:block"}`}>
          {selected && context ? (
            <div className="flex h-[70vh] flex-col">
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-[var(--crm-surface-2)] hover:text-zinc-100 lg:hidden"
                  aria-label="Retour"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-100">{context.customerName}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {TYPE_LABELS[context.type] ?? context.type}
                    {context.reference ? ` #${context.reference}` : ""}
                  </p>
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  {context.customerPhone && (
                    <a
                      href={`tel:${context.customerPhone}`}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {context.customerPhone}
                    </a>
                  )}
                  {context.customerEmail && (
                    <a
                      href={`mailto:${context.customerEmail}`}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {context.customerEmail}
                    </a>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <MessageThread requestId={selected} viewerRole="staff" theme="dark" />
              </div>
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center rounded-2xl border border-dashed border-[var(--crm-border)] bg-[var(--crm-surface)]">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-500">
                  Sélectionnez une conversation pour répondre.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
