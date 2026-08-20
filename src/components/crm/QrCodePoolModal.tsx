import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Printer, QrCode as QrCodeIcon, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { QrCode } from "../ui/QrCode";
import { PrintLabels } from "./PrintLabels";

/**
 * « Nouveau QR code » : fabrique une réserve d'étiquettes vierges.
 *
 * Le flux historique imposait de créer la fiche article AVANT de pouvoir
 * imprimer son QR code — donc de retrouver l'objet ensuite pour y coller
 * l'étiquette. Ici l'équipe imprime d'abord une planche de codes libres, les
 * colle au fil de la collecte, et crée les fiches plus tard en scannant le code
 * déjà posé.
 */
export function QrCodePoolModal({
  open,
  onClose,
  canPrint,
}: {
  open: boolean;
  onClose: () => void;
  canPrint: boolean;
}) {
  const codes = useQuery(api.articleQrCodes.list, {});
  const generate = useMutation(api.articleQrCodes.generate);
  const remove = useMutation(api.articleQrCodes.remove);

  const [count, setCount] = useState("24");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [printRefs, setPrintRefs] = useState<string[] | null>(null);

  const free = (codes ?? []).filter((code) => !code.articleId);
  const used = (codes ?? []).filter((code) => code.articleId);

  async function handleGenerate() {
    const total = Number(count);
    if (!Number.isFinite(total) || total < 1) {
      setError("Indiquez un nombre de QR codes à générer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await generate({ count: total });
      // On enchaîne sur l'impression : une planche générée mais pas imprimée ne
      // sert à rien.
      setPrintRefs(created.map((code) => code.reference));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: Id<"articleQrCodes">) {
    try {
      await remove({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={saving ? () => {} : onClose}
        title="Nouveau QR code"
        className="sm:max-w-2xl"
      >
        <div className="space-y-5 p-5">
          <p className="text-sm text-zinc-400">
            Générez des QR codes qui ne sont encore attribués à aucun article,
            imprimez-les, et collez-les sur les objets. La fiche se crée ensuite
            en scannant le code déjà posé — plus besoin d'imprimer une étiquette
            après coup ni de retrouver l'objet pour la coller.
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Nombre de QR codes" hint="200 au maximum par génération.">
              <Input
                type="number"
                min="1"
                max="200"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-32"
              />
            </Field>
            <Button onClick={handleGenerate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Générer et imprimer
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface-2)] px-3 py-2.5 text-sm">
            <span className="font-semibold text-emerald-400">
              {free.length} libre{free.length > 1 ? "s" : ""}
            </span>
            <span className="text-zinc-500">
              {used.length} déjà attribué{used.length > 1 ? "s" : ""}
            </span>
            {canPrint && free.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setPrintRefs(free.map((code) => code.reference))}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer les {free.length} libres
              </Button>
            )}
          </div>

          {codes === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : free.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--crm-border)] px-4 py-10 text-center">
              <QrCodeIcon className="h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">
                Aucun QR code libre. Générez-en une planche pour commencer.
              </p>
            </div>
          ) : (
            <div className="grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
              {free.map((code) => (
                <div
                  key={code._id}
                  className="group relative flex flex-col items-center gap-1 rounded-xl border border-[var(--crm-border)] bg-white p-2"
                >
                  <QrCode value={code.reference} size={56} margin={2} className="text-black" />
                  <span className="font-mono text-[11px] font-semibold text-black">
                    {code.reference}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(code._id)}
                    aria-label={`Supprimer le QR code ${code.reference}`}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {printRefs && (
        <PrintLabels
          items={printRefs.map((reference) => ({ id: reference, reference }))}
          title="QR codes articles"
          onClose={() => setPrintRefs(null)}
        />
      )}
    </>
  );
}
