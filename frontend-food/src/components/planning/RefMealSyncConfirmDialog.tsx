/**
 * RefMealSyncConfirmDialog — confirmation dialog shown before saving a RefMeal
 * that would auto-sync (overwrite) linked `is_synced` meals.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface RefMealSyncConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncedMealsCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RefMealSyncConfirmDialog({
  open,
  onOpenChange,
  syncedMealsCount,
  onCancel,
  onConfirm,
}: RefMealSyncConfirmDialogProps) {
  const verb = syncedMealsCount === 1 ? 'wird' : 'werden';
  const suffix = syncedMealsCount === 1 ? '' : 'en';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verknüpfte Mahlzeiten überschreiben?</DialogTitle>
          <DialogDescription data-testid="ref-meal-sync-confirm-description">
            {`${syncedMealsCount} verknüpfte Mahlzeit${suffix} ${verb} mit dieser Vorlage überschrieben. Manuelle Anpassungen in diesen Mahlzeiten gehen dabei verloren.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-md hover:bg-accent text-sm"
            data-testid="ref-meal-sync-confirm-cancel"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
            data-testid="ref-meal-sync-confirm-save"
          >
            Speichern &amp; synchronisieren
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
