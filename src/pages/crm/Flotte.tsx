import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Truck, Eye, CarFront, Users, Gauge, Building2, ClipboardList, Fuel, Sparkles, CalendarRange } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../../components/ui/Modal";
import { SITE_LABELS, Site } from "../../lib/constants";
import { UnderlineTabs } from "../../components/ui/UnderlineTabs";

type VehicleKind = "utilitaire" | "voiture";
type VehicleTab = "details" | "remarques";

const KIND_LABELS: Record<VehicleKind, string> = {
  utilitaire: "Utilitaire",
  voiture: "Voiture",
};

type Vehicle = Doc<"vehicles"> & {
  status: string;
  reason: string | null;
  photoUrl: string | null;
};

type VehicleRemark = {
  _id: Id<"vehicleReservations">;
  userName: string;
  purpose: string;
  usageType: "pro" | "personal" | null;
  start: number;
  end: number;
  submittedAt: number;
  mileage: number | null;
  lastRecordedMileage: number | null;
  fuelRestored: boolean | null;
  vehicleEmpty: boolean | null;
  vehicleClean: boolean | null;
  issues: string | null;
  notes: string | null;
};

export function Flotte() {
  const vehicles = useQuery(api.fleet.list) as Vehicle[] | undefined;
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  return (
    <div>
      <PageHeader title="Flotte" />

      <div className="p-4 sm:p-6">
        {vehicles === undefined ? (
          <FullSpinner label="Chargement…" />
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-10 w-10" />}
            title="Aucun véhicule"
            description="Aucun véhicule activé n'est visible dans la flotte Recycapp."
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
                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => setSelectedVehicle(v)}
                    >
                      <Eye className="h-4 w-4" /> Voir les détails
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedVehicle ? (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      ) : null}
    </div>
  );
}

function VehicleDetailsModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<VehicleTab>("details");
  const remarksData = useQuery(api.fleet.listRemarks, { vehicleId: vehicle._id }) as
    | { remarks: VehicleRemark[] }
    | undefined;
  const detailRows = useMemo(
    () => [
      {
        label: "Type",
        value: KIND_LABELS[vehicle.kind as VehicleKind],
        icon: <Truck className="h-4 w-4" />,
      },
      {
        label: "Immatriculation",
        value: vehicle.plate || "Non renseignée",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        label: "Site",
        value: vehicle.site ? SITE_LABELS[vehicle.site as Site] : "Non renseigné",
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        label: "Kilométrage",
        value:
          typeof vehicle.odometerKm === "number"
            ? `${vehicle.odometerKm.toLocaleString("fr-FR")} km`
            : "Non renseigné",
        icon: <Gauge className="h-4 w-4" />,
      },
    ],
    [vehicle],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle.name}
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] sm:w-72">
            {vehicle.photoUrl ? (
              <img
                src={vehicle.photoUrl}
                alt={vehicle.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-zinc-500">
                <CarFront className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  vehicle.active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-500/15 text-zinc-300"
                }`}
              >
                {vehicle.active ? "Actif" : "Immobilisé"}
              </span>
              <span className="rounded-full bg-[var(--crm-surface-2)] px-3 py-1 text-xs font-semibold text-zinc-300">
                {vehicle.status}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Consultation uniquement depuis Recycapp. Les modifications du véhicule
              restent gérées dans l’outil de référence.
            </p>
            {vehicle.reason ? (
              <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-4 py-3 text-sm text-zinc-300">
                {vehicle.reason}
              </div>
            ) : null}
          </div>
        </div>

        <UnderlineTabs
          items={[
            { key: "details", label: "Détails" },
            { key: "remarques", label: "Remarques" },
          ]}
          value={tab}
          onChange={setTab}
          counts={{ remarques: remarksData?.remarks.length ?? 0 }}
        />

        {tab === "details" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-4 py-3"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {row.icon}
                  <span>{row.label}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{row.value}</p>
              </div>
            ))}
          </div>
        ) : remarksData === undefined ? (
          <FullSpinner label="Chargement des remarques…" />
        ) : remarksData.remarks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Aucune remarque"
            description="Aucun retour de réservation n'a encore été laissé pour ce véhicule."
          />
        ) : (
          <div className="space-y-3">
            {remarksData.remarks.map((remark) => (
              <article
                key={remark._id}
                className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                      {remark.userName}
                    </h3>
                    <p className="text-sm text-zinc-400">{remark.purpose}</p>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(remark.submittedAt).toLocaleString("fr-FR")}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <InfoLine
                    icon={<CalendarRange className="h-4 w-4" />}
                    label="Créneau"
                    value={`${formatDateTime(remark.start)} -> ${formatDateTime(remark.end)}`}
                  />
                  <InfoLine
                    icon={<Gauge className="h-4 w-4" />}
                    label="Kilométrage"
                    value={formatMileageComparison(remark.lastRecordedMileage, remark.mileage)}
                  />
                  <InfoLine
                    icon={<Fuel className="h-4 w-4" />}
                    label="Carburant remis"
                    value={formatBoolean(remark.fuelRestored)}
                  />
                  <InfoLine
                    icon={<Sparkles className="h-4 w-4" />}
                    label="Véhicule vidé / propre"
                    value={`${formatBoolean(remark.vehicleEmpty)} / ${formatBoolean(remark.vehicleClean)}`}
                  />
                </div>

                {remark.issues ? (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    <span className="font-medium">Problèmes signalés :</span> {remark.issues}
                  </div>
                ) : null}
                {remark.notes ? (
                  <div className="mt-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2 text-sm text-zinc-300">
                    <span className="font-medium text-zinc-100">Remarque :</span> {remark.notes}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--crm-surface-2)] px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function formatBoolean(value: boolean | null) {
  if (value === null) return "Non renseigné";
  return value ? "Oui" : "Non";
}

function formatDateTime(value: number) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMileageComparison(lastRecordedMileage: number | null, mileage: number | null) {
  if (mileage === null && lastRecordedMileage === null) return "Non renseigné";
  if (mileage === null) {
    return `Dernier relevé: ${lastRecordedMileage?.toLocaleString("fr-FR")} km`;
  }
  if (lastRecordedMileage === null) {
    return `${mileage.toLocaleString("fr-FR")} km`;
  }
  return `${mileage.toLocaleString("fr-FR")} km (dernier relevé: ${lastRecordedMileage.toLocaleString("fr-FR")} km)`;
}
