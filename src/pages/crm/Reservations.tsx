import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, CarFront, Check, Info, Search, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "../../components/crm/PageHeader";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { FullSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { canAccess } from "../../lib/crmPermissions";
import { formatDateTime, formatDateTimeWithDay } from "../../lib/format";

type ReservationItem = {
  _id: Id<"vehicleReservations">;
  vehicle?: { name?: string; brand?: string; model?: string; plate?: string } | null;
  vehiclePhotoUrl?: string | null;
  clerkId: string;
  userName: string;
  bookedByName?: string;
  purpose: string;
  usageType?: "pro" | "personal";
  expectedKm?: number;
  willTransport?: boolean;
  transportDetails?: string;
  start: number;
  end: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decisionNote?: string;
  decidedBy?: string;
  decidedAt?: number;
};

export function Reservations() {
  const access = useQuery(api.permissions.myAccess);
  const canManage = canAccess(access, "reservations", "manage");
  const canDeleteForever = access?.email?.trim().toLowerCase() === "lahmerselim@gmail.com";
  const reservations = useQuery(api.reservations.listRecyclerieVehicleReservations, {}) as
    | ReservationItem[]
    | undefined;
  const decide = useMutation(api.reservations.decideRecyclerieVehicleReservation);
  const cancel = useMutation(api.reservations.cancelRecyclerieVehicleReservation);
  const [selectedId, setSelectedId] = useState<Id<"vehicleReservations"> | null>(null);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visibleReservations = (reservations ?? []).filter((reservation) => {
    if (!needle) return true;
    return [
      reservation.userName,
      reservation.bookedByName,
      reservation.purpose,
      reservation.vehicle?.name,
      reservation.vehicle?.brand,
      reservation.vehicle?.model,
      reservation.vehicle?.plate,
      reservation.status,
    ].filter(Boolean).join(" ").toLowerCase().includes(needle);
  });
  const pending = visibleReservations.filter((r) => r.status === "pending");
  const others = visibleReservations.filter((r) => r.status !== "pending");
  const selected = (reservations ?? []).find((r) => r._id === selectedId) ?? null;

  async function decideAndClose(reservationId: Id<"vehicleReservations">, decision: "approved" | "rejected") {
    await decide({ reservationId, decision });
    setSelectedId(null);
  }

  return (
    <div>
      <PageHeader title="Réservations" subtitle="Demandes pour les véhicules mis à disposition de la Recyclerie." />

      <div className="p-4 sm:p-6">
        {reservations === undefined ? (
          <FullSpinner label="Chargement des réservations…" />
        ) : reservations.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10" />}
            title="Aucune réservation"
            description="Les demandes de réservation des véhicules Recyclerie apparaîtront ici."
          />
        ) : (
          <div className="space-y-6">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher par nom, véhicule, plaque, motif..."
                className="h-10 w-full rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] pl-9 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-emerald-500"
              />
            </div>
            {visibleReservations.length === 0 ? (
              <EmptyState icon={<Search className="h-10 w-10" />} title="Aucun résultat" description="Aucune réservation ne correspond à votre recherche." />
            ) : null}
            {pending.length > 0 ? (
              <section className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
                <div className="border-b border-[var(--crm-border)] px-5 py-4">
                  <h2 className="text-lg font-semibold text-zinc-100">À traiter ({pending.length})</h2>
                </div>
                <div className="divide-y divide-[var(--crm-border)]">
                  {pending.map((r) => (
                    <ReservationRow
                      key={r._id}
                      reservation={r}
                      canManage={canManage}
                      canDeleteForever={canDeleteForever}
                      onOpen={() => setSelectedId(r._id)}
                      onCancel={() => cancel({ reservationId: r._id })}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface)]">
              <div className="border-b border-[var(--crm-border)] px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">Historique</h2>
              </div>
              <div className="divide-y divide-[var(--crm-border)]">
                {others.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-zinc-500">Aucune décision pour le moment.</p>
                ) : (
                  others.map((r) => (
                    <ReservationRow
                      key={r._id}
                      reservation={r}
                      canManage={canManage}
                      canDeleteForever={canDeleteForever}
                      onOpen={() => setSelectedId(r._id)}
                      onCancel={() => cancel({ reservationId: r._id })}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <ReservationDetailsModal
        reservation={selected}
        canManage={canManage}
        canDeleteForever={canDeleteForever}
        onClose={() => setSelectedId(null)}
        onApprove={(reservationId) => decideAndClose(reservationId, "approved")}
        onReject={(reservationId) => decideAndClose(reservationId, "rejected")}
        onCancel={(reservationId) => {
          void cancel({ reservationId });
          setSelectedId(null);
        }}
      />
    </div>
  );
}

function ReservationRow({
  reservation,
  canManage,
  canDeleteForever,
  onOpen,
  onCancel,
}: {
  reservation: ReservationItem;
  canManage: boolean;
  canDeleteForever: boolean;
  onOpen: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-5">
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--crm-surface-2)]">
        {reservation.vehiclePhotoUrl ? (
          <img src={reservation.vehiclePhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <CarFront className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{reservation.vehicle?.name ?? "Véhicule"}</p>
          <StatusBadge status={reservation.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {reservation.userName}
          {reservation.bookedByName ? ` (par ${reservation.bookedByName})` : ""} · {reservation.purpose}
        </p>
        <p className="text-xs text-zinc-500">
          {formatDateTimeWithDay(reservation.start)} → {formatDateTimeWithDay(reservation.end)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={reservation.status === "pending" && canManage ? "primary" : "secondary"}
          onClick={onOpen}
        >
          <Info className="h-4 w-4" />
          Détails
        </Button>
        {canManage && reservation.status !== "cancelled" ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
            title={canDeleteForever ? "Supprimer" : "Annuler la demande"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReservationDetailsModal({
  reservation,
  canManage,
  canDeleteForever,
  onClose,
  onApprove,
  onReject,
  onCancel,
}: {
  reservation: ReservationItem | null;
  canManage: boolean;
  canDeleteForever: boolean;
  onClose: () => void;
  onApprove: (reservationId: Id<"vehicleReservations">) => Promise<void>;
  onReject: (reservationId: Id<"vehicleReservations">) => Promise<void>;
  onCancel: (reservationId: Id<"vehicleReservations">) => void;
}) {
  const [saving, setSaving] = useState<"approved" | "rejected" | null>(null);
  if (!reservation) return null;
  const current = reservation;

  async function decide(decision: "approved" | "rejected") {
    setSaving(decision);
    try {
      if (decision === "approved") await onApprove(current._id);
      else await onReject(current._id);
    } finally {
      setSaving(null);
    }
  }

  const usageLabel =
    reservation.usageType === "personal"
      ? "Personnel"
      : reservation.usageType === "pro"
        ? "Professionnel"
        : "Non renseigné";
  const vehicleDetails = [reservation.vehicle?.brand, reservation.vehicle?.model, reservation.vehicle?.plate]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal open onClose={onClose} title="Détail de la réservation véhicule">
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--crm-surface-2)] px-3 py-3">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--crm-surface-3)]">
            {reservation.vehiclePhotoUrl ? (
              <img src={reservation.vehiclePhotoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <CarFront className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-zinc-100">{reservation.vehicle?.name ?? "Véhicule"}</p>
              <StatusBadge status={reservation.status} />
            </div>
            {vehicleDetails ? <p className="mt-1 truncate text-sm text-zinc-400">{vehicleDetails}</p> : null}
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailItem label="Demandeur" value={reservation.userName} />
          <DetailItem label="Réservé par" value={reservation.bookedByName ?? reservation.userName} />
          <DetailItem label="Début" value={formatDateTimeWithDay(reservation.start)} />
          <DetailItem label="Fin" value={formatDateTimeWithDay(reservation.end)} />
          <DetailItem label="Usage" value={usageLabel} />
          <DetailItem
            label="Km estimés"
            value={
              reservation.expectedKm !== undefined
                ? `${reservation.expectedKm.toLocaleString("fr-FR")} km`
                : "Non renseigné"
            }
          />
        </dl>

        <div className="rounded-xl border border-[var(--crm-border)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Motif</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">{reservation.purpose}</p>
        </div>

        <div className="rounded-xl border border-[var(--crm-border)] p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Transport de matériel</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{reservation.willTransport ? "Oui" : "Non"}</p>
          {reservation.willTransport && reservation.transportDetails ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{reservation.transportDetails}</p>
          ) : null}
        </div>

        {reservation.decidedBy || reservation.decisionNote ? (
          <div className="rounded-xl bg-[var(--crm-surface-2)] p-3 text-sm text-zinc-400">
            {reservation.decidedBy ? (
              <p>
                Décision par {reservation.decidedBy}
                {reservation.decidedAt ? ` · ${formatDateTime(reservation.decidedAt)}` : ""}
              </p>
            ) : null}
            {reservation.decisionNote ? <p className="mt-1">{reservation.decisionNote}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--crm-border)] pt-4">
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          {canManage && reservation.status !== "cancelled" ? (
            <Button variant="outline" onClick={() => onCancel(reservation._id)}>
              <Trash2 className="h-4 w-4" />
              {canDeleteForever ? "Supprimer" : "Annuler la demande"}
            </Button>
          ) : null}
          {canManage && reservation.status === "pending" ? (
            <>
              <Button variant="outline" onClick={() => decide("rejected")} disabled={saving !== null}>
                <X className="h-4 w-4" />
                {saving === "rejected" ? "Refus…" : "Refuser"}
              </Button>
              <Button onClick={() => decide("approved")} disabled={saving !== null}>
                <Check className="h-4 w-4" />
                {saving === "approved" ? "Approbation…" : "Approuver"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--crm-border)] px-3 py-2">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 font-semibold text-zinc-100">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationItem["status"] }) {
  const styles = {
    approved: "bg-emerald-500/15 text-emerald-300",
    pending: "bg-amber-500/15 text-amber-300",
    rejected: "bg-rose-500/15 text-rose-300",
    cancelled: "bg-zinc-500/15 text-zinc-300",
  };
  const labels = { approved: "Approuvée", pending: "En attente", rejected: "Refusée", cancelled: "Annulée" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}
