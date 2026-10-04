/**
 * Transitional e-mail/password login and registration, shown only while the
 * backend announces `password_login` (AUTH_PASSWORD_LOGIN_ENABLED).
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePasswordLogin, usePasswordRegister } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { PasswordLoginSchema, PasswordRegisterSchema } from '@/schemas/auth';

type Mode = 'login' | 'register';

export default function PasswordLoginForm({
  initialMode = 'login',
  onSuccess,
}: {
  initialMode?: Mode;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const login = usePasswordLogin();
  const register = usePasswordRegister();
  const pending = login.isPending || register.isPending;
  const apiError = mode === 'login' ? login.error : register.error;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);
    if (mode === 'login') {
      const parsed = PasswordLoginSchema.safeParse({ email, password });
      if (!parsed.success) return setValidationError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe');
      login.mutate(parsed.data, { onSuccess: () => onSuccess?.() });
    } else {
      const parsed = PasswordRegisterSchema.safeParse({ email, password1: password, password2 });
      if (!parsed.success) return setValidationError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe');
      register.mutate(parsed.data, { onSuccess: () => onSuccess?.() });
    }
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate>
      <div className="space-y-1">
        <Label htmlFor="password-login-email">E-Mail-Adresse</Label>
        <Input
          id="password-login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password-login-password">Passwort</Label>
        <Input
          id="password-login-password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {mode === 'register' && (
        <div className="space-y-1">
          <Label htmlFor="password-login-password2">Passwort wiederholen</Label>
          <Input
            id="password-login-password2"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>
      )}
      {(validationError || apiError) && (
        <p className="text-body text-destructive" role="alert">
          {validationError ?? getApiErrorMessage(apiError)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === 'login' ? 'Mit E-Mail anmelden' : 'Konto erstellen'}
      </Button>
      <button
        type="button"
        className="w-full text-center text-caption text-muted-foreground underline underline-offset-2"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setValidationError(null);
        }}
      >
        {mode === 'login' ? 'Noch kein Konto? Mit E-Mail registrieren' : 'Schon ein Konto? Anmelden'}
      </button>
    </form>
  );
}
