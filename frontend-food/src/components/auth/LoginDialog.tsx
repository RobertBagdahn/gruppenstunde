/**
 * Global login dialog, opened via useLoginPrompt (guarded saves, 401 responses).
 */
import { Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import LoginPanel from '@/components/auth/LoginPanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLoginPrompt } from '@/store/loginPromptStore';

const BENEFITS = [
  'Rezepte, Zutaten und Essenspläne speichern',
  'Mit deiner Gruppe teilen und gemeinsam planen',
  'KI-Assistent mit eigenem Tageskontingent',
];

export default function LoginDialog() {
  const { open, reason, mode, next, close } = useLoginPrompt();
  const location = useLocation();
  const returnTo = next ?? location.pathname + location.search;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'reauth' ? 'Bitte erneut anmelden' : 'Kostenlos anmelden'}</DialogTitle>
          <DialogDescription>{reason}</DialogDescription>
        </DialogHeader>
        {mode === 'login' && (
          <ul className="space-y-1.5 text-body text-muted-foreground">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
        )}
        <LoginPanel next={returnTo} onDevLoginSuccess={close} />
      </DialogContent>
    </Dialog>
  );
}
