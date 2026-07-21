import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type ViewerRole = "client" | "staff";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function MessageThread({
  requestId,
  viewerRole,
  theme = "light",
}: {
  requestId: Id<"requests">;
  viewerRole: ViewerRole;
  theme?: "light" | "dark";
}) {
  const messages = useQuery(api.messages.listForRequest, { requestId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const markRead = useMutation(api.messages.markRead);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Conversation pour laquelle on s'est déjà calé en bas : sert à distinguer
  // la première ouverture (saut instantané) d'un nouveau message (défilement
  // animé).
  const pinnedFor = useRef<Id<"requests"> | null>(null);

  const dark = theme === "dark";

  // Mark the conversation as read whenever new messages from the other side arrive.
  const unreadFromOther = useMemo(
    () =>
      (messages ?? []).some((m) =>
        viewerRole === "client"
          ? m.senderRole === "staff" && !m.readByClientAt
          : m.senderRole === "client" && !m.readByStaffAt,
      ),
    [messages, viewerRole],
  );

  useEffect(() => {
    if (unreadFromOther) void markRead({ requestId, as: viewerRole });
  }, [unreadFromOther, requestId, markRead, viewerRole]);

  // On garde le fil collé à son dernier message, mais en défilant UNIQUEMENT le
  // conteneur des messages — jamais la page. `scrollIntoView` remontait à tous
  // les ancêtres scrollables et faisait sauter toute la page à l'ouverture d'une
  // conversation. À la première ouverture, on se cale en bas d'un coup (sans
  // animation) ; ensuite, un nouveau message défile en douceur.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || messages === undefined) return;
    const isInitial = pinnedFor.current !== requestId;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: isInitial ? "auto" : "smooth",
    });
    pinnedFor.current = requestId;
  }, [messages?.length, requestId]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setBody("");
    try {
      await sendMessage({ requestId, body: trimmed, as: viewerRole });
    } catch {
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }

  const surface = dark
    ? "border-[var(--crm-border)] bg-[var(--crm-surface)]"
    : "border-zinc-200 bg-white";
  const mineBubble = dark ? "bg-brand-500 text-white" : "bg-brand-500 text-white";
  const theirBubble = dark
    ? "bg-[var(--crm-surface-2)] text-zinc-100"
    : "bg-zinc-100 text-zinc-900";

  let lastDay = "";

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-2xl border ${surface}`}>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className={`h-5 w-5 animate-spin ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
          </div>
        ) : messages.length === 0 ? (
          <p className={`py-10 text-center text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
            Aucun message pour le moment. Écrivez le premier message ci-dessous.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === viewerRole;
            const day = formatDay(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m._id}>
                {showDay && (
                  <p
                    className={`my-3 text-center text-[11px] font-medium uppercase tracking-wide ${
                      dark ? "text-zinc-600" : "text-zinc-400"
                    }`}
                  >
                    {day}
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[78%]">
                    {!mine && (
                      <p className={`mb-0.5 px-1 text-[11px] font-medium ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
                        {viewerRole === "client" && m.senderRole === "staff"
                          ? "Recyclerie"
                          : m.senderName}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? mineBubble : theirBubble}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                    <div
                      className={`mt-0.5 flex items-center gap-1 px-1 text-[10px] ${
                        mine ? "justify-end" : "justify-start"
                      } ${dark ? "text-zinc-500" : "text-zinc-400"}`}
                    >
                      <span>{formatTime(m.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`flex items-end gap-2 border-t p-3 ${dark ? "border-[var(--crm-border)]" : "border-zinc-100"}`}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          placeholder="Écrivez votre message…"
          className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            dark
              ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-100 placeholder-zinc-500"
              : "border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400"
          }`}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:opacity-90 disabled:opacity-40"
          aria-label="Envoyer"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
