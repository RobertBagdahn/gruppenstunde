/**
 * MessagingTab — Unified messaging composer with channel selection (Email/WhatsApp),
 * recipient selection, placeholder toolbar, template selector, preview, and send confirmation.
 *
 * Replaces the previous MailTab with support for both channels.
 */
import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import type { MessageTemplate } from '@/schemas/whatsapp';
import type {
  MessageChannel,
  RecipientType,
  RecipientPreview,
  MessagePreview,
  SendMessageResult,
} from '@/schemas/messaging';
import { useLabels } from '@/api/eventDashboard';
import {
  useWhatsAppStatus,
  useMessagePreview,
  useSendMessage,
  useMessageTemplates,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
} from '@/api/whatsapp';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

const PLACEHOLDERS = [
  { key: '{vorname}', label: 'Vorname' },
  { key: '{nachname}', label: 'Nachname' },
  { key: '{pfadiname}', label: 'Pfadiname' },
  { key: '{event_name}', label: 'Eventname' },
  { key: '{buchungsoption}', label: 'Buchungsoption' },
  { key: '{preis}', label: 'Preis' },
  { key: '{bezahlt}', label: 'Bezahlt' },
  { key: '{restbetrag}', label: 'Restbetrag' },
] as const;

export default function MessagingTab({ event }: Props) {
  const { data: labels } = useLabels(event.slug);
  const { data: waStatus } = useWhatsAppStatus();
  const { data: templates } = useMessageTemplates();
  const previewMutation = useMessagePreview(event.slug);
  const sendMutation = useSendMessage(event.slug);
  const createTemplate = useCreateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();

  // Form state
  const [channel, setChannel] = useState<MessageChannel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [filterPaid, setFilterPaid] = useState<string>('');
  const [filterBookingOption, setFilterBookingOption] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<number>>(new Set());

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<MessagePreview | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendResult, setSendResult] = useState<SendMessageResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [showCopyMessages, setShowCopyMessages] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const allParticipants: Participant[] = useMemo(
    () => event.all_registrations?.flatMap((r) => r.participants) ?? [],
    [event.all_registrations],
  );

  const sampleParticipant = allParticipants[0];
  const isWhatsAppConnected = waStatus?.is_connected ?? false;

  // Build filters object
  const buildFilters = useCallback(() => {
    if (recipientType !== 'filtered') return undefined;
    const filters: Record<string, unknown> = {};
    if (filterPaid === 'true') filters.is_paid = true;
    if (filterPaid === 'false') filters.is_paid = false;
    if (filterBookingOption) filters.booking_option_id = Number(filterBookingOption);
    if (filterLabel) filters.label_id = Number(filterLabel);
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [recipientType, filterPaid, filterBookingOption, filterLabel]);

  // Build send body
  const buildSendBody = useCallback(() => ({
    channel,
    subject: channel === 'email' ? subject : '',
    body,
    recipient_type: recipientType,
    filters: buildFilters(),
    participant_ids: recipientType === 'selected' ? Array.from(selectedParticipantIds) : undefined,
  }), [channel, subject, body, recipientType, buildFilters, selectedParticipantIds]);

  // Client-side preview text
  const getPreviewText = (text: string): string => {
    if (!sampleParticipant) return text;
    let result = text;
    result = result.replace(/{vorname}/g, sampleParticipant.first_name);
    result = result.replace(/{nachname}/g, sampleParticipant.last_name);
    result = result.replace(/{pfadiname}/g, sampleParticipant.scout_name);
    result = result.replace(/{event_name}/g, event.name);
    result = result.replace(/{buchungsoption}/g, sampleParticipant.booking_option_name || '');
    const opt = event.booking_options.find((o) => o.id === sampleParticipant.booking_option_id);
    result = result.replace(/{preis}/g, opt ? `${parseFloat(opt.price).toFixed(2)} \u20AC` : '0.00 \u20AC');
    result = result.replace(/{bezahlt}/g, `${parseFloat(sampleParticipant.total_paid).toFixed(2)} \u20AC`);
    result = result.replace(/{restbetrag}/g, `${parseFloat(sampleParticipant.remaining_amount).toFixed(2)} \u20AC`);
    return result;
  };

  const getRecipientCount = (): number => {
    if (recipientType === 'all') return allParticipants.length;
    if (recipientType === 'selected') return selectedParticipantIds.size;
    return allParticipants.length;
  };

  // Generate personalized message for a specific participant
  const getPersonalizedMessage = (participant: Participant): string => {
    let result = body;
    result = result.replace(/{vorname}/g, participant.first_name);
    result = result.replace(/{nachname}/g, participant.last_name);
    result = result.replace(/{pfadiname}/g, participant.scout_name);
    result = result.replace(/{event_name}/g, event.name);
    result = result.replace(/{buchungsoption}/g, participant.booking_option_name || '');
    const opt = event.booking_options.find((o) => o.id === participant.booking_option_id);
    result = result.replace(/{preis}/g, opt ? `${parseFloat(opt.price).toFixed(2)} \u20AC` : '0.00 \u20AC');
    result = result.replace(/{bezahlt}/g, `${parseFloat(participant.total_paid).toFixed(2)} \u20AC`);
    result = result.replace(/{restbetrag}/g, `${parseFloat(participant.remaining_amount).toFixed(2)} \u20AC`);
    return result;
  };

  // Copy message to clipboard
  const copyMessage = async (participant: Participant) => {
    const text = getPersonalizedMessage(participant);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(participant.id);
      toast.success(`Nachricht fuer ${participant.first_name} kopiert`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  // Get filtered participants based on current selection
  const getSelectedParticipants = (): Participant[] => {
    if (recipientType === 'selected') {
      return allParticipants.filter((p) => selectedParticipantIds.has(p.id));
    }
    return allParticipants;
  };

  const toggleParticipant = (id: number) => {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle preview request (server-side with WhatsApp availability check)
  function handlePreview() {
    previewMutation.mutate(buildSendBody(), {
      onSuccess: (data) => {
        setPreviewData(data);
        setShowPreview(true);
      },
      onError: (err) => toast.error('Vorschau-Fehler', { description: err.message }),
    });
  }

  // Handle send
  function handleSend() {
    sendMutation.mutate(buildSendBody(), {
      onSuccess: (result) => {
        setShowConfirm(false);
        setSendResult(result);
        if (result.failed_count === 0) {
          toast.success(`${result.sent_count} Nachricht(en) erfolgreich gesendet`);
        } else {
          toast.warning(
            `${result.sent_count} gesendet, ${result.failed_count} fehlgeschlagen`,
          );
        }
        // Reset form
        setSubject('');
        setBody('');
        setSelectedParticipantIds(new Set());
        setPreviewData(null);
        setShowPreview(false);
      },
      onError: (err) => {
        setShowConfirm(false);
        toast.error('Fehler beim Senden', { description: err.message });
      },
    });
  }

  // Apply template
  function applyTemplate(template: MessageTemplate) {
    setBody(template.body);
    if (channel === 'email' && template.subject) {
      setSubject(template.subject);
    }
    setShowTemplates(false);
  }

  // Save current message as template
  function handleSaveTemplate() {
    if (!newTemplateTitle.trim()) return;
    createTemplate.mutate(
      { title: newTemplateTitle, subject, body },
      {
        onSuccess: () => {
          toast.success('Vorlage gespeichert');
          setShowSaveTemplate(false);
          setNewTemplateTitle('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  const canSend =
    body.trim().length > 0 &&
    (channel !== 'email' || subject.trim().length > 0) &&
    (recipientType !== 'selected' || selectedParticipantIds.size > 0) &&
    (channel !== 'whatsapp' || isWhatsAppConnected);

  const channelLabel = channel === 'email' ? 'E-Mail' : 'WhatsApp';

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* Channel Selector */}
      {/* ================================================================ */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
          Kanal
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setChannel('email')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all flex-1',
              channel === 'email'
                ? 'bg-violet-100 border-violet-300 text-violet-700'
                : 'hover:bg-muted',
            )}
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            E-Mail
          </button>
          <button
            onClick={() => setChannel('whatsapp')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all flex-1',
              channel === 'whatsapp'
                ? 'bg-green-100 border-green-300 text-green-700'
                : 'hover:bg-muted',
            )}
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            WhatsApp
            {isWhatsAppConnected ? (
              <span className="w-2 h-2 rounded-full bg-green-500 ml-auto" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-300 ml-auto" />
            )}
          </button>
        </div>

        {/* WhatsApp not connected warning */}
        {channel === 'whatsapp' && !isWhatsAppConnected && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5">
              info
            </span>
            <div>
              <p className="font-medium text-amber-800">WhatsApp nicht verbunden</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Du kannst dein WhatsApp-Konto in den{' '}
                <Link to="/profile" className="underline font-medium">
                  Profileinstellungen
                </Link>{' '}
                verbinden, um direkt zu senden. Oder verfasse deine Nachricht und kopiere sie fuer jeden Teilnehmer einzeln.
              </p>
            </div>
          </div>
        )}

        {/* WhatsApp formatting hint */}
        {channel === 'whatsapp' && isWhatsAppConnected && (
          <p className="mt-2 text-xs text-muted-foreground">
            Formatierung: <code className="bg-muted px-1 rounded">*fett*</code>{' '}
            <code className="bg-muted px-1 rounded">_kursiv_</code>{' '}
            <code className="bg-muted px-1 rounded">~durchgestrichen~</code>{' '}
            <code className="bg-muted px-1 rounded">```Code```</code>
          </p>
        )}
      </div>

      {/* ================================================================ */}
      {/* Recipient Selection */}
      {/* ================================================================ */}
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

        {/* Filter options */}
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

        {/* Participant selection */}
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
                    selectedParticipantIds.has(p.id) ? 'bg-violet-50' : 'hover:bg-muted/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipantIds.has(p.id)}
                    onChange={() => toggleParticipant(p.id)}
                    className="accent-violet-600"
                  />
                  <span>{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {channel === 'email' ? p.email : p.phone_number || 'Keine Nr.'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">
            {channel === 'email' ? 'mail' : 'chat'}
          </span>
          {getRecipientCount()} Empfaenger
        </p>
      </div>

      {/* ================================================================ */}
      {/* Placeholders & Templates */}
      {/* ================================================================ */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">data_object</span>
            Platzhalter
          </h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-violet-600 hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">description</span>
            {showTemplates ? 'Ausblenden' : 'Vorlagen'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((ph) => (
            <button
              key={ph.key}
              onClick={() => setBody((prev) => prev + ph.key)}
              className="text-xs px-2 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors font-mono"
              title={ph.label}
            >
              {ph.key}
            </button>
          ))}
        </div>

        {/* Template selector */}
        {showTemplates && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              Klicke auf eine Vorlage, um den Text zu uebernehmen.
            </p>
            {(templates ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Keine Vorlagen vorhanden.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(templates ?? []).map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer group"
                    onClick={() => applyTemplate(tmpl)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{tmpl.title}</span>
                        {tmpl.is_system && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{tmpl.body}</p>
                    </div>
                    {!tmpl.is_system && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate.mutate(tmpl.id, {
                            onSuccess: () => toast.success('Vorlage geloescht'),
                            onError: (err) => toast.error('Fehler', { description: err.message }),
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1 rounded hover:bg-destructive/10 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Save as template */}
            {showSaveTemplate ? (
              <div className="flex gap-2 items-end pt-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Vorlagenname
                  </label>
                  <input
                    type="text"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                    placeholder="z.B. Zahlungserinnerung"
                  />
                </div>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateTitle.trim() || createTemplate.isPending}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 disabled:opacity-50"
                >
                  Speichern
                </button>
                <button
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setNewTemplateTitle('');
                  }}
                  className="px-3 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              body.trim().length > 0 && (
                <button
                  onClick={() => setShowSaveTemplate(true)}
                  className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">save</span>
                  Aktuelle Nachricht als Vorlage speichern
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Compose */}
      {/* ================================================================ */}
      <div className="rounded-xl border p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Nachricht verfassen
        </h3>

        {/* Subject field (email only) */}
        {channel === 'email' && (
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
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Nachricht *
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-y"
            placeholder={
              channel === 'email'
                ? 'Hallo {vorname},\n\nhier sind wichtige Infos zu {event_name}...\n\nViele Gruesse,\nDein Leitungsteam'
                : 'Hallo {vorname}, hier sind wichtige Infos zu {event_name}...'
            }
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* Preview (server-side with WhatsApp availability) */}
      {/* ================================================================ */}
      {showPreview && previewData && (
        <div className="rounded-xl border p-4 bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">preview</span>
              Vorschau
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Schliessen
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-4 text-sm">
            <span className="font-medium">{previewData.total_count} Empfaenger</span>
            <span className="text-green-600">
              {previewData.reachable_count} erreichbar
            </span>
            {previewData.unreachable_count > 0 && (
              <span className="text-red-600">
                {previewData.unreachable_count} nicht erreichbar
              </span>
            )}
          </div>

          {/* Recipient list */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {previewData.recipients.map((r) => (
              <RecipientRow key={r.participant_id} recipient={r} channel={channel} />
            ))}
          </div>

          {/* Sample message */}
          {previewData.sample_message && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Beispielnachricht (erster Empfaenger):
              </p>
              <div className={cn(
                'p-3 rounded-lg text-sm whitespace-pre-wrap',
                channel === 'whatsapp'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-white border',
              )}>
                {previewData.sample_message}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Client-side quick preview (no server call) */}
      {/* ================================================================ */}
      {!showPreview && body.trim() && sampleParticipant && (
        <div className="rounded-xl border p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">preview</span>
            Schnellvorschau ({sampleParticipant.first_name} {sampleParticipant.last_name})
          </h3>
          {channel === 'email' && subject && (
            <p className="text-sm mb-1">
              <span className="font-medium text-muted-foreground">Betreff:</span>{' '}
              {getPreviewText(subject)}
            </p>
          )}
          <p className="text-sm whitespace-pre-wrap">
            {getPreviewText(body)}
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* Send Result */}
      {/* ================================================================ */}
      {sendResult && (
        <div className={cn(
          'rounded-xl border p-4',
          sendResult.failed_count === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
        )}>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className={cn(
              'material-symbols-outlined text-[18px]',
              sendResult.failed_count === 0 ? 'text-green-600' : 'text-amber-600',
            )}>
              {sendResult.failed_count === 0 ? 'check_circle' : 'warning'}
            </span>
            Ergebnis
          </h3>
          <p className="text-sm">
            {sendResult.sent_count} gesendet
            {sendResult.failed_count > 0 && `, ${sendResult.failed_count} fehlgeschlagen`}
          </p>
          {sendResult.failed_recipients.length > 0 && (
            <div className="mt-2 space-y-1">
              {sendResult.failed_recipients.map((fr) => (
                <p key={fr.participant_id} className="text-xs text-red-600">
                  {fr.email || fr.phone_number || `ID ${fr.participant_id}`}: {fr.error}
                </p>
              ))}
            </div>
          )}
          <button
            onClick={() => setSendResult(null)}
            className="text-xs text-muted-foreground hover:underline mt-2"
          >
            Schliessen
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* Copy Messages (WhatsApp without account) */}
      {/* ================================================================ */}
      {channel === 'whatsapp' && !isWhatsAppConnected && body.trim() && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              Nachrichten zum Kopieren
            </h3>
            <button
              type="button"
              onClick={() => setShowCopyMessages(!showCopyMessages)}
              className="text-xs text-green-600 hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">
                {showCopyMessages ? 'expand_less' : 'expand_more'}
              </span>
              {showCopyMessages ? 'Ausblenden' : `${getSelectedParticipants().length} Nachrichten anzeigen`}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Kopiere die personalisierte Nachricht fuer jeden Teilnehmer und fuege sie manuell in WhatsApp ein.
          </p>

          {showCopyMessages && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {/* Copy all button */}
              {getSelectedParticipants().length > 1 && (
                <button
                  type="button"
                  onClick={async () => {
                    const all = getSelectedParticipants()
                      .map((p) => `--- ${p.first_name} ${p.last_name}${p.phone_number ? ` (${p.phone_number})` : ''} ---\n${getPersonalizedMessage(p)}`)
                      .join('\n\n');
                    try {
                      await navigator.clipboard.writeText(all);
                      toast.success('Alle Nachrichten kopiert');
                    } catch {
                      toast.error('Kopieren fehlgeschlagen');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">copy_all</span>
                  Alle {getSelectedParticipants().length} Nachrichten kopieren
                </button>
              )}

              {getSelectedParticipants().map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-lg border bg-muted/20 overflow-hidden"
                >
                  {/* Participant header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <span className="font-medium truncate">
                        {participant.first_name} {participant.last_name}
                      </span>
                      {participant.phone_number && (
                        <span className="text-xs text-muted-foreground">
                          {participant.phone_number}
                        </span>
                      )}
                      {!participant.phone_number && (
                        <span className="text-xs text-orange-500">Keine Nummer</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyMessage(participant)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all shrink-0',
                        copiedId === participant.id
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white border hover:bg-green-50 hover:border-green-200 hover:text-green-700',
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedId === participant.id ? 'check' : 'content_copy'}
                      </span>
                      {copiedId === participant.id ? 'Kopiert!' : 'Kopieren'}
                    </button>
                  </div>
                  {/* Message preview */}
                  <div className="px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {getPersonalizedMessage(participant)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Actions */}
      {/* ================================================================ */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={handlePreview}
          disabled={!body.trim() || previewMutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">preview</span>
          {previewMutation.isPending ? 'Wird geladen...' : 'Vorschau'}
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend}
          className={cn(
            'px-6 py-2 text-sm font-medium rounded-lg text-white transition-all disabled:opacity-50 flex items-center gap-1.5',
            channel === 'whatsapp'
              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg hover:shadow-green-500/25'
              : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:shadow-lg hover:shadow-violet-500/25',
          )}
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          {channelLabel} senden
        </button>
      </div>

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onConfirm={handleSend}
        onCancel={() => setShowConfirm(false)}
        title={`${channelLabel} senden?`}
        description={`${getRecipientCount()} Nachricht(en) per ${channelLabel} senden? Dieser Vorgang kann nicht rueckgaengig gemacht werden.`}
        confirmLabel="Senden"
        loading={sendMutation.isPending}
        variant="default"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecipientRow({
  recipient,
  channel,
}: {
  recipient: RecipientPreview;
  channel: MessageChannel;
}) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    available: { color: 'text-green-600', label: 'Auf WhatsApp' },
    unavailable: { color: 'text-red-600', label: 'Nicht auf WhatsApp' },
    no_phone: { color: 'text-gray-400', label: 'Keine Nummer' },
    no_contact: { color: 'text-gray-400', label: 'Kein Kontakt' },
    not_applicable: { color: 'text-gray-400', label: '' },
    unknown: { color: 'text-gray-400', label: 'Unbekannt' },
  };

  const cfg = statusConfig[recipient.whatsapp_status] ?? statusConfig.unknown;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg text-sm">
      <span className="font-medium flex-1 truncate">{recipient.name}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
        {recipient.contact || '–'}
      </span>
      {channel === 'whatsapp' && cfg.label && (
        <span className={cn('text-xs font-medium', cfg.color)}>
          {cfg.label}
        </span>
      )}
    </div>
  );
}
