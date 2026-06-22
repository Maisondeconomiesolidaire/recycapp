import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStaff } from "./lib";

// ─── Sorties hors magasin ─────────────────────────────────────────────────────

export const createSortieHorsMagasin = mutation({
  args: {
    articleId: v.optional(v.id("articles")),
    articleTitle: v.string(),
    articleReference: v.optional(v.string()),
    price: v.number(),
    channel: v.union(
      v.literal("leboncoin"),
      v.literal("ebay"),
      v.literal("vinted"),
      v.literal("instagram"),
      v.literal("facebook"),
      v.literal("depot_vente"),
      v.literal("commande"),
      v.literal("autre"),
    ),
    buyerName: v.optional(v.string()),
    notes: v.optional(v.string()),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    if (args.articleId) {
      await ctx.db.patch(args.articleId, { status: "vendu" });
    }
    return await ctx.db.insert("sortiesHorsMagasin", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listSortiesHorsMagasin = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);
    return await ctx.db
      .query("sortiesHorsMagasin")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .order("desc")
      .collect();
  },
});

// ─── Sorties matières ─────────────────────────────────────────────────────────

export const createSortieMatiere = mutation({
  args: {
    materialType: v.string(),
    weightKg: v.number(),
    destination: v.string(),
    documentNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    origin: v.optional(v.string()),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db.insert("sortiesMatieres", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listSortiesMatieres = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);
    return await ctx.db
      .query("sortiesMatieres")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .order("desc")
      .collect();
  },
});

export const sortiesStats = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);
    const [hm, mat] = await Promise.all([
      ctx.db.query("sortiesHorsMagasin").withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate)).collect(),
      ctx.db.query("sortiesMatieres").withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate)).collect(),
    ]);

    const hmRevenue = hm.reduce((s, v) => s + v.price, 0);
    const matWeight = mat.reduce((s, v) => s + v.weightKg, 0);
    const byChannel: Record<string, number> = {};
    for (const v of hm) byChannel[v.channel] = (byChannel[v.channel] ?? 0) + v.price;
    const byMaterial: Record<string, number> = {};
    for (const v of mat) byMaterial[v.materialType] = (byMaterial[v.materialType] ?? 0) + v.weightKg;

    return {
      hmCount: hm.length,
      hmRevenue: Math.round(hmRevenue * 100) / 100,
      matCount: mat.length,
      matWeight: Math.round(matWeight * 10) / 10,
      byChannel,
      byMaterial,
    };
  },
});

// ─── Tournées ─────────────────────────────────────────────────────────────────

export const createTournee = mutation({
  args: {
    label: v.string(),
    date: v.number(),
    driverId: v.optional(v.id("teamMembers")),
    stops: v.array(v.object({
      requestId: v.optional(v.id("requests")),
      address: v.string(),
      contactName: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: v.union(v.literal("prevu"), v.literal("effectue"), v.literal("annule")),
      order: v.number(),
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db.insert("tournees", {
      ...args,
      status: "planifiee",
      createdAt: Date.now(),
    });
  },
});

export const updateTourneeStop = mutation({
  args: {
    tourneeId: v.id("tournees"),
    stopOrder: v.number(),
    status: v.union(v.literal("prevu"), v.literal("effectue"), v.literal("annule")),
  },
  handler: async (ctx, { tourneeId, stopOrder, status }) => {
    await requireStaff(ctx);
    const tournee = await ctx.db.get(tourneeId);
    if (!tournee) throw new Error("Tournée introuvable");
    const stops = tournee.stops.map((s) =>
      s.order === stopOrder ? { ...s, status } : s,
    );
    await ctx.db.patch(tourneeId, { stops });
  },
});

export const updateTourneeStatus = mutation({
  args: {
    tourneeId: v.id("tournees"),
    status: v.union(v.literal("planifiee"), v.literal("en_cours"), v.literal("terminee"), v.literal("annulee")),
  },
  handler: async (ctx, { tourneeId, status }) => {
    await requireStaff(ctx);
    await ctx.db.patch(tourneeId, { status });
  },
});

export const listTournees = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);
    const tournees = await ctx.db
      .query("tournees")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .order("desc")
      .collect();
    return await Promise.all(
      tournees.map(async (t) => {
        const driver = t.driverId ? await ctx.db.get(t.driverId) : null;
        return { ...t, driverName: driver?.name ?? null };
      }),
    );
  },
});

export const listUpcomingCollectes = query({
  handler: async (ctx) => {
    await requireStaff(ctx);
    const now = Date.now();
    return await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("type"), "collecte"))
      .filter((q) => q.eq(q.field("outcome"), "open"))
      .order("desc")
      .take(50);
  },
});
