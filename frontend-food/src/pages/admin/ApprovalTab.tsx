import { useState } from 'react';
import { toast } from 'sonner';
import { useApprovalQueue, useApprovalAction, type ApprovalQueueItem } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function ApprovalTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useApprovalQueue(page);
  const approvalAction = useApprovalAction();
  const [rejectItem, setRejectItem] = useState<ApprovalQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  function handleApprove(item: ApprovalQueueItem) {
    approvalAction.mutate(
      { contentType: item.content_type, objectId: item.object_id, action: 'approve' },
      {
        onSuccess: (result) => toast.success(result.message),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  function handleReject() {
    if (!rejectItem) return;
    approvalAction.mutate(
      { contentType: rejectItem.content_type, objectId: rejectItem.object_id, action: 'reject', reason: rejectReason },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          setRejectItem(null);
          setRejectReason('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Fehler beim Laden: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Lade Freigaben...
      </div>
    );
  }

  const items = data?.items ?? [];
  const recipeItems = items.filter((i) => i.content_type === 'recipe');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Rezepte, die auf Freigabe warten ({recipeItems.length} offen).
        </p>
      </div>

      {recipeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-card text-center text-muted-foreground">
          <Inbox className="h-8 w-8 mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium">Keine Rezepte zur Freigabe</p>
          <p className="text-xs text-muted-foreground mt-1">Es liegen aktuell keine neuen Freigabeanfragen vor.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipeItems.map((item) => (
            <div
              key={`${item.content_type}-${item.object_id}`}
              className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base font-display text-foreground leading-snug line-clamp-1">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  von <span className="font-medium text-foreground">{item.author ?? 'Unbekannt'}</span> &middot; {new Date(item.submitted_at).toLocaleDateString('de-DE')}
                </p>
                {item.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => handleApprove(item)}
                  disabled={approvalAction.isPending}
                  className="flex-1 gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Freigeben
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectItem(item)}
                  disabled={approvalAction.isPending}
                  className="flex-1 gap-1.5 border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/5"
                >
                  <X className="h-3.5 w-3.5" />
                  Ablehnen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            Seite {page} von {data.total_pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.total_pages}
            className="gap-1"
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectItem} onOpenChange={(open) => !open && setRejectItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Rezept ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              „<span className="font-medium text-foreground">{rejectItem?.title}</span>“ wird abgelehnt. Bitte gib einen Grund für die Ablehnung an.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Grund für die Ablehnung..."
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => { setRejectItem(null); setRejectReason(''); }}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || approvalAction.isPending}
            >
              Ablehnen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
