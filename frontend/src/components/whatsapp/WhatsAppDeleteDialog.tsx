/**
 * Confirmation dialog for irreversible WhatsApp data deletion.
 */
import ConfirmDialog from '@/components/ConfirmDialog';

interface WhatsAppDeleteDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function WhatsAppDeleteDialog({
  open,
  onCancel,
  onConfirm,
  isPending,
}: WhatsAppDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="WhatsApp-Daten löschen"
      description="Möchtest du wirklich alle WhatsApp-Daten unwiderruflich löschen? Dies umfasst die Verbindung, alle Sitzungsdaten und den Nachrichtenverlauf. Diese Aktion kann nicht rückgängig gemacht werden."
      confirmLabel={isPending ? 'Wird gelöscht...' : 'Endgültig löschen'}
      loading={isPending}
      variant="destructive"
    />
  );
}
