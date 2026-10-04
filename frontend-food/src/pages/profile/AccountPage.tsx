/**
 * "Konto & Anmeldung": linked providers, connect/disconnect, AI quota, logout.
 */
import { useEffect } from 'react';
import { KeyRound, Link2Off, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useConnections, useCurrentUser, useDisconnect, useLogout } from '@/api/auth';
import AiQuotaBar from '@/components/auth/AiQuotaBar';
import LoginPanel from '@/components/auth/LoginPanel';
import UnauthGate from '@/components/shared/UnauthGate';
import { Button } from '@/components/ui/button';
import { LOGIN_ERROR_MESSAGES } from '@/lib/socialLogin';
import { PageSkeleton, SkeletonTableRows } from '@/components/ui/skeleton';

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
    if (connected) notify.success('Anbieter verbunden');
    if (error) notify.error(LOGIN_ERROR_MESSAGES[error] ?? LOGIN_ERROR_MESSAGES.provider_error);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  if (isLoading) {
    return <PageSkeleton label="Konto wird geladen" className="max-w-2xl" />;
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
        <h1 className="flex items-center gap-2 font-display text-title font-bold">
          <KeyRound className="h-6 w-6 text-primary" />
          Konto &amp; Anmeldung
        </h1>
        <p className="mt-1 text-body text-muted-foreground">
          Angemeldet als <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </header>

      <section className="space-y-3 rounded-xl bg-card p-4 sm:p-6 shadow-card">
        <h2 className="font-semibold">Verbundene Anbieter</h2>
        {connectionsLoading && <SkeletonTableRows rows={2} columns={2} label="Anbieter werden geladen" />}
        {isError && (
          <div className="flex items-center justify-between gap-2 text-body text-destructive">
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
                <div className="truncate text-caption text-muted-foreground">
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
                    onSuccess: () => notify.success(`${connection.provider_name} getrennt`),
                    onError: (error) => notify.error('Verbindung konnte nicht getrennt werden', { error }),
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
          <p className="text-caption text-muted-foreground">
            Tipp: Verbinde einen zweiten Anbieter, falls du den ersten einmal nicht nutzen kannst.
          </p>
        )}
        <div className="pt-2">
          <h3 className="mb-2 text-body font-medium">Weiteren Anbieter verbinden</h3>
          <LoginPanel
            next="/profile/account"
            process="connect"
            excludeProviders={connections.map((connection) => connection.provider)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl bg-card p-4 sm:p-6 shadow-card">
        <h2 className="font-semibold">KI-Kontingent</h2>
        <p className="text-body text-muted-foreground">
          Der KI-Assistent hat ein Tageskontingent, damit das Angebot für alle kostenlos bleibt.
        </p>
        <AiQuotaBar showEuro={user.is_staff} />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 sm:p-6 shadow-card">
        <p className="text-body text-muted-foreground">
          Datenübersicht, Datenexport und Konto löschen findest du in den Datenschutz-Einstellungen auf
          gruppenstunde.de.
        </p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => {
                notify.success('Du bist abgemeldet');
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
