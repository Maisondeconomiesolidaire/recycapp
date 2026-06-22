import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStaff } from "./lib";

const originValidator = v.union(
  v.literal("decheterie"),
  v.literal("domicile"),
  v.literal("apport"),
  v.literal("tournee"),
);

// ─── Arrivages ────────────────────────────────────────────────────────────────

export const createArrivage = mutation({
  args: {
    origin: originValidator,
    commune: v.optional(v.string()),
    date: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db.insert("arrivages", {
      ...args,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const closeArrivage = mutation({
  args: { arrivageId: v.id("arrivages") },
  handler: async (ctx, { arrivageId }) => {
    await requireStaff(ctx);
    await ctx.db.patch(arrivageId, { status: "closed" });
  },
});

export const listOpenArrivages = query({
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("arrivages").withIndex("by_status", (q) => q.eq("status", "open")).order("desc").collect();
  },
});

export const getArrivageWithItems = query({
  args: { arrivageId: v.id("arrivages") },
  handler: async (ctx, { arrivageId }) => {
    await requireStaff(ctx);
    const arrivage = await ctx.db.get(arrivageId);
    if (!arrivage) return null;
    const items = await ctx.db
      .query("arrivageItems")
      .withIndex("by_arrivage", (q) => q.eq("arrivageId", arrivageId))
      .order("desc")
      .collect();
    return { arrivage, items };
  },
});

// ─── Arrivage Items ───────────────────────────────────────────────────────────

function makeReference(category: string): string {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const cat = category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  return `${cat}-${ymd}-${rand}`;
}

const itemArgs = {
  arrivageId: v.optional(v.id("arrivages")),
  depotId: v.optional(v.id("depots")),
  date: v.number(),
  origin: originValidator,
  commune: v.optional(v.string()),
  category: v.string(),
  subcategory: v.optional(v.string()),
  flux: v.optional(v.string()),
  orientation: v.string(),
  weightKg: v.optional(v.number()),
  tare: v.optional(v.number()),
  quantity: v.number(),
  price: v.optional(v.number()),
  condition: v.optional(v.string()),
  labelInfo: v.optional(v.string()),
};

export const addItem = mutation({
  args: itemArgs,
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const reference = makeReference(args.category);

    const itemId = await ctx.db.insert("arrivageItems", {
      ...args,
      reference,
      createdAt: Date.now(),
    });

    return { itemId, reference };
  },
});

// Promote a staged arrivage item to a boutique article (staff validation step).
export const promoteToArticle = mutation({
  args: {
    itemId: v.id("arrivageItems"),
    title: v.optional(v.string()),
    price: v.optional(v.number()),
    condition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item introuvable");
    if (item.articleId) throw new Error("Déjà promu en boutique");

    const title = args.title ?? item.labelInfo?.trim() ?? `${item.category}${item.subcategory ? " – " + item.subcategory : ""}`;

    const articleId = await ctx.db.insert("articles", {
      title,
      description: "",
      price: args.price ?? item.price ?? 0,
      category: item.category,
      subcategory: item.subcategory,
      condition: args.condition ?? item.condition ?? "Bon état",
      internalReference: item.reference,
      gdrReference: item.reference,
      images: [],
      status: "attente",
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.itemId, { articleId });
    return { articleId };
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("arrivageItems") },
  handler: async (ctx, { itemId }) => {
    await requireStaff(ctx);
    const item = await ctx.db.get(itemId);
    if (!item) return;
    await ctx.db.delete(itemId);
  },
});

// ─── Dépôts ───────────────────────────────────────────────────────────────────

export const createDepot = mutation({
  args: {
    origin: originValidator,
    commune: v.optional(v.string()),
    date: v.number(),
    weightKg: v.optional(v.number()),
    defaultCategory: v.optional(v.string()),
    defaultSubcategory: v.optional(v.string()),
    defaultFlux: v.optional(v.string()),
    defaultOrientation: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const all = await ctx.db.query("depots").collect();
    const depotNumber = all.length + 1;
    return await ctx.db.insert("depots", {
      ...args,
      depotNumber,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const listPendingDepots = query({
  handler: async (ctx) => {
    await requireStaff(ctx);
    const depots = await ctx.db
      .query("depots")
      .filter((q) => q.neq(q.field("status"), "closed"))
      .order("desc")
      .collect();
    const result = await Promise.all(
      depots.map(async (d) => {
        const itemCount = (
          await ctx.db
            .query("arrivageItems")
            .withIndex("by_depot", (q) => q.eq("depotId", d._id))
            .collect()
        ).length;
        return { ...d, itemCount };
      }),
    );
    return result;
  },
});

export const getDepotWithItems = query({
  args: { depotId: v.id("depots") },
  handler: async (ctx, { depotId }) => {
    await requireStaff(ctx);
    const depot = await ctx.db.get(depotId);
    if (!depot) return null;
    const items = await ctx.db
      .query("arrivageItems")
      .withIndex("by_depot", (q) => q.eq("depotId", depotId))
      .order("desc")
      .collect();
    return { depot, items };
  },
});

export const closeDepot = mutation({
  args: { depotId: v.id("depots") },
  handler: async (ctx, { depotId }) => {
    await requireStaff(ctx);
    await ctx.db.patch(depotId, { status: "closed", closedAt: Date.now() });
  },
});

// ─── Historique ───────────────────────────────────────────────────────────────

export const listHistory = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);
    const arrivages = await ctx.db
      .query("arrivages")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .order("desc")
      .collect();

    const result = await Promise.all(
      arrivages.map(async (a) => {
        const items = await ctx.db
          .query("arrivageItems")
          .withIndex("by_arrivage", (q) => q.eq("arrivageId", a._id))
          .collect();
        return { ...a, items };
      }),
    );

    // Also fetch standalone items (no arrivageId) in the period
    const standaloneItems = await ctx.db
      .query("arrivageItems")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .filter((q) => q.eq(q.field("arrivageId"), undefined))
      .filter((q) => q.eq(q.field("depotId"), undefined))
      .order("desc")
      .collect();

    return { arrivages: result, standaloneItems };
  },
});

export const historyStats = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    await requireStaff(ctx);

    const items = await ctx.db
      .query("arrivageItems")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .collect();

    const totalWeight = items.reduce((s, i) => s + (i.weightKg ?? 0) * i.quantity, 0);
    const totalValue = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
    const totalArticles = items.reduce((s, i) => s + i.quantity, 0);

    // Use accumulators with plain-string keys for internal computation only
    const catMap: Record<string, number> = {};
    const orientMap: Record<string, number> = {};
    const fluxMap: Record<string, number> = {};
    const originMap: Record<string, number> = {};

    for (const item of items) {
      catMap[item.category] = (catMap[item.category] ?? 0) + item.quantity;
      orientMap[item.orientation] = (orientMap[item.orientation] ?? 0) + item.quantity;
      if (item.flux) fluxMap[item.flux] = (fluxMap[item.flux] ?? 0) + item.quantity;
      originMap[item.origin] = (originMap[item.origin] ?? 0) + item.quantity;
    }

    // Convert to arrays so we never use non-ASCII strings as Convex field names
    const toEntries = (m: Record<string, number>) =>
      Object.entries(m).map(([label, count]) => ({ label, count }));

    const arrivageCount = await ctx.db
      .query("arrivages")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .collect()
      .then((a) => a.length);

    return {
      arrivageCount,
      totalArticles,
      totalWeight: Math.round(totalWeight * 10) / 10,
      totalValue: Math.round(totalValue * 100) / 100,
      byCategory: toEntries(catMap),
      byOrientation: toEntries(orientMap),
      byFlux: toEntries(fluxMap),
      byOrigin: toEntries(originMap),
    };
  },
});
