import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { isStaffIdentity, requireStaff, requireUser } from "./lib";
import type { Id } from "./_generated/dataModel";

const docType = v.union(
  v.literal("devis"),
  v.literal("facture"),
  v.literal("bon_commande"),
  v.literal("bon_collecte"),
  v.literal("contrat"),
  v.literal("photo"),
  v.literal("autre"),
);

// ─── Documents rattachés à une demande ────────────────────────────────────────

async function ensureRequestAccess(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"requests">,
) {
  const identity = await requireUser(ctx);
  const request = await ctx.db.get(requestId);
  if (!request) throw new Error("Demande introuvable.");
  const staff = isStaffIdentity(identity);
  if (!staff && request.userId !== identity.subject) {
    throw new Error("Accès refusé à cette demande.");
  }
  return { staff };
}

export const listForRequest = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const request = await ctx.db.get(requestId);
    if (!request) return [];
    const staff = isStaffIdentity(identity);
    if (!staff && request.userId !== identity.subject) return [];

    const docs = await ctx.db
      .query("requestDocuments")
      .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
      .collect();
    return Promise.all(
      docs
        .filter((doc) => staff || doc.uploadedByRole === "staff")
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (d) => ({
          _id: d._id,
          name: d.name,
          docType: d.docType,
          mimeType: d.mimeType ?? null,
          uploadedByRole: d.uploadedByRole,
          createdAt: d.createdAt,
          url: await ctx.storage.getUrl(d.storageId),
        })),
    );
  },
});

export const addToRequest = mutation({
  args: {
    requestId: v.id("requests"),
    storageId: v.id("_storage"),
    name: v.string(),
    docType,
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, storageId, name, docType: type, mimeType }) => {
    const { staff } = await ensureRequestAccess(ctx, requestId);
    return await ctx.db.insert("requestDocuments", {
      requestId,
      storageId,
      name: name.trim() || "Document",
      docType: type,
      mimeType,
      uploadedByRole: staff ? "staff" : "client",
      createdAt: Date.now(),
    });
  },
});

export const removeFromRequest = mutation({
  args: { documentId: v.id("requestDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return;
    const { staff } = await ensureRequestAccess(ctx, doc.requestId);
    if (!staff && doc.uploadedByRole !== "client") {
      throw new Error("Seule l'équipe peut supprimer ce document.");
    }
    await ctx.storage.delete(doc.storageId).catch(() => {});
    await ctx.db.delete(documentId);
  },
});

// ─── Gestionnaire de documents CRM (dossiers + fichiers) ──────────────────────

async function buildBreadcrumb(ctx: QueryCtx, folderId?: Id<"documentFolders">) {
  const trail: Array<{ _id: Id<"documentFolders">; name: string }> = [];
  let currentId = folderId;
  // Garde-fou contre une éventuelle boucle.
  for (let i = 0; i < 50 && currentId; i++) {
    const folder = await ctx.db.get(currentId);
    if (!folder) break;
    trail.unshift({ _id: folder._id, name: folder.name });
    currentId = folder.parentId;
  }
  return trail;
}

export const listFolder = query({
  args: { folderId: v.optional(v.id("documentFolders")) },
  handler: async (ctx, { folderId }) => {
    await requireStaff(ctx);

    const folders = await ctx.db
      .query("documentFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", folderId))
      .collect();

    const files = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", folderId))
      .collect();

    return {
      breadcrumb: await buildBreadcrumb(ctx, folderId),
      folders: folders
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => ({ _id: f._id, name: f.name, createdAt: f.createdAt })),
      files: await Promise.all(
        files
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(async (f) => ({
            _id: f._id,
            name: f.name,
            mimeType: f.mimeType ?? null,
            size: f.size ?? null,
            createdAt: f.createdAt,
            url: await ctx.storage.getUrl(f.storageId),
          })),
      ),
    };
  },
});

export const listTree = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    return await ctx.db.query("documentFolders").take(500);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const folders = await ctx.db.query("documentFolders").take(500);
    const files = await ctx.db.query("documents").take(1000);
    return {
      folders,
      files: await Promise.all(
        files.map(async (file) => ({
          _id: file._id,
          name: file.name,
          folderId: file.folderId ?? null,
          mimeType: file.mimeType ?? null,
          size: file.size ?? null,
          createdAt: file.createdAt,
          url: await ctx.storage.getUrl(file.storageId),
        })),
      ),
    };
  },
});

export const createFolder = mutation({
  args: { name: v.string(), parentId: v.optional(v.id("documentFolders")) },
  handler: async (ctx, { name, parentId }) => {
    await requireStaff(ctx);
    return await ctx.db.insert("documentFolders", {
      name: name.trim() || "Nouveau dossier",
      parentId,
      createdAt: Date.now(),
    });
  },
});

export const renameFolder = mutation({
  args: { folderId: v.id("documentFolders"), name: v.string() },
  handler: async (ctx, { folderId, name }) => {
    await requireStaff(ctx);
    await ctx.db.patch(folderId, { name: name.trim() || "Dossier" });
  },
});

async function deleteFolderRecursive(ctx: MutationCtx, folderId: Id<"documentFolders">) {
  const subFolders = await ctx.db
    .query("documentFolders")
    .withIndex("by_parent", (q) => q.eq("parentId", folderId))
    .collect();
  for (const sub of subFolders) {
    await deleteFolderRecursive(ctx, sub._id);
  }
  const files = await ctx.db
    .query("documents")
    .withIndex("by_folder", (q) => q.eq("folderId", folderId))
    .collect();
  for (const file of files) {
    await ctx.storage.delete(file.storageId).catch(() => {});
    await ctx.db.delete(file._id);
  }
  await ctx.db.delete(folderId);
}

export const deleteFolder = mutation({
  args: { folderId: v.id("documentFolders") },
  handler: async (ctx, { folderId }) => {
    await requireStaff(ctx);
    await deleteFolderRecursive(ctx, folderId);
  },
});

export const addFile = mutation({
  args: {
    name: v.string(),
    folderId: v.optional(v.id("documentFolders")),
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, { name, folderId, storageId, mimeType, size }) => {
    await requireStaff(ctx);
    return await ctx.db.insert("documents", {
      name: name.trim() || "Document",
      folderId,
      storageId,
      mimeType,
      size,
      createdAt: Date.now(),
    });
  },
});

export const renameFile = mutation({
  args: { documentId: v.id("documents"), name: v.string() },
  handler: async (ctx, { documentId, name }) => {
    await requireStaff(ctx);
    await ctx.db.patch(documentId, { name: name.trim() || "Document" });
  },
});

export const deleteFile = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    await requireStaff(ctx);
    const doc = await ctx.db.get(documentId);
    if (!doc) return;
    await ctx.storage.delete(doc.storageId).catch(() => {});
    await ctx.db.delete(documentId);
  },
});
