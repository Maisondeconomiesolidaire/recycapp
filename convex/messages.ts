import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { isStaffIdentity, requireStaff, requireUser } from "./lib";
import type { Doc, Id } from "./_generated/dataModel";

async function loadRequestForParticipant(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"requests">,
) {
  const identity = await requireUser(ctx);
  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Demande introuvable.");
  const staff = isStaffIdentity(identity);
  if (!staff && request.userId !== identity.subject) {
    throw new Error("Accès refusé à cette conversation.");
  }
  return { identity, request, staff };
}

function serializeMessage(message: Doc<"messages">) {
  return {
    _id: message._id,
    senderRole: message.senderRole,
    senderName: message.senderName,
    body: message.body,
    createdAt: message.createdAt,
    readByClientAt: message.readByClientAt ?? null,
    readByStaffAt: message.readByStaffAt ?? null,
  };
}

export const listForRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const request = await ctx.db.get(requestId);
    if (!request) return [];
    if (!isStaffIdentity(identity) && request.userId !== identity.subject) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
      .collect();
    return messages.sort((a, b) => a.createdAt - b.createdAt).map(serializeMessage);
  },
});

export const sendMessage = mutation({
  args: { requestId: v.id("requests"), body: v.string() },
  handler: async (ctx, { requestId, body }) => {
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Message vide.");
    const { identity, request, staff } = await loadRequestForParticipant(ctx, requestId);

    let senderName: string;
    if (staff) {
      senderName = identity.name ?? identity.email ?? "Administrateur";
    } else {
      const profile = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .unique();
      senderName =
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
        identity.name ||
        `${request.customer.firstName} ${request.customer.lastName}`.trim() ||
        "Client";
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      requestId,
      senderRole: staff ? "staff" : "client",
      senderName,
      senderClerkId: identity.subject,
      body: trimmed,
      createdAt: now,
      // Le message est lu par son auteur d'office.
      readByStaffAt: staff ? now : undefined,
      readByClientAt: staff ? undefined : now,
    });

    // Notifier le staff quand un client écrit.
    if (!staff) {
      await ctx.db.insert("notifications", {
        kind: "new_message",
        title: "Nouveau message client",
        requestId,
        requestType: request.type,
        customerName: `${request.customer.firstName} ${request.customer.lastName}`.trim(),
        read: false,
        createdAt: now,
      });
    }

    return messageId;
  },
});

export const markRead = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const { staff } = await loadRequestForParticipant(ctx, requestId);
    const now = Date.now();
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
      .collect();

    await Promise.all(
      messages.map((m) => {
        if (staff && m.senderRole === "client" && !m.readByStaffAt) {
          return ctx.db.patch(m._id, { readByStaffAt: now });
        }
        if (!staff && m.senderRole === "staff" && !m.readByClientAt) {
          return ctx.db.patch(m._id, { readByClientAt: now });
        }
        return Promise.resolve();
      }),
    );
  },
});

/** Badge client : nombre de messages staff non lus, toutes demandes confondues. */
export const myUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();
    let count = 0;
    for (const request of requests) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_requestId", (q) => q.eq("requestId", request._id))
        .collect();
      count += messages.filter((m) => m.senderRole === "staff" && !m.readByClientAt).length;
    }
    return count;
  },
});

/** Liste des conversations côté CRM (une par demande contenant des messages). */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const messages = await ctx.db.query("messages").withIndex("by_createdAt").collect();

    const byRequest = new Map<
      Id<"requests">,
      { last: Doc<"messages">; total: number; unread: number }
    >();
    for (const message of messages) {
      const entry = byRequest.get(message.requestId);
      const isUnread = message.senderRole === "client" && !message.readByStaffAt;
      if (!entry) {
        byRequest.set(message.requestId, {
          last: message,
          total: 1,
          unread: isUnread ? 1 : 0,
        });
      } else {
        entry.total += 1;
        if (isUnread) entry.unread += 1;
        if (message.createdAt > entry.last.createdAt) entry.last = message;
      }
    }

    const conversations = await Promise.all(
      [...byRequest.entries()].map(async ([requestId, info]) => {
        const request = await ctx.db.get(requestId);
        if (!request) return null;
        return {
          requestId,
          requestType: request.type,
          reference: request.reference ?? null,
          customerName: `${request.customer.firstName} ${request.customer.lastName}`.trim(),
          lastBody: info.last.body,
          lastSenderRole: info.last.senderRole,
          lastAt: info.last.createdAt,
          total: info.total,
          unread: info.unread,
        };
      }),
    );

    return conversations
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => b.lastAt - a.lastAt);
  },
});

export const staffUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const messages = await ctx.db.query("messages").withIndex("by_createdAt").collect();
    return messages.filter((m) => m.senderRole === "client" && !m.readByStaffAt).length;
  },
});

/** Contexte d'une demande pour l'en-tête + récapitulatif côté CRM. */
export const getConversationContext = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    await requireStaff(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) return null;
    const c = request.customer;
    const collectAddress = request.collecte?.collectAddress;
    return {
      requestId: request._id,
      type: request.type,
      reference: request.reference ?? null,
      stage: request.stage,
      outcome: request.outcome,
      complete: request.complete,
      collecteType: request.collecteType ?? null,
      scheduledDate: request.scheduledDate ?? null,
      quoteAmount: request.quoteAmount ?? null,
      comment: request.comment ?? null,
      createdAt: request.createdAt,
      customerName: `${c.firstName} ${c.lastName}`.trim(),
      customerEmail: c.email,
      customerPhone: c.phone,
      customerAddress:
        [c.address, [c.postalCode, c.city].filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ") || null,
      collectAddress: collectAddress
        ? [
            collectAddress.address,
            [collectAddress.postalCode, collectAddress.city].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ")
        : null,
      // Articles réservés (type boutique) pour le récapitulatif.
      articles: (request.articles ?? []).map((a) => a.articleTitle),
    };
  },
});
