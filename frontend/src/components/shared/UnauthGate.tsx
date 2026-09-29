/**
 * Explaining empty state for pages that only show personal data (e.g. "Meine Rezepte").
 * Creation flows must NOT use this gate — they stay usable and guard the save action.
 */
import { Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLoginPrompt } from '@/store/loginPromptStore';

interface UnauthGateProps {
  title: string;
  description: string;
  /** Short list of what the visitor gets after logging in. */
  benefits?: string[];
}

export default function UnauthGate({ title, description, benefits = [] }: UnauthGateProps) {
  const showLogin = useLoginPrompt((state) => state.show);

  return (
    <div className="flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {benefits.length > 0 && (
          <ul className="mt-4 space-y-1 text-left text-sm text-muted-foreground">
            {benefits.map((benefit) => (
              <li key={benefit}>• {benefit}</li>
            ))}
          </ul>
        )}
        <Button className="mt-6 gap-2" onClick={() => showLogin({ reason: description })}>
          <LogIn className="h-4 w-4" />
          Kostenlos anmelden
        </Button>
      </div>
    </div>
  );
}
