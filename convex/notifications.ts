import { mutation, query } from "./_generated/server";
import { requireStaff } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
    return notifications;
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read_and_createdAt", (q) => q.eq("read", false))
      .collect();
    return unread.length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read_and_createdAt", (q) => q.eq("read", false))
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { read: true }),
      ),
    );
  },
});
