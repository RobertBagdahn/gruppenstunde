import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/api/auth';

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
    <div className="container py-12 max-w-md">
      <div className="bg-card rounded-2xl border shadow-soft p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary text-white">
            <span className="material-symbols-outlined text-[32px]">person_add</span>
          </div>
          <h1 className="text-2xl font-bold">Konto erstellen</h1>
          <p className="text-sm text-muted-foreground mt-1">Werde Teil der Inspi-Community</p>
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
            <label htmlFor="password1" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">lock</span>
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
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
          </div>

          <div>
            <label htmlFor="password2" className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <span className="material-symbols-outlined text-muted-foreground text-[18px]">lock</span>
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
              className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {passwordMismatch && (
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <span className="material-symbols-outlined text-[14px]">error</span>
                Passwörter stimmen nicht überein
              </p>
            )}
          </div>

          {register.error && (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {register.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={register.isPending || passwordMismatch}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            {register.isPending ? 'Registrieren...' : 'Registrieren'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Bereits registriert?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
