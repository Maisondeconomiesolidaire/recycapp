import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Check, Copy, Loader2, Ticket, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Select } from "../ui/Field";
import { errorMessage } from "../../lib/convexError";
import { usePersona } from "../../lib/persona";
import { formatDateTime } from "../../lib/format";

/** Remises proposées : de 5 % à 80 %, par pas de 5. */
const PERCENTS = Array.from({ length: 16 }, (_, i) => 5 + i * 5);

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  used: "Utilisé",
  cancelled: "Annulé",
};

/**
 * « Bons de réduction » : génère les codes promo de la boutique en ligne.
 *
 * Le code n'est pas choisi par l'équipe mais tiré au sort côté serveur
 * (« RECY » + 16 chiffres) : un bon ne se devine pas à partir d'un autre. Il
 * vaut un pourcentage sur la totalité d'un panier, une seule fois.
 */
export function DiscountCodesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const codes = useQuery(api.discountCodes.list, open ? {} : "skip");
  const create = useMutation(api.discountCodes.create);
  const cancel = useMutation(api.discountCodes.cancel);
  const { user } = useUser();
  const persona = usePersona();
  const author =
    persona ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? undefined;

  const [percent, setPercent] = useState("20");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ code: string; percent: number } | null>(
    null,
  );
  const [copied, setCopied] = useState("");

  async function handleGenerate() {
    setSaving(true);
    setError("");
    try {
      const result = await create({ percent: Number(percent), createdBy: author });
      setCreated({ code: result.code, percent: result.percent });
    } catch (err) {
      setError(errorMessage(err, "Génération impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("Copie impossible : sélectionnez le code manuellement.");
    }
  }

  async function handleCancel(id: Id<"discountCodes">) {
    setError("");
    try {
      await cancel({ id });
    } catch (err) {
      setError(errorMessage(err, "Annulation impossible."));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bons de réduction">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <Field label="Remise">
                <Select value={percent} onChange={(e) => setPercent(e.target.value)}>
                  {PERCENTS.map((value) => (
                    <option key={value} value={value}>
                      {value} %
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button onClick={handleGenerate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              Générer un bon
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Le code est tiré au sort et vaut une seule fois, sur la totalité d'un
            panier de la boutique en ligne.
          </p>
        </div>

        {created && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-emerald-300/90">
              Nouveau bon · {created.percent} % de remise
            </p>
            <p className="mt-1 select-all break-all font-mono text-xl font-bold text-zinc-100">
              {created.code}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => handleCopy(created.code)}
            >
              {copied === created.code ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied === created.code ? "Copié" : "Copier le code"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bons émis
          </p>
          {codes === undefined ? (
            <p className="text-sm text-zinc-500">Chargement…</p>
          ) : codes.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun bon pour l'instant.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {codes.map((discount) => (
                <div
                  key={discount._id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-zinc-100">
                      {discount.code}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {discount.percent} % ·{" "}
                      {STATUS_LABELS[discount.status] ?? discount.status} ·{" "}
                      {formatDateTime(discount.createdAt)}
                      {discount.createdBy ? ` · ${discount.createdBy}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(discount.code)}
                    title="Copier le code"
                    className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-[var(--crm-surface-3)] hover:text-zinc-200"
                  >
                    {copied === discount.code ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  {discount.status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(discount._id)}
                      title="Annuler ce bon"
                      className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
