import DetailHeader from '@/components/shared/DetailHeader';
/**
 * "Konto & Anmeldung": linked providers, connect/disconnect, AI quota, logout.
 */
import { useEffect } from 'react';
import { KeyRound, Link2Off, LogOut, Sparkles, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useConnections, useCurrentUser, useDisconnect, useLogout } from '@/api/auth';
import AiQuotaBar from '@/components/auth/AiQuotaBar';
import LoginPanel from '@/components/auth/LoginPanel';
import UnauthGate from '@/components/shared/UnauthGate';
import { Button } from '@/components/ui/button';
import { LOGIN_ERROR_MESSAGES } from '@/lib/socialLogin';
import { PageSkeleton, SkeletonTableRows } from '@/components/ui/skeleton';
import WizardSectionHeading from '@/pages/planning/wizard/WizardSectionHeading';

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
    <div className="mx-auto max-w-2xl px-4 pb-10">
      <DetailHeader
        title="Konto &amp; Anmeldung"
        description={<>Angemeldet als <span className="break-all font-medium text-foreground">{user.email}</span></>}
      />
      <div className="space-y-6">
        <section className="rounded-xl bg-card p-4 shadow-card sm:p-6">
          <WizardSectionHeading icon={<KeyRound className="h-5 w-5" />}>Verbundene Anbieter</WizardSectionHeading>
          {connectionsLoading && <SkeletonTableRows rows={2} columns={2} label="Anbieter werden geladen" />}
          {isError && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft p-3 text-body text-danger-foreground">
              Die Anbieter konnten nicht geladen werden.
              <Button size="sm" variant="outline" className="h-11" onClick={() => refetch()}>
                Erneut versuchen
              </Button>
            </div>
          )}
          <ul className="divide-y divide-border">
            {connections.map((connection) => (
              <li key={connection.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-foreground">{connection.provider_name}</div>
                  <div className="truncate text-caption text-muted-foreground">
                    {connection.email || 'ohne E-Mail'} · verbunden seit {formatDate(connection.connected_at)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 gap-1.5"
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
            <p className="mt-2 text-caption text-muted-foreground">
              Tipp: Verbinde einen zweiten Anbieter, falls du den ersten einmal nicht nutzen kannst.
            </p>
          )}
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="mb-3 text-body font-semibold text-foreground">Weiteren Anbieter verbinden</h3>
            <LoginPanel
              next="/profile/account"
              process="connect"
              excludeProviders={connections.map((connection) => connection.provider)}
            />
          </div>
        </section>

        <section className="rounded-xl bg-card p-4 shadow-card sm:p-6">
          <WizardSectionHeading icon={<Sparkles className="h-5 w-5" />}>KI-Kontingent</WizardSectionHeading>
          <p className="mb-4 text-body text-muted-foreground">
            Der KI-Assistent hat ein Tageskontingent, damit das Angebot für alle kostenlos bleibt.
          </p>
          <AiQuotaBar showEuro={user.is_staff} />
        </section>

        <section className="rounded-xl bg-card p-4 shadow-card sm:p-6">
          <WizardSectionHeading icon={<ShieldCheck className="h-5 w-5" />}>Konto &amp; Daten</WizardSectionHeading>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="min-w-0 flex-1 text-body text-muted-foreground">
              Datenübersicht, Datenexport und Konto löschen findest du in den Datenschutz-Einstellungen auf
              gruppenstunde.de.
            </p>
            <Button
              className="h-11 gap-2 bg-primary-soft text-primary-dark hover:bg-primary-soft-border"
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
          </div>
        </section>
      </div>
    </div>
  );
}
