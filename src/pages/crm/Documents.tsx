import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronRight,
  ChevronDown,
  Download,
  Folder,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FileTypePreview } from "../../components/ui/FileTypePreview";
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
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const tree = useQuery(api.documents.listTree);
  const allEntries = useQuery(api.documents.listAll);
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

  function selectFolder(id: FolderId | undefined) {
    setFolderId(id);
    if (id) {
      setCollapsed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  function toggleFolder(id: FolderId) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const searchTerm = query.trim().toLowerCase();
  const searchResults = searchTerm && allEntries
    ? {
        folders: allEntries.folders
          .filter((item) => item.name.toLowerCase().includes(searchTerm))
          .sort((a, b) => a.name.localeCompare(b.name)),
        files: allEntries.files
          .filter((item) => item.name.toLowerCase().includes(searchTerm))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Documents"
        subtitle="Gestionnaire de documents interne, dossiers et sous-dossiers."
        actions={
          <>
            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher documents, dossiers..."
                className="h-10 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 pl-9 text-sm text-[var(--foreground)] outline-none transition focus:border-brand-500 sm:w-72"
              />
            </div>
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
              onClick={() => selectFolder(undefined)}
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
                collapsed={collapsed}
                onSelect={selectFolder}
                onToggle={toggleFolder}
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

              {searchResults ? (
                <SearchResults
                  folders={searchResults.folders}
                  files={searchResults.files}
                  allFolders={allEntries?.folders ?? []}
                  onOpenFolder={selectFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameFile={handleRenameFile}
                  onDeleteFile={handleDeleteFile}
                />
              ) : folder.folders.length === 0 && folder.files.length === 0 ? (
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
                        icon={
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-surface-2)]">
                            <Folder className="h-8 w-8 text-amber-300" />
                          </div>
                        }
                        title={item.name}
                        subtitle={`Dossier · ${formatDate(item.createdAt)}`}
                        onOpen={() => selectFolder(item._id)}
                        onRename={() => handleRenameFolder(item)}
                        onDelete={() => handleDeleteFolder(item)}
                      />
                    ))}
                    {folder.files.map((item) => (
                      <ExplorerItem
                        key={item._id}
                        icon={<FileTypePreview name={item.name} mimeType={item.mimeType} />}
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
  collapsed,
  onSelect,
  onToggle,
  depth = 0,
}: {
  folders: FolderDoc[];
  parentId?: FolderId;
  selectedId?: FolderId;
  collapsed: Set<string>;
  onSelect: (id: FolderId) => void;
  onToggle: (id: FolderId) => void;
  depth?: number;
}) {
  const children = folders
    .filter((folder) => folder.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (children.length === 0) return null;

  return (
    <div className={depth === 0 ? "mt-1 space-y-0.5" : "space-y-0.5"}>
      {children.map((folder) => (
        <FolderTreeNode
          key={folder._id}
          folder={folder}
          folders={folders}
          selectedId={selectedId}
          collapsed={collapsed}
          onSelect={onSelect}
          onToggle={onToggle}
          depth={depth}
        />
      ))}
    </div>
  );
}

function FolderTreeNode({
  folder,
  folders,
  selectedId,
  collapsed,
  onSelect,
  onToggle,
  depth,
}: {
  folder: FolderDoc;
  folders: FolderDoc[];
  selectedId?: FolderId;
  collapsed: Set<string>;
  onSelect: (id: FolderId) => void;
  onToggle: (id: FolderId) => void;
  depth: number;
}) {
  const hasChildren = folders.some((child) => child.parentId === folder._id);
  const isCollapsed = collapsed.has(folder._id);
  const isSelected = selectedId === folder._id;
  const isOpen = isSelected && !isCollapsed;

  return (
    <div>
      <div
        className={cn(
          "flex items-center rounded-xl text-sm transition",
          isSelected
            ? "bg-brand-600/15 text-brand-300"
            : "text-zinc-400 hover:bg-[var(--crm-surface-2)] hover:text-zinc-100",
        )}
        style={{ paddingLeft: `${4 + depth * 16}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(folder._id)}
          className={cn(
            "flex h-9 w-7 shrink-0 items-center justify-center rounded-lg transition",
            hasChildren ? "text-zinc-500 hover:text-zinc-100" : "pointer-events-none text-transparent",
          )}
          aria-label={isCollapsed ? "Ouvrir le dossier" : "Replier le dossier"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(folder._id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left"
        >
          {isOpen ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
        </button>
      </div>
      {!isCollapsed && (
        <FolderTree
          folders={folders}
          parentId={folder._id}
          selectedId={selectedId}
          collapsed={collapsed}
          onSelect={onSelect}
          onToggle={onToggle}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function folderPath(folders: FolderDoc[], folderId?: FolderId | null) {
  if (!folderId) return "Racine";
  const parts: string[] = [];
  let currentId: FolderId | undefined = folderId;
  for (let i = 0; i < 30 && currentId; i++) {
    const folder = folders.find((item) => item._id === currentId);
    if (!folder) break;
    parts.unshift(folder.name);
    currentId = folder.parentId;
  }
  return parts.length ? parts.join(" / ") : "Racine";
}

function SearchResults({
  folders,
  files,
  allFolders,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameFile,
  onDeleteFile,
}: {
  folders: FolderDoc[];
  files: Array<{
    _id: Id<"documents">;
    name: string;
    folderId: FolderId | null;
    mimeType: string | null;
    size: number | null;
    createdAt: number;
    url: string | null;
  }>;
  allFolders: FolderDoc[];
  onOpenFolder: (id: FolderId) => void;
  onRenameFolder: (target: { _id: FolderId; name: string }) => void;
  onDeleteFolder: (target: { _id: FolderId; name: string }) => void;
  onRenameFile: (target: { _id: Id<"documents">; name: string }) => void;
  onDeleteFile: (target: { _id: Id<"documents">; name: string }) => void;
}) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-10 w-10" />}
        title="Aucun résultat"
        description="Essayez avec un autre nom de dossier ou de document."
      />
    );
  }

  return (
    <div className="space-y-8 p-4">
      <SearchSection title="Dossiers trouvés" count={folders.length}>
        {folders.map((item) => (
          <ExplorerItem
            key={item._id}
            icon={
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-surface-2)]">
                <Folder className="h-8 w-8 text-amber-300" />
              </div>
            }
            title={item.name}
            subtitle={`Dossier · ${folderPath(allFolders, item.parentId)} · ${formatDate(item.createdAt)}`}
            onOpen={() => onOpenFolder(item._id)}
            onRename={() => onRenameFolder(item)}
            onDelete={() => onDeleteFolder(item)}
          />
        ))}
      </SearchSection>

      <SearchSection title="Documents trouvés" count={files.length}>
        {files.map((item) => (
          <ExplorerItem
            key={item._id}
            icon={<FileTypePreview name={item.name} mimeType={item.mimeType} />}
            title={item.name}
            subtitle={`${formatSize(item.size)} · ${folderPath(allFolders, item.folderId)} · ${formatDate(item.createdAt)}`}
            href={item.url ?? undefined}
            onRename={() => onRenameFile(item)}
            onDelete={() => onDeleteFile(item)}
          />
        ))}
      </SearchSection>
    </div>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {title}
        </h2>
        <span className="rounded-full border border-[var(--crm-border)] px-2 py-0.5 text-xs text-zinc-500">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--crm-border)] px-4 py-8 text-center text-sm text-zinc-500">
          Aucun élément dans cette catégorie.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {children}
        </div>
      )}
    </section>
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
      {icon}
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
              className="rounded-lg p-2 text-zinc-500 hover:bg-[var(--crm-surface-3)] hover:text-zinc-100"
              aria-label="Ouvrir"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onRename}
            className="rounded-lg p-2 text-zinc-500 hover:bg-[var(--crm-surface-3)] hover:text-zinc-100"
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
