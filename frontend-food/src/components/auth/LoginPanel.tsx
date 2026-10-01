/**
 * Provider buttons (+ dev login outside production). Shared by LoginDialog and LoginPage.
 */
import { useState } from 'react';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthProviders, useDevLogin } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordLoginForm from '@/components/auth/PasswordLoginForm';
import { getApiErrorMessage } from '@/lib/api';
import { startSocialLogin, type SocialLoginProcess } from '@/lib/socialLogin';

interface LoginPanelProps {
  /** Path the browser returns to after the OAuth round trip. */
  next: string;
  process?: SocialLoginProcess;
  /** Called before leaving the SPA (e.g. to persist a draft). */
  onBeforeRedirect?: () => void;
  onDevLoginSuccess?: () => void;
  /** Providers already linked (connect mode hides them). */
  excludeProviders?: string[];
  /** Start the e-mail form in registration mode (/register). */
  initialPasswordMode?: 'login' | 'register';
}

const PROVIDER_LABEL_PREFIX: Record<SocialLoginProcess, string> = {
  login: 'Weiter mit',
  connect: 'Verbinden mit',
};

export default function LoginPanel({
  next,
  process = 'login',
  onBeforeRedirect,
  onDevLoginSuccess,
  excludeProviders = [],
  initialPasswordMode = 'login',
}: LoginPanelProps) {
  const { data, isLoading, isError } = useAuthProviders();
  const devLogin = useDevLogin();
  const [devEmail, setDevEmail] = useState('');
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  const providers = (data?.providers ?? []).filter((p) => !excludeProviders.includes(p.id));

  async function handleProvider(providerId: string, loginUrl: string) {
    setPendingProvider(providerId);
    onBeforeRedirect?.();
    await startSocialLogin(loginUrl, next, process);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Anmeldeoptionen werden geladen" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        Die Anmeldeoptionen konnten nicht geladen werden. Bitte lade die Seite neu.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="h-11 w-full justify-center gap-2 text-sm font-medium"
          disabled={pendingProvider !== null}
          onClick={() => handleProvider(provider.id, provider.login_url)}
        >
          {pendingProvider === provider.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {PROVIDER_LABEL_PREFIX[process]} {provider.name}
        </Button>
      ))}

      {data?.password_login && process === 'login' && (
        <>
          {providers.length > 0 && (
            <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              oder mit E-Mail
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <PasswordLoginForm initialMode={initialPasswordMode} onSuccess={onDevLoginSuccess} />
        </>
      )}

      {providers.length === 0 && !data?.dev_login && !data?.password_login && (
        <p className="text-sm text-muted-foreground">
          Aktuell ist keine Anmeldung verfügbar. Bitte versuche es später erneut.
        </p>
      )}

      {data?.dev_login && process === 'login' && (
        <form
          className="space-y-2 rounded-lg border border-dashed p-3"
          onSubmit={(e) => {
            e.preventDefault();
            devLogin.mutate({ email: devEmail }, { onSuccess: () => onDevLoginSuccess?.() });
          }}
        >
          <label htmlFor="dev-login-email" className="text-xs font-semibold text-muted-foreground">
            Entwicklungs-Login (nur lokal)
          </label>
          <div className="flex gap-2">
            <Input
              id="dev-login-email"
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="user@inspi.dev"
            />
            <Button type="submit" disabled={devLogin.isPending}>
              Anmelden
            </Button>
          </div>
          {devLogin.error && (
            <p className="text-xs text-destructive">{getApiErrorMessage(devLogin.error)}</p>
          )}
        </form>
      )}

      <p className="pt-1 text-center text-xs text-muted-foreground">
        Wir speichern nur deinen Namen und deine E-Mail-Adresse.{' '}
        <Link to="/privacy" className="underline underline-offset-2">
          Datenschutz
        </Link>
      </p>
    </div>
  );
}
