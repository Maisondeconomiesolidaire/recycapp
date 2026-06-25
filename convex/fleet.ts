import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAnyCrmPermission, requireCrmPermission } from "./lib";

const vehicleKind = v.union(
  v.literal("utilitaire"),
  v.literal("camionnette"),
  v.literal("camion"),
  v.literal("voiture"),
);

/** Deux timestamps tombent-ils le même jour (UTC) ? */
function sameUtcDay(a: number, b: number): boolean {
  return Math.floor(a / 86_400_000) === Math.floor(b / 86_400_000);
}

/**
 * Raison d'indisponibilité d'un véhicule à une date donnée, sinon `null`.
 * - Occupé s'il est affecté à une collecte/livraison planifiée ce jour-là.
 * - Occupé s'il est en tournée (en cours, ou planifiée ce jour-là) tant que
 *   la tournée n'est pas terminée ou annulée.
 */
export async function vehicleBusyReason(
  ctx: QueryCtx | MutationCtx,
  vehicleId: Id<"vehicles">,
  date: number,
  opts: {
    excludeRequestId?: Id<"requests">;
    excludeTourneeId?: Id<"tournees">;
  } = {},
): Promise<string | null> {
  const requests = await ctx.db
    .query("requests")
    .withIndex("by_assignedVehicle", (q) => q.eq("assignedVehicle", vehicleId))
    .collect();
  for (const request of requests) {
    if (opts.excludeRequestId && request._id === opts.excludeRequestId) continue;
    if (
      request.outcome === "open" &&
      request.scheduledDate &&
      sameUtcDay(request.scheduledDate, date)
    ) {
      return `Affecté à une collecte planifiée ce jour (#${request.reference ?? "?"})`;
    }
  }

  const tournees = await ctx.db
    .query("tournees")
    .withIndex("by_fleetVehicle", (q) => q.eq("fleetVehicleId", vehicleId))
    .collect();
  for (const tournee of tournees) {
    if (opts.excludeTourneeId && tournee._id === opts.excludeTourneeId) continue;
    if (tournee.status === "terminee" || tournee.status === "annulee") continue;
    if (tournee.status === "en_cours" || sameUtcDay(tournee.date, date)) {
      return `En tournée (${tournee.label})`;
    }
  }

  return null;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCrmPermission(ctx, "flotte", "read");
    const vehicles = await ctx.db.query("vehicles").order("desc").collect();
    const now = Date.now();
    return await Promise.all(
      vehicles.map(async (vehicle) => {
        const reason = vehicle.active
          ? await vehicleBusyReason(ctx, vehicle._id, now)
          : null;
        const status: "disponible" | "sur_collecte" | "en_tournee" | "inactif" =
          !vehicle.active
            ? "inactif"
            : reason?.startsWith("En tournée")
              ? "en_tournee"
              : reason
                ? "sur_collecte"
                : "disponible";
        return { ...vehicle, status, reason };
      }),
    );
  },
});

/** Véhicules actifs disponibles à une date (pour les sélecteurs d'affectation). */
export const availableOn = query({
  args: {
    date: v.number(),
    includeVehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, { date, includeVehicleId }) => {
    await requireAnyCrmPermission(ctx, [
      ["flotte", "read"],
      ["tournees", "read"],
      ["demandes", "read"],
    ]);
    const vehicles = (await ctx.db.query("vehicles").collect()).filter(
      (vehicle) => vehicle.active || vehicle._id === includeVehicleId,
    );
    const result = [];
    for (const vehicle of vehicles) {
      const isCurrent = vehicle._id === includeVehicleId;
      const reason = isCurrent
        ? null
        : await vehicleBusyReason(ctx, vehicle._id, date);
      if (reason && !isCurrent) continue;
      result.push({
        _id: vehicle._id,
        name: vehicle.name,
        plate: vehicle.plate ?? null,
        kind: vehicle.kind,
      });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    plate: v.optional(v.string()),
    kind: vehicleKind,
    capacityM3: v.optional(v.number()),
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCrmPermission(ctx, "flotte", "create");
    return await ctx.db.insert("vehicles", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    name: v.string(),
    plate: v.optional(v.string()),
    kind: vehicleKind,
    capacityM3: v.optional(v.number()),
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
    active: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireCrmPermission(ctx, "flotte", "update");
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, { id }) => {
    await requireCrmPermission(ctx, "flotte", "delete");
    await ctx.db.delete(id);
  },
});
