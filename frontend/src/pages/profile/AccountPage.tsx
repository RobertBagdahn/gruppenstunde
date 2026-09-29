/**
 * "Konto & Anmeldung": linked providers, connect/disconnect, AI quota, logout.
 */
import { useEffect } from 'react';
import { KeyRound, Link2Off, LogOut } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useConnections, useCurrentUser, useDisconnect, useLogout } from '@/api/auth';
import AiQuotaBar from '@/components/auth/AiQuotaBar';
import LoginPanel from '@/components/auth/LoginPanel';
import UnauthGate from '@/components/shared/UnauthGate';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';
import { LOGIN_ERROR_MESSAGES } from '@/lib/socialLogin';

function formatDate(iso: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AccountPage() {
  const { data: user, isLoading } = useCurrentUser();
  const { data: connections = [], isLoading: connectionsLoading, isError, refetch } = useConnections(!!user);
  const disconnect = useDisconnect();
  const logout = useLogout();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (!connected && !error) return;
    if (connected) toast.success('Anbieter verbunden.');
    if (error) toast.error(LOGIN_ERROR_MESSAGES[error] ?? LOGIN_ERROR_MESSAGES.provider_error);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return <div className="container max-w-2xl py-16 text-center text-sm text-muted-foreground">Wird geladen …</div>;
  }
  if (!user) {
    return (
      <UnauthGate
        title="Konto & Anmeldung"
        description="Melde dich an, um deine Anmeldemöglichkeiten und dein KI-Kontingent zu sehen."
      />
    );
  }

  const isLast = connections.length <= 1;

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-6 sm:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <KeyRound className="h-6 w-6 text-primary" />
          Konto &amp; Anmeldung
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Angemeldet als <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="font-semibold">Verbundene Anbieter</h2>
        {connectionsLoading && <p className="text-sm text-muted-foreground">Wird geladen …</p>}
        {isError && (
          <div className="flex items-center justify-between gap-2 text-sm text-destructive">
            Die Anbieter konnten nicht geladen werden.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </div>
        )}
        <ul className="divide-y">
          {connections.map((connection) => (
            <li key={connection.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <div className="font-medium">{connection.provider_name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {connection.email || 'ohne E-Mail'} · verbunden seit {formatDate(connection.connected_at)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isLast || disconnect.isPending}
                title={
                  isLast
                    ? 'Du brauchst mindestens eine Anmeldemöglichkeit. Verbinde erst einen weiteren Anbieter.'
                    : undefined
                }
                onClick={() =>
                  disconnect.mutate(connection.id, {
                    onSuccess: () => toast.success(`${connection.provider_name} getrennt.`),
                    onError: (error) => toast.error(getApiErrorMessage(error)),
                  })
                }
              >
                <Link2Off className="h-4 w-4" />
                Trennen
              </Button>
            </li>
          ))}
        </ul>
        {isLast && connections.length === 1 && (
          <p className="text-xs text-muted-foreground">
            Tipp: Verbinde einen zweiten Anbieter, falls du den ersten einmal nicht nutzen kannst.
          </p>
        )}
        <div className="pt-2">
          <h3 className="mb-2 text-sm font-medium">Weiteren Anbieter verbinden</h3>
          <LoginPanel
            next="/profile/account"
            process="connect"
            excludeProviders={connections.map((connection) => connection.provider)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="font-semibold">KI-Kontingent</h2>
        <p className="text-sm text-muted-foreground">
          Der KI-Assistent hat ein Tageskontingent, damit das Angebot für alle kostenlos bleibt.
        </p>
        <AiQuotaBar showEuro={user.is_staff} />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">
          Datenübersicht, Datenexport und Konto löschen findest du unter{' '}
          <Link to="/profile/privacy" className="underline underline-offset-2">
            Datenschutz
          </Link>
          .
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => {
                toast.success('Du bist abgemeldet.');
                navigate('/');
              },
            })
          }
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </section>
    </div>
  );
}
