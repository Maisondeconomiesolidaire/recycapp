import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

/**
 * Confirmations via un vrai modal (au lieu de `window.confirm`). Usage
 * impératif : `if (!(await confirmDelete("...")))`. `<ConfirmRoot />` doit être
 * monté une fois à la racine de l'app.
 */

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
};

type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

let trigger: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!trigger) {
    return Promise.resolve(window.confirm(opts.description ?? opts.title ?? "Confirmer ?"));
  }
  return trigger(opts);
}

export function confirmDelete(description: string, title = "Confirmer la suppression"): Promise<boolean> {
  return confirmDialog({ title, description, confirmLabel: "Supprimer", tone: "danger" });
}

export function ConfirmRoot() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    trigger = (opts) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve }));
    return () => {
      trigger = null;
    };
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmDialog
      open={pending !== null}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
      title={pending?.title ?? "Confirmer"}
      description={pending?.description}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      tone={pending?.tone ?? "danger"}
    />
  );
}
