import { useState } from 'react';
import { toast } from 'sonner';
import { useEmbeddingStatus, useBatchUpdateEmbeddings } from '@/api/admin';

const CONTENT_TYPE_OPTIONS = [
  { value: '', label: 'Alle Typen' },
  { value: 'groupsession', label: 'Gruppenstunden' },
  { value: 'blog', label: 'Blogs' },
  { value: 'game', label: 'Spiele' },
  { value: 'recipe', label: 'Rezepte' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'missing', label: 'Fehlend' },
  { value: 'stale', label: 'Veraltet' },
  { value: 'current', label: 'Aktuell' },
];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  groupsession: 'Gruppenstunde',
  blog: 'Blog',
  game: 'Spiel',
  recipe: 'Rezept',
};

export default function EmbeddingViewerPage() {
  const [contentType, setContentType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useEmbeddingStatus(contentType, statusFilter, page);
  const batchUpdate = useBatchUpdateEmbeddings();

  function handleBatchUpdate(force = false) {
    batchUpdate.mutate(
      { content_type: contentType || undefined, force, limit: 100 },
      {
        onSuccess: (result) =>
          toast.success(
            `Embeddings: ${result.updated} aktualisiert, ${result.skipped} uebersprungen, ${result.failed} fehlgeschlagen`,
          ),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Fehler beim Laden der Embedding-Uebersicht.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Embedding-Uebersicht</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Status der Text-Embeddings fuer alle Inhalte
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleBatchUpdate(false)}
            disabled={batchUpdate.isPending}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {batchUpdate.isPending ? 'Laeuft...' : 'Fehlende aktualisieren'}
          </button>
          <button
            onClick={() => handleBatchUpdate(true)}
            disabled={batchUpdate.isPending}
            className="px-3 py-1.5 rounded-md text-sm font-medium border hover:bg-muted disabled:opacity-50"
          >
            Alle erneuern
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{data.stats.total}</p>
            <p className="text-xs text-muted-foreground">Gesamt</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-green-600">{data.stats.with_embedding}</p>
            <p className="text-xs text-muted-foreground">Mit Embedding</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-amber-600">{data.stats.stale}</p>
            <p className="text-xs text-muted-foreground">Veraltet</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold text-red-600">{data.stats.missing}</p>
            <p className="text-xs text-muted-foreground">Fehlend</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={contentType}
          onChange={(e) => { setContentType(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse h-12" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Keine Ergebnisse fuer die gewaehlten Filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Typ</th>
                <th className="text-left py-2 px-3 font-medium">Titel</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Embedding aktualisiert</th>
                <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Inhalt aktualisiert</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={`${item.content_type}-${item.object_id}`} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                      {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium">{item.title}</td>
                  <td className="py-2 px-3">
                    {!item.has_embedding ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Fehlend
                      </span>
                    ) : item.is_stale ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Veraltet
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Aktuell
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">
                    {item.embedding_updated_at
                      ? new Date(item.embedding_updated_at).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">
                    {new Date(item.content_updated_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
