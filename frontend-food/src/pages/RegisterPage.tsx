import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/api/auth';
import { UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const navigate = useNavigate();
  const register = useRegister();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password1 !== password2) return;
    register.mutate(
      { email, password1, password2 },
      { onSuccess: () => navigate('/') },
    );
  }

  const passwordMismatch = password2.length > 0 && password1 !== password2;

  return (
    <div className="container max-w-md mx-auto px-4 py-16 flex flex-col justify-center min-h-[calc(100vh-4rem)]">
      <div className="bg-card rounded-2xl border border-border/80 shadow-md p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 text-primary">
            <UserPlus className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Konto erstellen
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Werde Teil der Inspi-Community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors placeholder:text-muted-foreground/60"
              placeholder="name@beispiel.de"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password1" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Passwort
            </label>
            <input
              id="password1"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors placeholder:text-muted-foreground/60"
              placeholder="Mindestens 8 Zeichen"
            />
            <p className="text-[10px] text-muted-foreground/80 font-medium">
              Mindestens 8 Zeichen erforderlich
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password2" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              Passwort bestätigen
            </label>
            <input
              id="password2"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors placeholder:text-muted-foreground/60"
              placeholder="Passwort wiederholen"
            />
            {passwordMismatch && (
              <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Passwörter stimmen nicht überein</span>
              </div>
            )}
          </div>

          {register.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{register.error.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={register.isPending || passwordMismatch}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:shadow-md disabled:opacity-50 transition-all text-sm mt-2"
          >
            {register.isPending ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Registrieren...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Registrieren
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Bereits registriert?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
