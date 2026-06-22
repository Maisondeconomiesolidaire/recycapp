import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireUser } from "./lib";
import type { Id } from "./_generated/dataModel";

async function getProfileByClerkId(ctx: QueryCtx | MutationCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

/**
 * Appelée à la connexion : crée le profil s'il n'existe pas et rattache
 * automatiquement les demandes passées dont l'email correspond.
 */
export const syncProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const clerkId = identity.subject;
    const email = (identity.email ?? "").toLowerCase();

    let profile = await getProfileByClerkId(ctx, clerkId);
    const now = Date.now();

    if (!profile) {
      const profileId = await ctx.db.insert("users", {
        clerkId,
        email,
        firstName: identity.givenName ?? undefined,
        lastName: identity.familyName ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      profile = await ctx.db.get(profileId);
    } else if (email && profile.email !== email) {
      await ctx.db.patch(profile._id, { email, updatedAt: now });
    }

    // Rattacher les demandes existantes créées sans compte (par email).
    if (email) {
      const candidates = await ctx.db.query("requests").collect();
      await Promise.all(
        candidates
          .filter((r) => !r.userId && r.customer.email?.toLowerCase() === email)
          .map((r) => ctx.db.patch(r._id, { userId: clerkId })),
      );
    }

    return profile;
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await getProfileByClerkId(ctx, identity.subject);
  },
});

export const updateMyProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    const profile = await getProfileByClerkId(ctx, identity.subject);
    if (!profile) throw new Error("Profil introuvable.");
    await ctx.db.patch(profile._id, { ...args, updatedAt: Date.now() });
  },
});

const PROGRESS_LABELS: Record<string, string> = {
  nouveau: "Demande reçue",
  validation: "En cours de validation",
  planifie: "Planifiée",
};

export const listMyRequests = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("aerogommage"),
        v.literal("collecte"),
        v.literal("article"),
        v.literal("velo"),
      ),
    ),
  },
  handler: async (ctx, { type }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    const filtered = type ? requests.filter((r) => r.type === type) : requests;

    return await Promise.all(
      filtered.map(async (r) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_requestId", (q) => q.eq("requestId", r._id))
          .collect();
        const unread = messages.filter(
          (m) => m.senderRole === "staff" && !m.readByClientAt,
        ).length;
        return {
          _id: r._id,
          type: r.type,
          reference: r.reference ?? null,
          stage: r.stage,
          outcome: r.outcome,
          stageLabel: PROGRESS_LABELS[r.stage] ?? r.stage,
          complete: r.complete,
          processSteps: r.processSteps,
          completedSteps: r.completedSteps,
          scheduledDate: r.scheduledDate ?? null,
          quoteAmount: r.quoteAmount ?? null,
          collecteType: r.collecteType ?? null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          unreadMessages: unread,
          messageCount: messages.length,
        };
      }),
    );
  },
});

async function findTrackingTokenForRequest(
  ctx: QueryCtx,
  requestId: Id<"requests">,
) {
  const link = await ctx.db
    .query("tourneeTrackingLinks")
    .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
    .first();
  if (!link) return null;
  const tournee = await ctx.db.get(link.tourneeId);
  return {
    shareToken: link.shareToken,
    tourneeStatus: tournee?.status ?? null,
    tourneeDate: tournee?.date ?? null,
  };
}

export const getMyRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const request = await ctx.db.get(requestId);
    if (!request || request.userId !== identity.subject) return null;

    const tracking =
      request.type === "collecte" ? await findTrackingTokenForRequest(ctx, requestId) : null;

    return {
      _id: request._id,
      type: request.type,
      reference: request.reference ?? null,
      stage: request.stage,
      stageLabel: PROGRESS_LABELS[request.stage] ?? request.stage,
      outcome: request.outcome,
      complete: request.complete,
      processSteps: request.processSteps,
      completedSteps: request.completedSteps,
      scheduledDate: request.scheduledDate ?? null,
      quoteAmount: request.quoteAmount ?? null,
      quoteDetails: request.quoteDetails ?? null,
      collecteType: request.collecteType ?? null,
      comment: request.comment ?? null,
      customer: request.customer,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      tracking,
    };
  },
});
