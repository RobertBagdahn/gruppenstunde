import { useState } from 'react';
import { toast } from 'sonner';
import { useApprovalQueue, useApprovalAction, type ApprovalQueueItem } from '@/api/admin';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  groupsession: 'Gruppenstunde',
  blog: 'Blog',
  game: 'Spiel',
  recipe: 'Rezept',
};

const CONTENT_TYPE_URLS: Record<string, string> = {
  groupsession: '/sessions/',
  blog: '/blogs/',
  game: '/games/',
  recipe: '/recipes/',
};

export default function ApprovalQueuePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useApprovalQueue(page);
  const approvalAction = useApprovalAction();
  const [rejectDialogItem, setRejectDialogItem] = useState<ApprovalQueueItem | null>(null);
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

  function handleRejectSubmit() {
    if (!rejectDialogItem) return;
    approvalAction.mutate(
      {
        contentType: rejectDialogItem.content_type,
        objectId: rejectDialogItem.object_id,
        action: 'reject',
        reason: rejectReason,
      },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          setRejectDialogItem(null);
          setRejectReason('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Fehler beim Laden der Genehmigungswarteschlange.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Genehmigungswarteschlange</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Eingereichte Inhalte pruefen und genehmigen oder ablehnen
          </p>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} ausstehend</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse h-24" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">check_circle</span>
          <p className="text-lg font-medium">Keine ausstehenden Genehmigungen</p>
          <p className="text-sm mt-1">Alle eingereichten Inhalte wurden bearbeitet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item) => (
            <div
              key={`${item.content_type}-${item.object_id}`}
              className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                      {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
                    </span>
                    {item.author && (
                      <span className="text-xs text-muted-foreground">
                        von {item.author}
                      </span>
                    )}
                  </div>
                  <a
                    href={`${CONTENT_TYPE_URLS[item.content_type] ?? '/'}${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-semibold hover:underline"
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Eingereicht: {new Date(item.submitted_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={approvalAction.isPending}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Genehmigen
                  </button>
                  <button
                    onClick={() => { setRejectDialogItem(item); setRejectReason(''); }}
                    disabled={approvalAction.isPending}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
          >
            Zurueck
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Seite {data.page} / {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
          >
            Weiter
          </button>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Inhalt ablehnen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              &quot;{rejectDialogItem.title}&quot; ablehnen? Bitte gib einen Grund an.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Grund fuer die Ablehnung..."
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectDialogItem(null)}
                className="px-4 py-2 rounded-md border text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={approvalAction.isPending}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
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
