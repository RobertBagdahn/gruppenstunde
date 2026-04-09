import { useState } from 'react';
import { useEmbeddingFeedback } from '@/api/admin';

const FEEDBACK_TYPE_OPTIONS = [
  { value: '', label: 'Alle Typen' },
  { value: 'helpful', label: 'Hilfreich' },
  { value: 'not_helpful', label: 'Nicht hilfreich' },
  { value: 'wrong', label: 'Falsch' },
  { value: 'offensive', label: 'Unangemessen' },
];

const FEEDBACK_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  helpful: { label: 'Hilfreich', className: 'bg-green-100 text-green-700' },
  not_helpful: { label: 'Nicht hilfreich', className: 'bg-amber-100 text-amber-700' },
  wrong: { label: 'Falsch', className: 'bg-red-100 text-red-700' },
  offensive: { label: 'Unangemessen', className: 'bg-red-200 text-red-800' },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  groupsession: 'Gruppenstunde',
  blog: 'Blog',
  game: 'Spiel',
  recipe: 'Rezept',
};

export default function EmbeddingFeedbackPage() {
  const [feedbackType, setFeedbackType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useEmbeddingFeedback(feedbackType, page);

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Fehler beim Laden des Embedding-Feedbacks.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Embedding-Feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Nutzerfeedback zu KI-generierten Empfehlungen
          </p>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total} Eintraege</span>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={feedbackType}
          onChange={(e) => { setFeedbackType(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {FEEDBACK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse h-16" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">feedback</span>
          <p className="text-lg font-medium">Kein Feedback vorhanden</p>
          <p className="text-sm mt-1">Es wurde noch kein Feedback zu Empfehlungen abgegeben.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((item) => {
            const typeInfo = FEEDBACK_TYPE_LABELS[item.feedback_type] ?? {
              label: item.feedback_type,
              className: 'bg-muted',
            };

            return (
              <div
                key={item.id}
                className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.className}`}>
                        {typeInfo.label}
                      </span>
                      {item.created_by_name && (
                        <span className="text-xs text-muted-foreground">
                          von {item.created_by_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Verknuepfung: </span>
                      <span className="font-medium">
                        {item.source_title || `${CONTENT_TYPE_LABELS[item.source_content_type] ?? item.source_content_type}`}
                      </span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="font-medium">
                        {item.target_title || `${CONTENT_TYPE_LABELS[item.target_content_type] ?? item.target_content_type}`}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}
