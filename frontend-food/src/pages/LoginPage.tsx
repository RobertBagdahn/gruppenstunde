import { LogIn, AlertCircle } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import LoginPanel from '@/components/auth/LoginPanel';
import { LOGIN_ERROR_MESSAGES, safeNextPath } from '@/lib/socialLogin';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const next = safeNextPath(searchParams.get('next'));
  const errorCode = searchParams.get('error');
  const initialPasswordMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  if (user) return <Navigate to={next} replace />;

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl border-border/80 bg-card p-6 sm:p-8 shadow-card">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="font-display text-title font-bold tracking-tight text-foreground">Anmelden</h1>
          <p className="mt-1.5 text-body text-muted-foreground">
            Mit einem Klick über ein Konto, das du schon hast – oder wie gewohnt mit E-Mail und Passwort.
          </p>
        </div>

        {errorCode && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-caption leading-relaxed text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{LOGIN_ERROR_MESSAGES[errorCode] ?? LOGIN_ERROR_MESSAGES.provider_error}</span>
          </div>
        )}

        <LoginPanel next={next} initialPasswordMode={initialPasswordMode} />
      </div>
    </div>
  );
}
