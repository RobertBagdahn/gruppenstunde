/**
 * Shared UnauthGate — friendly gate for anonymous users on features that require login.
 *
 * Prevents surfacing a 403 from the API. Renders a centered card with a lock icon,
 * explanatory copy, and two CTAs (Anmelden + Kostenlos registrieren). Optionally a
 * custom secondary CTA can replace the "Kostenlos registrieren" link.
 */
import { Link, useLocation } from 'react-router-dom';

interface UnauthGateProps {
  title: string;
  description: string;
  /** Optional alternative label for the secondary (non-login) CTA. Defaults to "Kostenlos registrieren". */
  ctaLabel?: string;
  /** Optional target route for the secondary CTA. Defaults to "/registrieren". */
  ctaRoute?: string;
}

export default function UnauthGate({
  title,
  description,
  ctaLabel = 'Kostenlos registrieren',
  ctaRoute = '/register',
}: UnauthGateProps) {
  const location = useLocation();
  const loginHref = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <div className="flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <span className="material-symbols-outlined text-3xl text-primary">lock</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-center">
          <Link
            to={loginHref}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            Anmelden
          </Link>
          <Link
            to={ctaRoute}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
