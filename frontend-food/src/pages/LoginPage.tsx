import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '@/api/auth';

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
    <div className="container py-12 max-w-md">
      <div className="bg-card rounded-2xl border shadow-soft p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary text-white">
            <span className="material-symbols-outlined text-[32px]">login</span>
          </div>
          <h1 className="text-2xl font-bold">Willkommen zurück</h1>
          <p className="text-sm text-muted-foreground mt-1">Melde dich an, um fortzufahren</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">email</span>
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">lock</span>
              Passwort
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {login.error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {login.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">login</span>
            {login.isPending ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
