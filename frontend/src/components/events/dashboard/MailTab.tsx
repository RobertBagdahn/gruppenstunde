/**
 * MailTab — Mail composer with recipient selection, placeholder toolbar,
 * preview, and send confirmation.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import { useSendMail } from '@/api/eventDashboard';
import { useLabels } from '@/api/eventDashboard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

const PLACEHOLDERS = [
  { key: '{vorname}', label: 'Vorname', example: 'Max' },
  { key: '{nachname}', label: 'Nachname', example: 'Mustermann' },
  { key: '{pfadiname}', label: 'Pfadiname', example: 'Falke' },
  { key: '{event_name}', label: 'Eventname', example: '' },
  { key: '{buchungsoption}', label: 'Buchungsoption', example: 'Ganzes Wochenende' },
  { key: '{preis}', label: 'Preis', example: '45.00 €' },
  { key: '{bezahlt}', label: 'Bezahlt', example: '45.00 €' },
  { key: '{restbetrag}', label: 'Restbetrag', example: '0.00 €' },
] as const;

type RecipientType = 'all' | 'filtered' | 'selected';

export default function MailTab({ event }: Props) {
  const sendMail = useSendMail(event.slug);
  const { data: labels } = useLabels(event.slug);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Filters for "filtered" mode
  const [filterPaid, setFilterPaid] = useState<string>('');
  const [filterBookingOption, setFilterBookingOption] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');

  // Selected participant IDs for "selected" mode
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<number>>(new Set());

  // All participants from registrations
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Sample participant for preview
  const sampleParticipant = allParticipants[0];

  const insertPlaceholder = (placeholder: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      setSubject((prev) => prev + placeholder);
    } else {
      setBody((prev) => prev + placeholder);
    }
  };

  const getPreviewText = (text: string): string => {
    if (!sampleParticipant) return text;

    let result = text;
    result = result.replace(/{vorname}/g, sampleParticipant.first_name);
    result = result.replace(/{nachname}/g, sampleParticipant.last_name);
    result = result.replace(/{pfadiname}/g, sampleParticipant.scout_name);
    result = result.replace(/{event_name}/g, event.name);
    result = result.replace(/{buchungsoption}/g, sampleParticipant.booking_option_name || '');
    const opt = event.booking_options.find((o) => o.id === sampleParticipant.booking_option_id);
    result = result.replace(/{preis}/g, opt ? `${parseFloat(opt.price).toFixed(2)} €` : '0.00 €');
    result = result.replace(/{bezahlt}/g, `${parseFloat(sampleParticipant.total_paid).toFixed(2)} €`);
    result = result.replace(/{restbetrag}/g, `${parseFloat(sampleParticipant.remaining_amount).toFixed(2)} €`);
    return result;
  };

  const getRecipientCount = (): number => {
    if (recipientType === 'all') return allParticipants.length;
    if (recipientType === 'selected') return selectedParticipantIds.size;
    // For filtered, approximate — actual filtering happens server-side
    return allParticipants.length;
  };

  const toggleParticipant = (id: number) => {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = () => {
    const filters: Record<string, unknown> = {};
    if (recipientType === 'filtered') {
      if (filterPaid === 'true') filters.is_paid = true;
      if (filterPaid === 'false') filters.is_paid = false;
      if (filterBookingOption) filters.booking_option_id = Number(filterBookingOption);
      if (filterLabel) filters.label_id = Number(filterLabel);
    }

    sendMail.mutate(
      {
        subject,
        body,
        recipient_type: recipientType,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        participant_ids:
          recipientType === 'selected' ? Array.from(selectedParticipantIds) : undefined,
      },
      {
        onSuccess: (result) => {
          setShowConfirm(false);
          if (result.failed_count === 0) {
            toast.success(`${result.sent_count} E-Mail(s) erfolgreich gesendet`);
          } else {
            toast.warning(
              `${result.sent_count} gesendet, ${result.failed_count} fehlgeschlagen`,
              {
                description: result.failed_recipients
                  .map((r) => `${r.email || 'ohne E-Mail'}: ${r.error}`)
                  .join(', '),
              },
            );
          }
          // Reset form
          setSubject('');
          setBody('');
          setSelectedParticipantIds(new Set());
        },
        onError: (err) => {
          setShowConfirm(false);
          toast.error('Fehler beim Senden', { description: err.message });
        },
      },
    );
  };

  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (recipientType !== 'selected' || selectedParticipantIds.size > 0);

  return (
    <div className="space-y-6">
      {/* Recipient Selection */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">group</span>
          Empfaenger
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { key: 'all' as const, label: 'Alle Teilnehmer', icon: 'groups' },
            { key: 'filtered' as const, label: 'Gefiltert', icon: 'filter_alt' },
            { key: 'selected' as const, label: 'Ausgewaehlt', icon: 'checklist' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRecipientType(opt.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
                recipientType === opt.key
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'hover:bg-muted',
              )}
            >
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter options for "filtered" mode */}
        {recipientType === 'filtered' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Bezahlstatus
              </label>
              <select
                value={filterPaid}
                onChange={(e) => setFilterPaid(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">Alle</option>
                <option value="true">Bezahlt</option>
                <option value="false">Nicht bezahlt</option>
              </select>
            </div>
            {event.booking_options.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Buchungsoption
                </label>
                <select
                  value={filterBookingOption}
                  onChange={(e) => setFilterBookingOption(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="">Alle</option>
                  {event.booking_options.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(labels ?? []).length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Label
                </label>
                <select
                  value={filterLabel}
                  onChange={(e) => setFilterLabel(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="">Alle</option>
                  {(labels ?? []).map((lbl) => (
                    <option key={lbl.id} value={String(lbl.id)}>
                      {lbl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Participant selection for "selected" mode */}
        {recipientType === 'selected' && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">
                {selectedParticipantIds.size} von {allParticipants.length} ausgewaehlt
              </span>
              <button
                onClick={() => {
                  if (selectedParticipantIds.size === allParticipants.length) {
                    setSelectedParticipantIds(new Set());
                  } else {
                    setSelectedParticipantIds(new Set(allParticipants.map((p) => p.id)));
                  }
                }}
                className="text-xs text-violet-600 hover:underline"
              >
                {selectedParticipantIds.size === allParticipants.length
                  ? 'Alle abwaehlen'
                  : 'Alle auswaehlen'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {allParticipants.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm cursor-pointer transition-all',
                    selectedParticipantIds.has(p.id)
                      ? 'bg-violet-50'
                      : 'hover:bg-muted/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipantIds.has(p.id)}
                    onChange={() => toggleParticipant(p.id)}
                    className="accent-violet-600"
                  />
                  <span>
                    {p.first_name} {p.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">{p.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">mail</span>
          {getRecipientCount()} Empfaenger
        </p>
      </div>

      {/* Placeholder Toolbar */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">data_object</span>
          Platzhalter
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Klicke auf einen Platzhalter, um ihn in den Betreff oder Text einzufuegen.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((ph) => (
            <button
              key={ph.key}
              onClick={() => insertPlaceholder(ph.key, 'body')}
              className="text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors font-mono"
              title={ph.example ? `Beispiel: ${ph.example}` : ph.label}
            >
              {ph.key}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="rounded-xl border p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Nachricht verfassen
        </h3>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Betreff *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="z.B. Wichtige Info zu {event_name}"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Nachricht *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-y"
            placeholder={`Hallo {vorname},\n\nhier sind wichtige Infos zu {event_name}...\n\nViele Gruesse,\nDein Leitungsteam`}
          />
        </div>
      </div>

      {/* Preview */}
      {showPreview && sampleParticipant && (
        <div className="rounded-xl border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            Vorschau (fuer {sampleParticipant.first_name} {sampleParticipant.last_name})
          </h3>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium text-muted-foreground">Betreff:</span>{' '}
              {getPreviewText(subject)}
            </p>
            <div className="border-t pt-2">
              <p className="text-sm whitespace-pre-wrap">{getPreviewText(body)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={!sampleParticipant}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">preview</span>
          {showPreview ? 'Vorschau ausblenden' : 'Vorschau'}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend}
          className="px-6 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          E-Mail senden
        </button>
      </div>

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleSend}
        onCancel={() => setShowConfirm(false)}
        title="E-Mail senden?"
        description={`Die E-Mail wird an ${getRecipientCount()} Empfaenger gesendet. Dieser Vorgang kann nicht rueckgaengig gemacht werden.`}
        confirmLabel="Senden"
        loading={sendMail.isPending}
      />
    </div>
  );
}
