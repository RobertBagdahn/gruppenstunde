/**
 * Confirmation dialog for destructive actions.
 * Uses a native dialog approach (no Radix AlertDialog dependency).
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *     title="Idee loeschen?"
 *     description="Diese Aktion kann nicht rueckgaengig gemacht werden."
 *     confirmLabel="Loeschen"
 *     loading={deleteMutation.isPending}
 *   />
 */
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'destructive' | 'default';
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Bist du sicher?',
  description = 'Diese Aktion kann nicht rueckgaengig gemacht werden.',
  confirmLabel = 'Bestaetigen',
  cancelLabel = 'Abbrechen',
  loading = false,
  variant = 'destructive',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onCancel]);

  if (!open) return null;

  const confirmButtonClass =
    variant === 'destructive'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:opacity-90';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-xl border bg-card p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm transition disabled:opacity-50 flex items-center gap-1.5 ${confirmButtonClass}`}
          >
            {loading && (
              <span className="material-symbols-outlined text-lg animate-spin">
                progress_activity
              </span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
