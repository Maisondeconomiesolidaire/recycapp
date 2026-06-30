import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Truck, Plus, Pencil, Trash2, X, CarFront, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../../components/ui/Modal";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { PhotoUpload } from "../../components/ui/PhotoUpload";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SITE_LABELS, Site } from "../../lib/constants";

type VehicleKind = "utilitaire" | "voiture";

const KIND_LABELS: Record<VehicleKind, string> = {
  utilitaire: "Utilitaire",
  voiture: "Voiture",
};

type Vehicle = Doc<"vehicles"> & {
  status: string;
  reason: string | null;
  photoUrl: string | null;
};

export function Flotte() {
  const vehicles = useQuery(api.fleet.list) as Vehicle[] | undefined;
  const remove = useMutation(api.fleet.remove);
  const [editing, setEditing] = useState<Vehicle | null>(null);
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <article
                key={v._id}
                className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-[var(--crm-surface-2)]">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={v.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500">
                      <CarFront className="h-10 w-10" />
                      <span className="text-sm font-semibold">Photo à ajouter</span>
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white ${
                      v.active ? "bg-brand-500" : "bg-zinc-500"
                    }`}
                  >
                    {v.active ? "Actif" : "Immobilisé"}
                  </span>
                  {v.plate ? (
                    <span className="absolute right-3 top-3 rounded-md border-2 border-black bg-white px-2.5 py-1 text-xs font-black text-black">
                      {v.plate}
                    </span>
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-zinc-100">{v.name}</h2>
                    <span className="text-sm font-semibold text-zinc-500">
                      {KIND_LABELS[v.kind as VehicleKind]}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="inline-flex items-center gap-1.5 text-zinc-500">
                        <Users className="h-4 w-4" />Places
                      </dt>
                      <dd className="font-semibold text-zinc-100">{v.seats ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">Kilométrage</dt>
                      <dd className="font-semibold text-zinc-100">
                        {v.odometerKm ? `${v.odometerKm.toLocaleString("fr-FR")} km` : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">Site</dt>
                      <dd className="font-semibold text-zinc-100">
                        {v.site ? SITE_LABELS[v.site] : "—"}
                      </dd>
                    </div>
                  </dl>
                  {v.reason ? (
                    <p className="mt-3 text-xs text-zinc-500">{v.reason}</p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        setEditing(v);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Modifier
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDeleting(v)}
                      className="text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
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
  vehicle: Vehicle | null;
  onClose: () => void;
}) {
  const create = useMutation(api.fleet.create);
  const update = useMutation(api.fleet.update);
  const [name, setName] = useState(vehicle?.name ?? "");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [kind, setKind] = useState<VehicleKind>(vehicle?.kind ?? "utilitaire");
  const [site, setSite] = useState<Site | "">(vehicle?.site ?? "");
  const [active, setActive] = useState(vehicle?.active ?? true);
  const [photoId, setPhotoId] = useState<Id<"_storage"> | null>(
    vehicle?.photo ?? null,
  );
  const [saving, setSaving] = useState(false);

  // Aperçu de la photo existante (tant qu'elle n'a pas été remplacée/retirée).
  const currentPhotoUrl =
    vehicle && photoId === vehicle.photo ? vehicle.photoUrl : null;

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (vehicle) {
        await update({
          id: vehicle._id,
          name: name.trim(),
          plate: plate.trim() || undefined,
          kind,
          photo: photoId,
          site: site || undefined,
          active,
        });
      } else {
        await create({
          name: name.trim(),
          plate: plate.trim() || undefined,
          kind,
          photo: photoId ?? undefined,
          site: site || undefined,
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
        <Field label="Site de rattachement">
          <Select value={site} onChange={(e) => setSite(e.target.value as Site | "")}>
            <option value="">Sélectionner un site</option>
            <option value="60">{SITE_LABELS["60"]}</option>
            <option value="76">{SITE_LABELS["76"]}</option>
          </Select>
        </Field>
        <Field label="Photo du véhicule">
          {currentPhotoUrl ? (
            <div className="relative w-32">
              <img
                src={currentPhotoUrl}
                alt={name}
                className="aspect-square w-32 rounded-xl object-cover ring-1 ring-[var(--crm-border)]"
              />
              <button
                type="button"
                onClick={() => setPhotoId(null)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <PhotoUpload
              value={photoId ? [photoId] : []}
              onChange={(ids) => setPhotoId(ids[ids.length - 1] ?? null)}
            />
          )}
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
