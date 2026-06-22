import { v } from "convex/values";
import { action, env, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireStaff } from "./lib";
import type { Id } from "./_generated/dataModel";

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
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
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

export const getTourneeForOptimization = internalQuery({
  args: { tourneeId: v.id("tournees") },
  handler: async (ctx, { tourneeId }) => {
    return await ctx.db.get(tourneeId);
  },
});

export const applyTourneeOptimization = internalMutation({
  args: {
    tourneeId: v.id("tournees"),
    orderedStops: v.array(v.object({
      requestId: v.optional(v.id("requests")),
      address: v.string(),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      contactName: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: v.union(v.literal("prevu"), v.literal("effectue"), v.literal("annule")),
      order: v.number(),
    })),
    optimizedAt: v.number(),
    estimatedDistanceMeters: v.number(),
    estimatedDurationSeconds: v.number(),
  },
  handler: async (
    ctx,
    {
      tourneeId,
      orderedStops,
      optimizedAt,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
    },
  ) => {
    await ctx.db.patch(tourneeId, {
      stops: orderedStops,
      optimizedAt,
      estimatedDistanceMeters,
      estimatedDurationSeconds,
    });
  },
});

async function geocodeStop(address: string, accessToken: string) {
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", address);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "fr");
  url.searchParams.set("country", "FR");
  url.searchParams.set("autocomplete", "false");

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message || "Géocodage Mapbox impossible.");
  }

  const coordinates = payload.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    throw new Error(`Adresse introuvable ou imprécise : ${address}`);
  }

  return { longitude: coordinates[0], latitude: coordinates[1] };
}

type OptimizableStop = {
  stop: {
    requestId?: Id<"requests">;
    address: string;
    latitude?: number;
    longitude?: number;
    contactName?: string;
    contactPhone?: string;
    notes?: string;
    status: "prevu" | "effectue" | "annule";
    order: number;
  };
  longitude: number;
  latitude: number;
};

export const optimizeTournee = action({
  args: { tourneeId: v.id("tournees") },
  handler: async (ctx, { tourneeId }) => {
    await requireStaff(ctx);
    const accessToken = env.MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MAPBOX_ACCESS_TOKEN n'est pas configurée côté Convex.");
    }

    const tournee = await ctx.runQuery(internal.sorties.getTourneeForOptimization, {
      tourneeId,
    });

    if (!tournee) {
      throw new Error("Tournée introuvable.");
    }
    if (tournee.stops.length < 3) {
      throw new Error("Il faut au moins 3 arrêts pour optimiser une tournée.");
    }
    if (tournee.stops.length > 12) {
      throw new Error("Mapbox Optimization v1 accepte au maximum 12 arrêts.");
    }

    const geocodedStops: OptimizableStop[] = [];
    for (const stop of tournee.stops) {
      const address = stop.address.trim();
      if (!address) {
        throw new Error("Chaque arrêt doit avoir une adresse avant optimisation.");
      }
      const coordinates = await geocodeStop(address, accessToken);
      geocodedStops.push({ stop, ...coordinates });
    }

    const coordinatesPath = geocodedStops
      .map(({ longitude, latitude }) => `${longitude},${latitude}`)
      .join(";");

    const optimizationUrl = new URL(
      `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinatesPath}`,
    );
    optimizationUrl.searchParams.set("access_token", accessToken);
    optimizationUrl.searchParams.set("source", "first");
    optimizationUrl.searchParams.set("destination", "last");
    optimizationUrl.searchParams.set("roundtrip", "false");
    optimizationUrl.searchParams.set("overview", "full");
    optimizationUrl.searchParams.set("geometries", "geojson");

    const response = await fetch(optimizationUrl.toString());
    const payload = (await response.json()) as {
      code?: string;
      message?: string;
      waypoints?: Array<{ waypoint_index?: number }>;
      trips?: Array<{ distance?: number; duration?: number }>;
    };

    if (!response.ok || payload.code !== "Ok" || !payload.waypoints?.length) {
      throw new Error(
        payload.message || "Optimisation Mapbox impossible pour cette tournée.",
      );
    }

    const orderedStops = payload.waypoints
      .map((waypoint, inputIndex) => ({
        stop: geocodedStops[inputIndex].stop,
        waypointIndex: waypoint.waypoint_index ?? Number.MAX_SAFE_INTEGER,
        longitude: geocodedStops[inputIndex].longitude,
        latitude: geocodedStops[inputIndex].latitude,
      }))
      .sort((a, b) => a.waypointIndex - b.waypointIndex)
      .map(({ stop, longitude, latitude }, index) => ({
        ...stop,
        longitude,
        latitude,
        order: index + 1,
      }));

    const distanceMeters = Math.round(payload.trips?.[0]?.distance ?? 0);
    const durationSeconds = Math.round(payload.trips?.[0]?.duration ?? 0);

    await ctx.runMutation(internal.sorties.applyTourneeOptimization, {
      tourneeId,
      orderedStops,
      optimizedAt: Date.now(),
      estimatedDistanceMeters: distanceMeters,
      estimatedDurationSeconds: durationSeconds,
    });

    return {
      stopCount: orderedStops.length,
      distanceMeters,
      durationSeconds,
    };
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
    return await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("type"), "collecte"))
      .filter((q) => q.eq(q.field("outcome"), "open"))
      .order("desc")
      .take(50);
  },
});
