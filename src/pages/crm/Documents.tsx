import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FullSpinner } from "../../components/ui/Spinner";
import { useUpload } from "../../lib/useUpload";
import { cn } from "../../lib/cn";

type FolderDoc = Doc<"documentFolders">;
type FolderId = Id<"documentFolders">;

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(size?: number | null) {
  if (!size) return "Taille inconnue";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

export function Documents() {
  const [folderId, setFolderId] = useState<FolderId | undefined>(undefined);
  const tree = useQuery(api.documents.listTree);
  const folder = useQuery(api.documents.listFolder, { folderId });
  const createFolder = useMutation(api.documents.createFolder);
  const renameFolder = useMutation(api.documents.renameFolder);
  const deleteFolder = useMutation(api.documents.deleteFolder);
  const addFile = useMutation(api.documents.addFile);
  const renameFile = useMutation(api.documents.renameFile);
  const deleteFile = useMutation(api.documents.deleteFile);
  const upload = useUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleCreateFolder() {
    const name = window.prompt("Nom du nouveau dossier", "Nouveau dossier");
    if (!name?.trim()) return;
    await createFolder({ name, parentId: folderId });
  }

  async function handleRenameFolder(target: { _id: FolderId; name: string }) {
    const name = window.prompt("Nouveau nom du dossier", target.name);
    if (!name?.trim() || name.trim() === target.name) return;
    await renameFolder({ folderId: target._id, name });
  }

  async function handleDeleteFolder(target: { _id: FolderId; name: string }) {
    const ok = window.confirm(
      `Supprimer le dossier "${target.name}" et tout son contenu ?`,
    );
    if (!ok) return;
    if (folderId === target._id) setFolderId(undefined);
    await deleteFolder({ folderId: target._id });
  }

  async function handleRenameFile(target: { _id: Id<"documents">; name: string }) {
    const name = window.prompt("Nouveau nom du document", target.name);
    if (!name?.trim() || name.trim() === target.name) return;
    await renameFile({ documentId: target._id, name });
  }

  async function handleDeleteFile(target: { _id: Id<"documents">; name: string }) {
    const ok = window.confirm(`Supprimer le document "${target.name}" ?`);
    if (!ok) return;
    await deleteFile({ documentId: target._id });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const storageId = await upload(file);
        await addFile({
          folderId,
          storageId,
          name: file.name,
          mimeType: file.type || undefined,
          size: file.size,
        });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Gestionnaire de documents interne, dossiers et sous-dossiers."
        actions={
          <>
            <Button variant="outline" onClick={handleCreateFolder}>
              <Plus className="h-4 w-4" />
              Nouveau dossier
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Nouveau document
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </>
        }
      />

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-0 p-4 sm:p-6 lg:grid-cols-[320px_1fr]">
        <aside className="overflow-hidden rounded-t-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] lg:rounded-l-2xl lg:rounded-tr-none">
          <div className="border-b border-[var(--crm-border)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Dossiers
            </p>
          </div>
          <div className="max-h-[calc(100vh-11rem)] overflow-auto p-2">
            <button
              type="button"
              onClick={() => setFolderId(undefined)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                folderId === undefined
                  ? "bg-brand-600/15 text-brand-300"
                  : "text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
              )}
            >
              <FolderOpen className="h-4 w-4" />
              Racine
            </button>
            {tree === undefined ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              <FolderTree
                folders={tree}
                parentId={undefined}
                selectedId={folderId}
                onSelect={setFolderId}
              />
            )}
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-b-2xl border-x border-b border-[var(--crm-border)] bg-[var(--crm-bg)] lg:rounded-r-2xl lg:rounded-bl-none lg:border-l-0 lg:border-t">
          {folder === undefined ? (
            <FullSpinner label="Chargement des documents..." />
          ) : (
            <>
              <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setFolderId(undefined)}
                  className="text-sm font-medium text-zinc-400 hover:text-zinc-100"
                >
                  Documents
                </button>
                {folder.breadcrumb.map((crumb) => (
                  <span key={crumb._id} className="inline-flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                    <button
                      type="button"
                      onClick={() => setFolderId(crumb._id)}
                      className="text-sm font-medium text-zinc-300 hover:text-zinc-100"
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>

              {folder.folders.length === 0 && folder.files.length === 0 ? (
                <EmptyState
                  icon={<FolderOpen className="h-10 w-10" />}
                  title="Dossier vide"
                  description="Ajoutez un sous-dossier ou importez un document."
                />
              ) : (
                <div className="p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {folder.folders.map((item) => (
                      <ExplorerItem
                        key={item._id}
                        icon={<Folder className="h-8 w-8 text-amber-300" />}
                        title={item.name}
                        subtitle={`Dossier · ${formatDate(item.createdAt)}`}
                        onOpen={() => setFolderId(item._id)}
                        onRename={() => handleRenameFolder(item)}
                        onDelete={() => handleDeleteFolder(item)}
                      />
                    ))}
                    {folder.files.map((item) => (
                      <ExplorerItem
                        key={item._id}
                        icon={<FileText className="h-8 w-8 text-sky-300" />}
                        title={item.name}
                        subtitle={`${formatSize(item.size)} · ${formatDate(item.createdAt)}`}
                        href={item.url ?? undefined}
                        onRename={() => handleRenameFile(item)}
                        onDelete={() => handleDeleteFile(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function FolderTree({
  folders,
  parentId,
  selectedId,
  onSelect,
  depth = 0,
}: {
  folders: FolderDoc[];
  parentId?: FolderId;
  selectedId?: FolderId;
  onSelect: (id: FolderId) => void;
  depth?: number;
}) {
  const children = folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (children.length === 0) return null;

  return (
    <div className={depth === 0 ? "mt-1 space-y-0.5" : "space-y-0.5"}>
      {children.map((folder) => (
        <div key={folder._id}>
          <button
            type="button"
            onClick={() => onSelect(folder._id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl py-2 pr-3 text-left text-sm transition",
              selectedId === folder._id
                ? "bg-brand-600/15 text-brand-300"
                : "text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {selectedId === folder._id ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{folder.name}</span>
          </button>
          <FolderTree
            folders={folders}
            parentId={folder._id}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        </div>
      ))}
    </div>
  );
}

function ExplorerItem({
  icon,
  title,
  subtitle,
  href,
  onOpen,
  onRename,
  onDelete,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  onOpen?: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const content = (
    <>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-surface-2)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-zinc-100">{title}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
      </div>
    </>
  );

  return (
    <div className="group rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-3 transition hover:border-brand-500/45 hover:bg-[var(--crm-surface-2)]">
      <div className="flex items-center gap-3">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
            {content}
          </a>
        ) : (
          <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3">
            {content}
          </button>
        )}
        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Ouvrir"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onRename}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Renommer"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
