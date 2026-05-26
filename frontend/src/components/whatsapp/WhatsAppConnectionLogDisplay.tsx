/**
 * Collapsible connection event log for WhatsApp diagnostics.
 * Shows the last 5 entries with event type, message, and relative timestamp.
 */
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useWhatsAppLogs } from '@/api/whatsapp';
import { cn } from '@/lib/utils';

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  connected: { label: 'Verbunden', icon: 'link', color: 'text-green-600' },
  disconnected: { label: 'Getrennt', icon: 'link_off', color: 'text-gray-500' },
  health_check_ok: { label: 'Check OK', icon: 'check_circle', color: 'text-green-600' },
  health_check_failed: { label: 'Check fehlgeschlagen', icon: 'error', color: 'text-red-500' },
  reconnect_success: { label: 'Reconnect OK', icon: 'sync', color: 'text-green-600' },
  reconnect_failed: { label: 'Reconnect fehlgeschlagen', icon: 'sync_problem', color: 'text-red-500' },
  test_sent: { label: 'Test gesendet', icon: 'send', color: 'text-blue-600' },
  test_failed: { label: 'Test fehlgeschlagen', icon: 'sms_failed', color: 'text-red-500' },
};

export default function WhatsAppConnectionLogDisplay() {
  const { data: logs } = useWhatsAppLogs();
  const [expanded, setExpanded] = useState(false);

  if (!logs || logs.length === 0) {
    return null;
  }

  const visibleLogs = expanded ? logs : logs.slice(0, 3);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
        Verbindungs-Log ({logs.length} Eintraege)
      </button>

      <div className="space-y-1">
        {visibleLogs.map((log, idx) => {
          const config = EVENT_TYPE_LABELS[log.event_type] ?? {
            label: log.event_type,
            icon: 'info',
            color: 'text-muted-foreground',
          };

          return (
            <div
              key={`${log.created_at}-${idx}`}
              className="flex items-start gap-2 text-xs py-1 px-2 rounded bg-muted/50"
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[14px] mt-0.5 shrink-0',
                  config.color,
                )}
              >
                {config.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{config.label}</span>
                {log.message && (
                  <span className="text-muted-foreground ml-1 truncate">
                    — {log.message}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
