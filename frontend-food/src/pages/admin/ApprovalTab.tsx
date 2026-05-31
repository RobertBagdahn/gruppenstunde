import { useState } from 'react';
import { toast } from 'sonner';
import { useApprovalQueue, useApprovalAction, type ApprovalQueueItem } from '@/api/admin';

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
    return <p className="text-sm text-destructive">Fehler beim Laden: {error.message}</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Lade Freigaben...</p>;
  }

  const items = data?.items ?? [];
  const recipeItems = items.filter((i) => i.content_type === 'recipe');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rezepte, die auf Freigabe warten ({recipeItems.length} offen).
      </p>

      {recipeItems.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Keine Rezepte zur Freigabe.</p>
      )}

      <div className="space-y-3">
        {recipeItems.map((item) => (
          <div key={`${item.content_type}-${item.object_id}`} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  von {item.author ?? 'Unbekannt'} &middot; {new Date(item.submitted_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
            {item.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(item)}
                disabled={approvalAction.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Freigeben
              </button>
              <button
                onClick={() => setRejectItem(item)}
                disabled={approvalAction.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-xs border rounded disabled:opacity-50"
          >
            Zurück
          </button>
          <span className="text-xs py-1">Seite {page} / {data.total_pages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.total_pages}
            className="px-3 py-1 text-xs border rounded disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold">Rezept ablehnen</h3>
            <p className="text-sm text-muted-foreground">
              „{rejectItem.title}" wird abgelehnt. Bitte gib einen Grund an.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Grund für die Ablehnung..."
              className="w-full border rounded-lg p-3 text-sm min-h-[80px]"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectItem(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm border rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || approvalAction.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
