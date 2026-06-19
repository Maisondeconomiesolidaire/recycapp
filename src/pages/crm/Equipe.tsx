import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Eye,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { formatDate, initials } from "../../lib/format";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { OUTCOME_LABELS, SITE_LABELS, Site } from "../../lib/constants";
import { TypeBadge } from "../../components/crm/TypeBadge";

export function Equipe() {
  const members = useQuery(api.team.list);
  const remove = useMutation(api.team.remove);
  const [editing, setEditing] = useState<Doc<"teamMembers"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Doc<"teamMembers"> | null>(null);
  const [detailId, setDetailId] = useState<Id<"teamMembers"> | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Ajouter un salarié
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        {members === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : members.length === 0 ? (
          <EmptyState
            icon={<UserCog className="h-10 w-10" />}
            title="Aucun salarié"
            description="Ajoutez des membres pour pouvoir leur attribuer des demandes."
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Ajouter un salarié
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Salarié</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Site</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Créé</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {members.map((m) => (
                  <tr key={m._id} className="bg-zinc-950 hover:bg-zinc-900/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                          {initials(m.name.split(" ")[0] ?? m.name, m.name.split(" ")[1] ?? "")}
                        </span>
                        <span className="font-medium text-zinc-100">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{m.email || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {m.site ? SITE_LABELS[m.site] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          m.active
                            ? "bg-brand-500 text-white"
                            : "bg-zinc-700 text-zinc-100"
                        }`}
                      >
                        {m.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailId(m._id)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditing(m);
                            setFormOpen(true);
                          }}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(m)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <MemberForm
          key={editing?._id ?? "new"}
          member={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      <MemberDetailModal
        memberId={detailId}
        onClose={() => setDetailId(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await remove({ id: deleting._id });
          setDeleting(null);
        }}
        title="Supprimer ce salarié ?"
        description={
          deleting
            ? `${deleting.name} ne pourra plus être attribué aux demandes.`
            : undefined
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}

function MemberForm({
  member,
  onClose,
}: {
  member: Doc<"teamMembers"> | null;
  onClose: () => void;
}) {
  const create = useMutation(api.team.create);
  const update = useMutation(api.team.update);
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [site, setSite] = useState<Site | "">(member?.site ?? "");
  const [active, setActive] = useState(member?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (member) {
        await update({
          id: member._id,
          name,
          role: member.role,
          email: email || undefined,
          site: site || undefined,
          active,
        });
      } else {
        await create({ name, email: email || undefined, site: site || undefined });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      dark
      open
      onClose={onClose}
      title={member ? "Modifier le salarié" : "Nouveau salarié"}
    >
      <div className="space-y-4">
        <Field label="Nom complet" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Dupont" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Site de fonction">
          <Select value={site} onChange={(e) => setSite(e.target.value as Site | "")}>
            <option value="">Sélectionner un site</option>
            <option value="60">{SITE_LABELS["60"]}</option>
            <option value="76">{SITE_LABELS["76"]}</option>
          </Select>
        </Field>
        {member && (
          <Checkbox
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            label="Actif"
            description="Attribuable aux demandes"
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : member ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MemberDetailModal({
  memberId,
  onClose,
}: {
  memberId: Id<"teamMembers"> | null;
  onClose: () => void;
}) {
  const data = useQuery(api.team.get, memberId ? { id: memberId } : "skip");

  return (
    <Modal
      dark
      open={memberId !== null}
      onClose={onClose}
      title={data?.member.name ?? "Détail salarié"}
      className="max-w-3xl"
    >
      {!data ? (
        <div className="py-10">
          <FullSpinner label="Chargement…" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</p>
              <p className="mt-1 text-sm text-zinc-200">{data.member.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Site</p>
              <p className="mt-1 text-sm text-zinc-200">
                {data.member.site ? SITE_LABELS[data.member.site] : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Demandes attribuées</p>
              <p className="mt-1 text-sm text-zinc-200">{data.requests.length}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Demandes attribuées
            </h4>
            {data.requests.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-500">
                Aucune demande attribuée pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {data.requests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TypeBadge
                          type={request.type}
                          collecteType={request.collecteType}
                          size="sm"
                          solid
                        />
                        <span className="text-sm text-zinc-400">
                          {request.outcome === "open"
                            ? "En cours"
                            : OUTCOME_LABELS[request.outcome]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-100">
                        {request.customerName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
