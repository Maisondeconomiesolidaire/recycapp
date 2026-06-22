import { Mail, MapPin, Pencil, Phone, UserCheck } from "lucide-react";
import type { CustomerValues } from "./useProfileAutofill";

/**
 * Résumé compact des coordonnées d'un client connecté, avec un bouton
 * « Modifier » pour rouvrir les champs.
 */
export function CustomerSummary({
  customer,
  withAddress,
  onEdit,
}: {
  customer: CustomerValues;
  withAddress?: boolean;
  onEdit: () => void;
}) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const addressLine = [customer.address, [customer.postalCode, customer.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <UserCheck className="h-4 w-4" />
          <p className="text-sm font-semibold">Vos coordonnées</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 transition hover:text-zinc-900"
        >
          <Pencil className="h-3 w-3" />
          Modifier
        </button>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-zinc-700">
        {fullName && <p className="font-medium text-zinc-900">{fullName}</p>}
        {customer.email && (
          <p className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-zinc-400" />
            {customer.email}
          </p>
        )}
        {customer.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-zinc-400" />
            {customer.phone}
          </p>
        )}
        {withAddress && addressLine && (
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
            {addressLine}
          </p>
        )}
      </div>
    </div>
  );
}
