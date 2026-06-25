import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Truck, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SITE_LABELS, Site } from "../../lib/constants";

type VehicleKind = "utilitaire" | "camionnette" | "camion" | "voiture";

const KIND_LABELS: Record<VehicleKind, string> = {
  utilitaire: "Utilitaire",
  camionnette: "Camionnette",
  camion: "Camion",
  voiture: "Voiture",
};

const STATUS_STYLES: Record<string, string> = {
  disponible: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  sur_collecte: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  en_tournee: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  inactif: "bg-zinc-600/20 text-zinc-400 ring-zinc-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  sur_collecte: "Sur collecte",
  en_tournee: "En tournée",
  inactif: "Inactif",
};

type Vehicle = Doc<"vehicles"> & {
  status: string;
  reason: string | null;
};

export function Flotte() {
  const vehicles = useQuery(api.fleet.list) as Vehicle[] | undefined;
  const remove = useMutation(api.fleet.remove);
  const [editing, setEditing] = useState<Doc<"vehicles"> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Doc<"vehicles"> | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Flotte"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Ajouter un véhicule
          </Button>
        }
      />

      <div className="p-4 sm:p-6">
        {vehicles === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-10 w-10" />}
            title="Aucun véhicule"
            description="Ajoutez vos utilitaires pour pouvoir les affecter aux collectes et tournées."
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Ajouter un véhicule
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <div
                key={v._id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-surface-2)] text-zinc-300">
                      <Truck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{v.name}</p>
                      <p className="text-xs text-zinc-500">
                        {KIND_LABELS[v.kind as VehicleKind]}
                        {v.plate ? ` · ${v.plate}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(v);
                        setFormOpen(true);
                      }}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(v)}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-[var(--crm-surface-3)] hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                      STATUS_STYLES[v.status] ?? STATUS_STYLES.inactif
                    }`}
                  >
                    {STATUS_LABELS[v.status] ?? v.status}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {v.site ? SITE_LABELS[v.site] : ""}
                    {v.capacityM3 ? `${v.site ? " · " : ""}${v.capacityM3} m³` : ""}
                  </span>
                </div>

                {v.reason && (
                  <p className="text-xs text-zinc-500">{v.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <VehicleForm
          key={editing?._id ?? "new"}
          vehicle={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await remove({ id: deleting._id });
          setDeleting(null);
        }}
        title="Supprimer ce véhicule ?"
        description={
          deleting
            ? `${deleting.name} ne pourra plus être affecté aux collectes et tournées.`
            : undefined
        }
        confirmLabel="Supprimer"
      />
    </div>
  );
}

function VehicleForm({
  vehicle,
  onClose,
}: {
  vehicle: Doc<"vehicles"> | null;
  onClose: () => void;
}) {
  const create = useMutation(api.fleet.create);
  const update = useMutation(api.fleet.update);
  const [name, setName] = useState(vehicle?.name ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [kind, setKind] = useState<VehicleKind>(vehicle?.kind ?? "utilitaire");
  const [capacityM3, setCapacityM3] = useState(
    vehicle?.capacityM3 != null ? String(vehicle.capacityM3) : "",
  );
  const [site, setSite] = useState<Site | "">(vehicle?.site ?? "");
  const [active, setActive] = useState(vehicle?.active ?? true);
  const [notes, setNotes] = useState(vehicle?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const capacity = capacityM3.trim() ? Number(capacityM3) : undefined;
      if (vehicle) {
        await update({
          id: vehicle._id,
          name: name.trim(),
          plate: plate.trim() || undefined,
          kind,
          capacityM3: capacity,
          site: site || undefined,
          active,
          notes: notes.trim() || undefined,
        });
      } else {
        await create({
          name: name.trim(),
          plate: plate.trim() || undefined,
          kind,
          capacityM3: capacity,
          site: site || undefined,
          notes: notes.trim() || undefined,
        });
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
      title={vehicle ? "Modifier le véhicule" : "Nouveau véhicule"}
    >
      <div className="space-y-4">
        <Field label="Nom / identifiant" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Renault Master" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Immatriculation">
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="AB-123-CD" />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as VehicleKind)}>
              {(Object.keys(KIND_LABELS) as VehicleKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Volume (m³)">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={capacityM3}
              onChange={(e) => setCapacityM3(e.target.value)}
              placeholder="12"
            />
          </Field>
          <Field label="Site de rattachement">
            <Select value={site} onChange={(e) => setSite(e.target.value as Site | "")}>
              <option value="">Sélectionner un site</option>
              <option value="60">{SITE_LABELS["60"]}</option>
              <option value="76">{SITE_LABELS["76"]}</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hayon, gabarit, remarques…" />
        </Field>
        {vehicle && (
          <Checkbox
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            label="Actif"
            description="Affectable aux collectes et tournées"
          />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : vehicle ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
