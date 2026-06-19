import { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal dark open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="space-y-5">
        {description && <div className="text-sm leading-6 text-zinc-500 dark:text-muted-foreground">{description}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
