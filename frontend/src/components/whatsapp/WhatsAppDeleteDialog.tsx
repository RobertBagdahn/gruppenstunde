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
      title="WhatsApp-Daten loeschen"
      description="Moechtest du wirklich alle WhatsApp-Daten unwiderruflich loeschen? Dies umfasst die Verbindung, alle Sitzungsdaten und den Nachrichtenverlauf. Diese Aktion kann nicht rueckgaengig gemacht werden."
      confirmLabel={isPending ? 'Wird geloescht...' : 'Endgueltig loeschen'}
      loading={isPending}
      variant="destructive"
    />
  );
}
