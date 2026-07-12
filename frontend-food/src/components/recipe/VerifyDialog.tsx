import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { VerifyStatus } from '@/schemas/recipe';

interface VerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: VerifyStatus | null;
  isVerifying: boolean;
  onVerify: () => void;
}

export default function VerifyDialog({ open, onOpenChange, status, isVerifying, onVerify }: VerifyDialogProps) {
  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="material-symbols-outlined text-primary">verified</span>
            Rezept verifizieren
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Überprüfe das Rezept auf Vollständigkeit und Regelkonformität.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {status.rules_passed} / {status.rules_total} Regeln erfüllt
            </span>
          </div>
          {status.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                {status.warnings.length} Warnung{status.warnings.length !== 1 ? 'en' : ''}:
              </p>
              <ul className="space-y-1">
                {status.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{String(w.rule_description || w.rule_name || w.message || '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {status.warnings.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-emerald-800">
                Alle Regeln erfüllt
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onVerify}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Wird verifiziert...
              </>
            ) : status.warnings.length > 0 ? (
              'Trotzdem verifizieren'
            ) : (
              'Verifizieren'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
