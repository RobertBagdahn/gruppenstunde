import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '@/api/auth';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/') },
    );
  }

  return (
    <div className="container max-w-md mx-auto px-4 py-16 flex flex-col justify-center min-h-[calc(100vh-4rem)]">
      <div className="bg-card rounded-2xl border border-border/80 shadow-md p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/10 text-primary">
            <LogIn className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Willkommen zurück
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Melde dich an, um fortzufahren
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                Passwort
              </label>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-colors placeholder:text-muted-foreground/60"
              placeholder="••••••••"
            />
          </div>

          {login.error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{login.error.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-medium hover:shadow-md disabled:opacity-50 transition-all text-sm mt-2"
          >
            {login.isPending ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Anmelden...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Anmelden
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Jetzt registrieren
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
