import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, Loader2, Mail, Send, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useUpload } from "../lib/useUpload";
import type { Id } from "../../convex/_generated/dataModel";

type ViewerRole = "client" | "staff";

/** Même limite que le serveur (`convex/messages.ts`). */
const MAX_IMAGES = 6;

/**
 * Photo en cours de préparation : l'aperçu s'affiche dès le dépôt, l'envoi au
 * stockage se fait en arrière-plan et fournit le `storageId`.
 */
type Attachment = {
  key: string;
  previewUrl: string;
  storageId?: Id<"_storage">;
  failed?: boolean;
};

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Les pièces jointes ne partent que du CRM : le portail client reste un
  // simple fil de texte.
  const canAttach = viewerRole === "staff";
  const upload = useUpload();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [attachError, setAttachError] = useState("");
  const uploading = attachments.some((item) => !item.storageId && !item.failed);

  function addFiles(files: FileList | File[] | null) {
    if (!canAttach || !files) return;
    const images = [...files].filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name));
    if (!images.length) {
      setAttachError("Seules les images peuvent être jointes.");
      return;
    }
    setAttachError("");
    setAttachments((current) => {
      const room = Math.max(0, MAX_IMAGES - current.length);
      if (images.length > room) setAttachError(`${MAX_IMAGES} photos au maximum par message.`);
      const accepted = images.slice(0, room).map((file) => {
        const key = `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2)}`;
        // L'envoi au stockage se poursuit après ce `setState` : la vignette est
        // visible immédiatement, le bouton d'envoi attend le `storageId`.
        void upload(file)
          .then((storageId) =>
            setAttachments((list) => list.map((item) => (item.key === key ? { ...item, storageId } : item))),
          )
          .catch(() => {
            setAttachError("Une photo n'a pas pu être envoyée.");
            setAttachments((list) => list.map((item) => (item.key === key ? { ...item, failed: true } : item)));
          });
        return { key, previewUrl: URL.createObjectURL(file) };
      });
      return [...current, ...accepted];
    });
  }

  function removeAttachment(key: string) {
    setAttachments((current) => {
      current.filter((item) => item.key === key).forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return current.filter((item) => item.key !== key);
    });
  }

  function clearAttachments() {
    setAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  }
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

  const images = attachments
    .map((item) => item.storageId)
    .filter((id): id is Id<"_storage"> => Boolean(id));
  // Une photo seule suffit : le serveur accepte un message sans texte s'il
  // porte des images.
  const canSend = (Boolean(body.trim()) || images.length > 0) && !sending && !uploading;

  async function sendNow() {
    const trimmed = body.trim();
    if (!canSend) return;
    setConfirmOpen(false);
    setSending(true);
    setBody("");
    try {
      await sendMessage({
        requestId,
        body: trimmed,
        images: images.length ? images : undefined,
        as: viewerRole,
      });
      clearAttachments();
    } catch {
      setBody(trimmed);
    } finally {
      setSending(false);
    }
  }

  /**
   * Côté CRM, chaque message part en email au client : on demande confirmation
   * avec l'aperçu du texte plutôt que de l'envoyer au premier clic. Côté
   * portail client, l'envoi reste direct (il ne déclenche pas d'email).
   */
  function handleSend() {
    if (!canSend) return;
    if (viewerRole === "staff") {
      setConfirmOpen(true);
      return;
    }
    void sendNow();
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
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${surface}`}
      onDragOver={canAttach ? (e) => { e.preventDefault(); setDragging(true); } : undefined}
      onDragLeave={canAttach ? (e) => { if (e.currentTarget === e.target) setDragging(false); } : undefined}
      onDrop={canAttach ? (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); } : undefined}
    >
      {/* Déposer une photo n'importe où sur la conversation la joint au
          message en préparation. */}
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-500 bg-brand-500/10">
          <p className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white">
            Déposez vos photos ici
          </p>
        </div>
      ) : null}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className={`h-5 w-5 animate-spin ${dark ? "text-zinc-500" : "text-zinc-400"}`} />
          </div>
        ) : messages.length === 0 ? (
          viewerRole === "staff" ? (
            // Chaque message du staff déclenche un email au client : on le dit
            // avant la première réponse, sinon la demande part en plusieurs
            // messages et le client reçoit autant d'emails.
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <Mail className={`h-6 w-6 ${dark ? "text-zinc-600" : "text-zinc-300"}`} />
              <p className={`text-sm font-semibold ${dark ? "text-zinc-300" : "text-zinc-600"}`}>
                Aucun message pour le moment.
              </p>
              <p
                className={`max-w-sm text-sm leading-relaxed ${
                  dark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                <strong className={dark ? "text-zinc-300" : "text-zinc-600"}>
                  Chaque message envoyé ici part par email au client.
                </strong>{" "}
                Écrivez donc l'intégralité de votre réponse dans un seul message :
                si vous la découpez en plusieurs envois, le client reçoit autant
                d'emails.
              </p>
            </div>
          ) : (
            <p className={`py-10 text-center text-sm ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
              Aucun message pour le moment. Écrivez le premier message ci-dessous.
            </p>
          )
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
                    {m.imageUrls?.length ? (
                      <div className={`mb-1 grid gap-1.5 ${m.imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                        {m.imageUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
                            <img
                              src={url}
                              alt="Photo jointe"
                              loading="lazy"
                              decoding="async"
                              className="max-h-64 w-full object-cover transition hover:opacity-90"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {m.body ? (
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? mineBubble : theirBubble}`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                    ) : null}
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

      {viewerRole === "staff" && (messages?.length ?? 0) > 0 ? (
        <p
          className={`flex items-center gap-1.5 border-t px-3 pt-2 text-[11px] ${
            dark
              ? "border-[var(--crm-border)] text-zinc-500"
              : "border-zinc-100 text-zinc-400"
          }`}
        >
          <Mail className="h-3.5 w-3.5 shrink-0" />
          Chaque envoi déclenche un email au client : regroupez toute votre
          réponse en un seul message.
        </p>
      ) : null}

      {canAttach && (attachments.length > 0 || attachError) ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
          {attachments.map((item) => (
            <div key={item.key} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--crm-border)]">
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
              {!item.storageId ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  {item.failed ? (
                    <X className="h-4 w-4 text-red-400" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  )}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeAttachment(item.key)}
                aria-label="Retirer cette photo"
                className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white transition hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {attachError ? <p className="text-[11px] text-amber-500">{attachError}</p> : null}
        </div>
      ) : null}

      <div
        className={`flex items-end gap-2 p-3 ${
          viewerRole === "staff" && (messages?.length ?? 0) > 0
            ? ""
            : `border-t ${dark ? "border-[var(--crm-border)]" : "border-zinc-100"}`
        }`}
      >
        {canAttach ? (
          <>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={attachments.length >= MAX_IMAGES}
              aria-label="Joindre des photos"
              title="Joindre des photos (ou glissez-les dans la conversation)"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-40 ${
                dark
                  ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-300 hover:text-white"
                  : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </>
        ) : null}
        <textarea
          onPaste={canAttach ? (e) => {
            const files = [...e.clipboardData.files].filter((file) => file.type.startsWith("image/"));
            if (files.length) { e.preventDefault(); addFiles(files); }
          } : undefined}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Côté CRM, « Entrée » passe à la ligne : un envoi accidentel
            // expédierait un email au client.
            if (viewerRole !== "staff" && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={
            viewerRole === "staff"
              ? "Écrivez votre message… (Entrée pour aller à la ligne)"
              : "Écrivez votre message…"
          }
          className={`max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            dark
              ? "border-[var(--crm-border)] bg-[var(--crm-surface-2)] text-zinc-100 placeholder-zinc-500"
              : "border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400"
          }`}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          title={uploading ? "Envoi des photos en cours…" : undefined}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:opacity-90 disabled:opacity-40"
          aria-label="Envoyer"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void sendNow()}
        title="Envoyer ce message au client ?"
        tone="primary"
        confirmLabel="Oui, envoyer"
        cancelLabel="Non"
        description={
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-zinc-300">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ce message sera envoyé par email au client. Vérifiez qu'il est
                complet : chaque envoi déclenche un email séparé.
              </span>
            </p>
            <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-sm text-zinc-100">
              {body.trim() || <span className="text-zinc-400">(aucun texte)</span>}
            </div>
            {attachments.length ? (
              <p className="text-zinc-400">
                {attachments.length === 1 ? "1 photo jointe" : `${attachments.length} photos jointes`}.
              </p>
            ) : null}
            <p className="text-zinc-400">Êtes-vous sûr(e) de vouloir l'envoyer ?</p>
          </div>
        }
      />
    </div>
  );
}
