/**
 * QRCodePage — Displays a printable QR code for event registration.
 * Shows event name, date, location, and a QR code pointing to the registration URL.
 * Accessible from the Invitations tab.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useEvent } from '@/api/events';
import { useCallback, useRef } from 'react';

export default function QRCodePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading, error } = useEvent(slug ?? '');
  const containerRef = useRef<HTMLDivElement>(null);

  const registrationUrl = `${window.location.origin}/events/${slug}/register`;

  const handleDownloadPng = useCallback(() => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `qr-code-${slug}.png`;
      a.click();
    };
    img.src = url;
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container py-12 max-w-md mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded-lg w-1/2 mx-auto" />
        <div className="h-64 w-64 bg-muted rounded-xl mx-auto" />
        <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container py-12 max-w-md text-center">
        <p className="text-muted-foreground">Event nicht gefunden</p>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="container py-6 max-w-md mx-auto">
      {/* Actions (hidden in print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Zurück
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Als PNG
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Drucken
          </button>
        </div>
      </div>

      {/* Printable QR Code Card */}
      <div className="border rounded-2xl p-8 text-center space-y-4 bg-white print:border-none print:shadow-none print:p-0">
        <h1 className="text-xl font-bold">{event.name}</h1>

        {(event.start_date || event.location) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {event.start_date && (
              <p className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] print:hidden">
                  calendar_today
                </span>
                {formatDate(event.start_date)}
                {event.end_date && event.end_date !== event.start_date && (
                  <> &ndash; {formatDate(event.end_date)}</>
                )}
              </p>
            )}
            {event.location && (
              <p className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] print:hidden">
                  location_on
                </span>
                {event.location}
              </p>
            )}
          </div>
        )}

        <div ref={containerRef} className="flex justify-center py-4">
          <QRCodeSVG
            value={registrationUrl}
            size={256}
            level="H"
            includeMargin
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Scanne den QR-Code, um dich anzumelden
        </p>

        <p className="text-xs text-muted-foreground break-all">{registrationUrl}</p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .container, .container * { visibility: visible; }
          .container { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
