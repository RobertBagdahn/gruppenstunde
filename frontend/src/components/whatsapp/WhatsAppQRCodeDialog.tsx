/**
 * WhatsApp QR code pairing dialog.
 * Shows privacy notice, consent checkbox, QR code, and auto-polls until connected.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWhatsAppConnect, useWhatsAppQRStatus } from '@/api/whatsapp';
import WhatsAppPrivacyNotice from './WhatsAppPrivacyNotice';

interface WhatsAppQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export default function WhatsAppQRCodeDialog({
  open,
  onOpenChange,
  onConnected,
}: WhatsAppQRCodeDialogProps) {
  const [consent, setConsent] = useState(false);
  const [pairingStarted, setPairingStarted] = useState(false);

  const connect = useWhatsAppConnect();
  const { data: qrStatus } = useWhatsAppQRStatus(pairingStarted && open);

  // When connected, notify parent
  useEffect(() => {
    if (qrStatus?.status === 'connected') {
      onConnected();
    }
  }, [qrStatus?.status, onConnected]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setConsent(false);
      setPairingStarted(false);
    }
  }, [open]);

  function handleStartPairing() {
    connect.mutate(
      { privacy_consent: true },
      {
        onSuccess: () => {
          setPairingStarted(true);
        },
      },
    );
  }

  const status = qrStatus?.status ?? (pairingStarted ? 'initializing' : 'idle');
  const qrCode = qrStatus?.qr_code_base64;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-green-600">
              qr_code_2
            </span>
            WhatsApp verbinden
          </DialogTitle>
          <DialogDescription>
            Scanne den QR-Code mit deiner WhatsApp-App, um dein Konto zu verknuepfen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!pairingStarted ? (
            <>
              <WhatsAppPrivacyNotice />
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="wa-consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="wa-consent" className="text-sm leading-snug cursor-pointer">
                  Ich habe den Datenschutzhinweis gelesen und stimme der Verarbeitung
                  meiner Daten zu.
                </Label>
              </div>
              <Button
                className="w-full"
                disabled={!consent || connect.isPending}
                onClick={handleStartPairing}
              >
                {connect.isPending ? 'Verbindung wird gestartet...' : 'QR-Code anzeigen'}
              </Button>
              {connect.error && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {connect.error.message}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {status === 'pending_qr' && qrCode ? (
                <>
                  <div className="p-3 bg-white rounded-xl border">
                    <img
                      src={`data:image/png;base64,${qrCode}`}
                      alt="WhatsApp QR-Code"
                      className="w-56 h-56"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Oeffne WhatsApp auf deinem Handy und scanne diesen QR-Code
                    unter Einstellungen &gt; Verknuepfte Geraete.
                  </p>
                </>
              ) : status === 'connected' ? (
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-green-600 text-[48px]">
                    check_circle
                  </span>
                  <p className="font-medium">Erfolgreich verbunden!</p>
                  {qrStatus?.phone_number && (
                    <p className="text-sm text-muted-foreground">
                      Telefonnummer: {qrStatus.phone_number}
                    </p>
                  )}
                </div>
              ) : status === 'failed' ? (
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-destructive text-[48px]">
                    error
                  </span>
                  <p className="font-medium text-destructive">Verbindung fehlgeschlagen</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPairingStarted(false);
                      setConsent(false);
                    }}
                  >
                    Erneut versuchen
                  </Button>
                </div>
              ) : status === 'timeout' ? (
                <div className="text-center space-y-2">
                  <span className="material-symbols-outlined text-amber-500 text-[48px]">
                    timer_off
                  </span>
                  <p className="font-medium">QR-Code abgelaufen</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPairingStarted(false);
                      setConsent(false);
                    }}
                  >
                    Neuen QR-Code anfordern
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">QR-Code wird generiert...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
