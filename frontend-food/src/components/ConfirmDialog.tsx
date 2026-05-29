/**
 * Confirmation dialog for destructive actions.
 * Uses shadcn/ui Dialog (Radix) for consistent styling and animations.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={showDelete}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *     title="Idee löschen?"
 *     description="Diese Aktion kann nicht rückgängig gemacht werden."
 *     confirmLabel="Löschen"
 *     loading={deleteMutation.isPending}
 *   />
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  description = 'Diese Aktion kann nicht rückgängig gemacht werden.',
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  loading = false,
  variant = 'destructive',
}: ConfirmDialogProps) {
  const confirmButtonClass =
    variant === 'destructive'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:opacity-90';

  const iconName = variant === 'destructive' ? 'warning' : 'help';
  const iconColor = variant === 'destructive' ? 'text-destructive' : 'text-primary';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className={`material-symbols-outlined ${iconColor}`}>{iconName}</span>
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
