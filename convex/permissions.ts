import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getCrmAccessForIdentity,
  isAdminIdentity,
  isStaffIdentity,
  requireAdmin,
  requireUser,
} from "./lib";

const grantValidator = v.object({
  pageKey: v.string(),
  actions: v.array(v.string()),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeGrants(grants: { pageKey: string; actions: string[] }[]) {
  return grants
    .map((grant) => ({
      pageKey: grant.pageKey.trim(),
      actions: Array.from(
        new Set(grant.actions.map((action) => action.trim()).filter(Boolean)),
      ),
    }))
    .filter((grant) => grant.pageKey && grant.actions.length > 0);
}

export const myAccess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    const access = await getCrmAccessForIdentity(ctx, identity);

    return {
      role: access.admin ? "admin" : access.staff ? "staff" : "none",
      isStaff: access.staff,
      isAdmin: access.admin,
      email: access.email,
      bootstrapMode: access.bootstrapMode,
      grants: access.grants,
    };
  },
});

export const listManaged = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [members, permissionRecords] = await Promise.all([
      ctx.db.query("teamMembers").order("desc").take(200),
      ctx.db.query("crmPermissions").order("desc").take(200),
    ]);
    const recordsByEmail = new Map(
      permissionRecords.map((record) => [record.email, record]),
    );
    const people = new Map<
      string,
      {
        email: string;
        name?: string;
        teamMemberId?: string;
        teamRole?: string;
        site?: "60" | "76";
        teamActive?: boolean;
        permissionActive?: boolean;
        grants: { pageKey: string; actions: string[] }[];
        updatedAt?: number;
      }
    >();

    for (const member of members) {
      const email = member.email ? normalizeEmail(member.email) : "";
      if (!email) continue;
      const record = recordsByEmail.get(email);
      people.set(email, {
        email,
        name: record?.name ?? member.name,
        teamMemberId: member._id,
        teamRole: member.role,
        site: member.site,
        teamActive: member.active,
        permissionActive: record?.active,
        grants: record?.grants ?? [],
        updatedAt: record?.updatedAt,
      });
    }

    for (const record of permissionRecords) {
      if (people.has(record.email)) continue;
      people.set(record.email, {
        email: record.email,
        name: record.name,
        permissionActive: record.active,
        grants: record.grants,
        updatedAt: record.updatedAt,
      });
    }

    return {
      people: Array.from(people.values()).sort((a, b) =>
        (a.name ?? a.email).localeCompare(b.name ?? b.email, "fr"),
      ),
    };
  },
});

export const upsert = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    active: v.boolean(),
    grants: v.array(grantValidator),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);
    if (!email) throw new Error("Email requis.");

    const existing = await ctx.db
      .query("crmPermissions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const payload = {
      email,
      name: args.name?.trim() || undefined,
      active: args.active,
      grants: normalizeGrants(args.grants),
      updatedAt: Date.now(),
      updatedBy: admin.email ?? admin.tokenIdentifier,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("crmPermissions", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("crmPermissions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const debugRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireUser(ctx);
    return {
      email: identity.email ?? null,
      isStaff: isStaffIdentity(identity),
      isAdmin: isAdminIdentity(identity),
    };
  },
});
