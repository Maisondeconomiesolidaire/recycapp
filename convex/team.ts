import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireStaff } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("teamMembers").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db.insert("teamMembers", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("teamMembers"),
    name: v.string(),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    site: v.optional(v.union(v.literal("60"), v.literal("76"))),
    active: v.boolean(),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireStaff(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const get = query({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    const member = await ctx.db.get(id);
    if (!member) return null;

    const requests = (await ctx.db.query("requests").order("desc").collect())
      .filter((request) => request.assignedTo === id)
      .slice(0, 100);

    return {
      member,
      requests: requests.map((request) => ({
        _id: request._id,
        type: request.type,
        collecteType: request.collecteType,
        outcome: request.outcome,
        createdAt: request.createdAt,
        customerName: `${request.customer.firstName} ${request.customer.lastName}`.trim(),
      })),
    };
  },
});

export const remove = mutation({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, { id }) => {
    await requireStaff(ctx);
    await ctx.db.delete(id);
  },
});
