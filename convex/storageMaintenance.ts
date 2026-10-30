// TEMPORAIRE — rattrapage du stockage (recompression des photos, orphelins).
// À supprimer et redéployer une fois l'opération terminée.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const photoTable = v.union(v.literal("klydeItems"), v.literal("btMaterials"));

export const photoInventory = internalQuery({
  args: { table: photoTable },
  handler: async (ctx, { table }) => {
    const rows = await ctx.db.query(table).collect();
    return await Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        photos: await Promise.all(
          row.photos.map(async (storageId) => {
            const meta = await ctx.db.system.get("_storage", storageId);
            return {
              storageId,
              size: meta?.size ?? null,
              contentType: meta?.contentType ?? null,
              url: await ctx.storage.getUrl(storageId),
            };
          }),
        ),
      })),
    );
  },
});

export const uploadUrls = internalMutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    const urls: string[] = [];
    for (let i = 0; i < count; i++) urls.push(await ctx.storage.generateUploadUrl());
    return urls;
  },
});

/**
 * Remplace des photos par leur version recompressée. Une photo que la fiche ne
 * contient plus (modifiée entre-temps) est ignorée et sa copie supprimée.
 */
export const replacePhotos = internalMutation({
  args: {
    table: photoTable,
    items: v.array(v.object({ id: v.string(), from: v.id("_storage"), to: v.id("_storage") })),
  },
  handler: async (ctx, { table, items }) => {
    let replaced = 0;
    let skipped = 0;
    for (const { id, from, to } of items) {
      const docId = ctx.db.normalizeId(table, id);
      const row = docId ? await ctx.db.get(docId) : null;
      if (!row || !row.photos.includes(from)) {
        await ctx.storage.delete(to);
        skipped++;
        continue;
      }
      await ctx.db.patch(row._id, {
        photos: row.photos.map((photo) => (photo === from ? to : photo)),
      });
      await ctx.storage.delete(from);
      replaced++;
    }
    return { replaced, skipped };
  },
});

export const coversWithoutThumbnail = internalQuery({
  args: { table: photoTable },
  handler: async (ctx, { table }) => {
    const rows = await ctx.db.query(table).collect();
    const covers = [];
    for (const row of rows) {
      const source = row.photos[0];
      if (!source) continue;
      const existing = await ctx.db
        .query("storageThumbnails")
        .withIndex("by_source", (q) => q.eq("source", source))
        .unique();
      if (existing) continue;
      const url = await ctx.storage.getUrl(source);
      if (url) covers.push({ source, url });
    }
    return covers;
  },
});

export const registerThumbnails = internalMutation({
  args: { items: v.array(v.object({ source: v.id("_storage"), thumb: v.id("_storage") })) },
  handler: async (ctx, { items }) => {
    for (const { source, thumb } of items) {
      const existing = await ctx.db
        .query("storageThumbnails")
        .withIndex("by_source", (q) => q.eq("source", source))
        .unique();
      if (existing || !(await ctx.db.system.get("_storage", source))) {
        await ctx.storage.delete(thumb);
        continue;
      }
      await ctx.db.insert("storageThumbnails", { source, thumb });
    }
  },
});

export const deleteFiles = internalMutation({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) => {
    for (const id of ids) await ctx.storage.delete(id);
    return ids.length;
  },
});

export const storageUrls = internalQuery({
  args: { ids: v.array(v.id("_storage")) },
  handler: async (ctx, { ids }) =>
    await Promise.all(ids.map(async (id) => ({ id, url: await ctx.storage.getUrl(id) }))),
});
