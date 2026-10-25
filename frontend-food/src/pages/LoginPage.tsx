import { LogIn, AlertCircle } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import LoginPanel from '@/components/auth/LoginPanel';
import Sticker from '@/components/shared/Sticker';
import { StickerBoundary } from '@/components/shared/StickerBoundary';
import { LOGIN_ERROR_MESSAGES, safeNextPath } from '@/lib/socialLogin';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const next = safeNextPath(searchParams.get('next'));
  const errorCode = searchParams.get('error');
  const initialPasswordMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  if (user) return <Navigate to={next} replace />;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6 pb-16 sm:px-6 md:space-y-8 md:py-8">
      {/* Hero band in the Startseite layout: soft primary surface, one sticker, the mascot from public/images. */}
      <section className="relative flex flex-col items-start gap-5 overflow-hidden rounded-xl bg-primary-soft p-5 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-md space-y-3">
          <StickerBoundary>
            <Sticker>Für Gruppenstunde, Fahrt &amp; Lager</Sticker>
          </StickerBoundary>
          <h1 className="font-display text-section font-extrabold text-primary-dark md:text-display">Willkommen zurück</h1>
          <p className="text-emphasis text-muted-foreground">Melde dich an, um Rezepte und Essenspläne zu speichern.</p>
        </div>
        <img
          src="/images/inspi_thinking.webp"
          alt=""
          aria-hidden="true"
          className="hidden h-36 w-auto shrink-0 md:block lg:h-44"
        />
      </section>

      {/* Form card: neutral surface with shadow-card, icon plate and heading as on the account pages. */}
      <section className="rounded-xl bg-card p-5 shadow-card sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-title font-bold tracking-tight text-foreground">Anmelden</h2>
            <p className="mt-1 text-body text-muted-foreground">
              Mit einem Klick über ein Konto, das du schon hast – oder wie gewohnt mit E-Mail und Passwort.
            </p>
          </div>
        </div>

        {errorCode && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-caption leading-relaxed text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{LOGIN_ERROR_MESSAGES[errorCode] ?? LOGIN_ERROR_MESSAGES.provider_error}</span>
          </div>
        )}

        <LoginPanel next={next} initialPasswordMode={initialPasswordMode} />
      </section>
    </div>
  );
}
