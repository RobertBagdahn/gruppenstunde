/**
 * InvitationsTab — Admin-only tab showing invited users with their
 * response status (Zugesagt/Offen). Supports filtering, search, and
 * sending invitation PDFs via email.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { EventDetail } from '@/schemas/event';
import { useEventInvitations, useSendInvitation, useDownloadInvitationPdf } from '@/api/events';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

type StatusFilter = '' | 'accepted' | 'pending';
type RecipientType = 'groups' | 'selected';

export default function InvitationsTab({ event }: Props) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>('groups');
  const [subject, setSubject] = useState(`Einladung: ${event.name}`);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const { data, isLoading } = useEventInvitations(event.slug, {
    page,
    pageSize: 20,
    status: statusFilter,
    search,
  });

  const sendInvitation = useSendInvitation(event.slug);
  const downloadPdf = useDownloadInvitationPdf(event.slug);

  const counts = event.invitation_counts;

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: '', label: 'Alle', count: counts?.total },
    { key: 'accepted', label: 'Zugesagt', count: counts?.accepted },
    { key: 'pending', label: 'Offen', count: counts?.pending },
  ];

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSend = () => {
    sendInvitation.mutate(
      {
        recipient_type: recipientType,
        user_ids: recipientType === 'selected' ? selectedUserIds : undefined,
        subject,
      },
      {
        onSuccess: (result) => {
          toast.success(
            `Einladung verschickt an ${result.sent_count} Empfänger` +
              (result.failed_count > 0 ? ` (${result.failed_count} fehlgeschlagen)` : ''),
          );
          setShowSendDialog(false);
        },
        onError: (err) => toast.error('Versand fehlgeschlagen', { description: err.message }),
      },
    );
  };

  const handleDownloadPdf = () => {
    downloadPdf.mutate(undefined, {
      onSuccess: () => toast.success('PDF heruntergeladen'),
      onError: (err) => toast.error('PDF-Download fehlgeschlagen', { description: err.message }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadPdf.isPending}
          className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
          {downloadPdf.isPending ? 'Wird erstellt...' : 'PDF herunterladen'}
        </button>
        <button
          onClick={() => setShowSendDialog(true)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
          Einladung verschicken
        </button>
        <button
          onClick={() => navigate(`/events/app/${event.slug}/qr-code`)}
          className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
          QR-Code anzeigen
        </button>
      </div>

      {/* Filter buttons + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setStatusFilter(f.key);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
                statusFilter === f.key
                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <div className="relative">
            <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name oder E-Mail suchen..."
              className="w-full text-sm border rounded-lg pl-9 pr-3 py-2 bg-background"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-14 bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Invitation list */}
      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((inv) => (
            <div
              key={inv.user_id}
              className={cn(
                'flex items-center justify-between border rounded-lg p-3 text-sm',
                recipientType === 'selected' && 'cursor-pointer',
                recipientType === 'selected' &&
                  selectedUserIds.includes(inv.user_id) &&
                  'border-violet-300 bg-violet-50',
              )}
              onClick={
                recipientType === 'selected'
                  ? () => toggleUserSelection(inv.user_id)
                  : undefined
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                {recipientType === 'selected' && (
                  <div
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                      selectedUserIds.includes(inv.user_id)
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : 'border-input',
                    )}
                  >
                    {selectedUserIds.includes(inv.user_id) && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                  </div>
                )}
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {inv.first_name?.[0]}
                  {inv.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {inv.first_name} {inv.last_name}
                    {inv.scout_name && (
                      <span className="text-muted-foreground ml-1">({inv.scout_name})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {inv.group_name && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {inv.group_name}
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    inv.status === 'accepted'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700',
                  )}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {inv.status === 'accepted' ? 'check_circle' : 'schedule'}
                  </span>
                  {inv.status === 'accepted' ? 'Zugesagt' : 'Offen'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {data && data.items.length === 0 && (
        <div className="rounded-xl border p-6 text-center">
          <span className="material-symbols-outlined text-[40px] text-muted-foreground mb-2">
            person_search
          </span>
          <p className="text-sm text-muted-foreground">
            {search
              ? 'Keine Eingeladenen gefunden.'
              : 'Noch niemand eingeladen.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Seite {data.page} von {data.total_pages} ({data.total} gesamt)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= data.total_pages}
              className="px-2 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Send Invitation Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einladung verschicken</DialogTitle>
            <DialogDescription>
              Verschicke die Einladung als PDF per E-Mail an die Eingeladenen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="invitation-subject">Betreff</Label>
              <Input
                id="invitation-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff der E-Mail"
              />
            </div>

            {/* Recipient type */}
            <div className="space-y-2">
              <Label>Empfänger</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRecipientType('groups');
                    setSelectedUserIds([]);
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors text-center',
                    recipientType === 'groups'
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  <span className="material-symbols-outlined text-[16px] block mx-auto mb-1">
                    groups
                  </span>
                  Alle eingeladenen Gruppen
                </button>
                <button
                  onClick={() => setRecipientType('selected')}
                  className={cn(
                    'flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors text-center',
                    recipientType === 'selected'
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  <span className="material-symbols-outlined text-[16px] block mx-auto mb-1">
                    person
                  </span>
                  Einzelne Personen
                </button>
              </div>
            </div>

            {recipientType === 'selected' && (
              <p className="text-xs text-muted-foreground">
                Klicke auf die Personen in der Liste oben, um sie als Empfänger auszuwählen.
                {selectedUserIds.length > 0 && (
                  <span className="font-medium text-foreground ml-1">
                    {selectedUserIds.length} ausgewählt
                  </span>
                )}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSend}
                disabled={
                  sendInvitation.isPending ||
                  (recipientType === 'selected' && selectedUserIds.length === 0)
                }
                className="gradient-primary text-white hover:shadow-glow"
              >
                {sendInvitation.isPending ? (
                  'Wird gesendet...'
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px] mr-1">send</span>
                    Einladung senden
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
