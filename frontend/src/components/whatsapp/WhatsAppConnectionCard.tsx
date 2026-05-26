/**
 * WhatsApp connection card for the profile page.
 * Shows connection status, masked phone number, connect/disconnect buttons,
 * health check, test message, reconnect, stats, and connection log.
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useWhatsAppStatus,
  useWhatsAppStats,
  useWhatsAppDisconnect,
  useWhatsAppDelete,
  useWhatsAppHealthCheck,
  useWhatsAppTest,
  useWhatsAppReconnect,
} from '@/api/whatsapp';
import WhatsAppQRCodeDialog from './WhatsAppQRCodeDialog';
import WhatsAppDeleteDialog from './WhatsAppDeleteDialog';
import WhatsAppStatsDisplay from './WhatsAppStatsDisplay';
import WhatsAppPrivacyNotice from './WhatsAppPrivacyNotice';
import WhatsAppConnectionLogDisplay from './WhatsAppConnectionLogDisplay';

function maskPhone(phone: string): string {
  if (!phone || phone.length <= 4) return phone;
  return `${phone.slice(0, -4)}****`;
}

export default function WhatsAppConnectionCard() {
  const { data: status, isLoading, refetch: refetchStatus } = useWhatsAppStatus();
  const { data: stats, refetch: refetchStats } = useWhatsAppStats();
  const disconnect = useWhatsAppDisconnect();
  const deleteData = useWhatsAppDelete();
  const healthCheck = useWhatsAppHealthCheck();
  const testMessage = useWhatsAppTest();
  const reconnect = useWhatsAppReconnect();

  const [showQR, setShowQR] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);

  const handleConnected = useCallback(() => {
    toast.success('WhatsApp erfolgreich verbunden');
    setShowQR(false);
    refetchStatus();
    refetchStats();
  }, [refetchStatus, refetchStats]);

  function handleDisconnect() {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        toast.success('WhatsApp-Verbindung getrennt');
        refetchStatus();
        refetchStats();
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  function handleDelete() {
    deleteData.mutate(undefined, {
      onSuccess: () => {
        toast.success('Alle WhatsApp-Daten geloescht');
        setShowDelete(false);
        refetchStatus();
        refetchStats();
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  function handleHealthCheck() {
    healthCheck.mutate(undefined, {
      onSuccess: (result) => {
        setLastHealthCheck(result.checked_at);
        if (result.is_healthy) {
          toast.success('Verbindung aktiv', { description: result.message });
        } else {
          toast.error('Verbindung inaktiv', { description: result.message });
          refetchStatus();
        }
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  function handleTestMessage() {
    testMessage.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  function handleReconnect() {
    reconnect.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(result.message);
          refetchStatus();
        } else if (result.needs_qr) {
          toast.info(result.message);
          setShowQR(true);
        } else {
          toast.error(result.message);
        }
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-muted rounded w-40" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.is_connected ?? false;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-green-600 text-[20px]">
              chat
            </span>
            WhatsApp
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Verbunden' : 'Nicht verbunden'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              {/* Connected state */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <span className="material-symbols-outlined text-green-600 text-[24px]">
                  phone_android
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {status?.phone_number ? maskPhone(status.phone_number) : 'Verbunden'}
                  </p>
                  {status?.connected_since && (
                    <p className="text-xs text-muted-foreground">
                      Verbunden seit{' '}
                      {new Date(status.connected_since).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {/* Last health check timestamp */}
                  <p className="text-xs text-muted-foreground">
                    {lastHealthCheck ? (
                      <>
                        Zuletzt geprueft:{' '}
                        {formatDistanceToNow(new Date(lastHealthCheck), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </>
                    ) : (
                      'Noch nicht geprueft'
                    )}
                  </p>
                </div>
              </div>

              {/* Stats */}
              {stats && <WhatsAppStatsDisplay stats={stats} />}

              {/* Primary actions: Health Check + Test */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHealthCheck}
                  disabled={healthCheck.isPending}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">
                    monitor_heart
                  </span>
                  {healthCheck.isPending ? 'Pruefen...' : 'Verbindung pruefen'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestMessage}
                  disabled={testMessage.isPending}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">send</span>
                  {testMessage.isPending ? 'Senden...' : 'Test senden'}
                </Button>
              </div>

              {/* Secondary actions: Disconnect + Delete */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">link_off</span>
                  {disconnect.isPending ? 'Trennen...' : 'Verbindung trennen'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">
                    delete_forever
                  </span>
                  Daten loeschen
                </Button>
              </div>

              {/* Connection log */}
              <WhatsAppConnectionLogDisplay />
            </>
          ) : (
            <>
              {/* Not connected state */}
              <WhatsAppPrivacyNotice />

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowQR(true)}>
                  <span className="material-symbols-outlined text-[16px] mr-1">
                    qr_code_2
                  </span>
                  WhatsApp verbinden
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReconnect}
                  disabled={reconnect.isPending}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">sync</span>
                  {reconnect.isPending ? 'Verbinden...' : 'Erneut verbinden'}
                </Button>
              </div>

              {/* Show delete option if there's historical data */}
              {stats && stats.total_sent > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">
                    delete_forever
                  </span>
                  Alte Daten loeschen
                </Button>
              )}

              {/* Connection log (also shown when disconnected for diagnostics) */}
              <WhatsAppConnectionLogDisplay />
            </>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <WhatsAppQRCodeDialog
        open={showQR}
        onOpenChange={setShowQR}
        onConnected={handleConnected}
      />

      {/* Delete Confirmation Dialog */}
      <WhatsAppDeleteDialog
        open={showDelete}
        onCancel={() => setShowDelete(false)}
        onConfirm={handleDelete}
        isPending={deleteData.isPending}
      />
    </>
  );
}
