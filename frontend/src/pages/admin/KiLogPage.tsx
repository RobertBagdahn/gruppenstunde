import { useState } from 'react';
import { useAiInteractions, useAiInteractionDetail, type AiInteractionFilters } from '@/api/aiInteraction';

const CONTEXT_OPTIONS = [
  { value: '', label: 'Alle Kontexte' },
  { value: 'improve_text', label: 'Text verbessern' },
  { value: 'suggest_tags', label: 'Tags vorschlagen' },
  { value: 'refurbish', label: 'Umwandeln' },
  { value: 'image_generation', label: 'Bild generieren' },
  { value: 'suggest_recipe_supplies', label: 'Rezept-Zubehör' },
  { value: 'suggest_materials', label: 'Material vorschlagen' },
  { value: 'generate_invitation', label: 'Einladung' },
  { value: 'packing_list_suggestions', label: 'Packliste' },
  { value: 'recipe_ai_create', label: 'Rezept erstellen' },
  { value: 'recipe_ai_suggest_all', label: 'Rezept vervollständigen' },
  { value: 'ingredient_ai_create', label: 'Zutat erstellen' },
  { value: 'ingredient_ai_suggest_all', label: 'Zutat vervollständigen' },
  { value: 'meal_plan_ai_suggest', label: 'Essensplan' },
  { value: 'normalize_portions', label: 'Portionen normalisieren' },
  { value: 'ingredient_parser', label: 'Zutat parsen' },
  { value: 'document_text_generation', label: 'Dokument-Text' },
];

export default function KiLogPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AiInteractionFilters>({ page: 1 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useAiInteractions(filters);
  const { data: detail, isLoading: detailLoading } = useAiInteractionDetail(expandedId);

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined, page: 1 };
    setFilters(newFilters);
    setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(p);
    setFilters({ ...filters, page: p });
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Fehler beim Laden des KI-Logs.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold">KI-Interaktions-Log</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Alle KI-Aufrufe mit Tokens, Kosten und Prompt/Response-Details
          </p>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">{data.total.toLocaleString()} Einträge</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={String(filters.context ?? '')}
          onChange={(e) => updateFilter('context', e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {CONTEXT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={String(filters.success ?? '')}
          onChange={(e) => updateFilter('success', e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">Alle</option>
          <option value="true">Erfolgreich</option>
          <option value="false">Fehlgeschlagen</option>
        </select>
        <select
          value={String(filters.is_background ?? '')}
          onChange={(e) => updateFilter('is_background', e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">Alle</option>
          <option value="false">Nur Nutzer</option>
          <option value="true">Nur System</option>
        </select>
        <select
          value={String(filters.has_vote ?? '')}
          onChange={(e) => updateFilter('has_vote', e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">Alle Votes</option>
          <option value="true">Nur bewertete</option>
          <option value="false">Nur unbewertete</option>
        </select>
        <input
          type="text"
          placeholder="Suche (Prompt/Response)..."
          value={String(filters.search ?? '')}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-muted animate-pulse h-12" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">psychology</span>
          <p className="text-lg font-medium">Keine Interaktionen gefunden</p>
          <p className="text-sm mt-1">Es gibt keine Einträge für diese Filter.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data?.items.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium truncate">{item.context}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{item.model}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                    <span className="tabular-nums">{item.total_tokens?.toLocaleString() ?? '—'} Tokens</span>
                    <span className="tabular-nums hidden sm:inline">{item.cost_eur != null ? `${item.cost_eur.toFixed(6)} €` : '—'}</span>
                    <span className="hidden sm:inline">{item.duration_ms != null ? `${item.duration_ms}ms` : '—'}</span>
                    {item.vote === 'up' && <span className="text-green-600">👍</span>}
                    {item.vote === 'down' && <span className="text-red-600">👎</span>}
                    {item.is_background && (
                      <span className="inline-flex text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5">System</span>
                    )}
                    {item.user_name && (
                      <span className="hidden sm:inline">{item.user_name}</span>
                    )}
                    <span className="hidden sm:inline">
                      {new Date(item.created_at).toLocaleString('de-DE')}
                    </span>
                  </div>
                </div>
                {item.error_code && (
                  <p className="text-xs text-red-600 mt-1 ml-5">{item.error_code}</p>
                )}
              </button>

              {/* Expanded Detail */}
              {expandedId === item.id && (
                <div className="rounded-lg border border-t-0 rounded-t-none bg-muted/30 p-4 space-y-3">
                  {detailLoading ? (
                    <div className="animate-pulse h-20 bg-muted rounded" />
                  ) : detail ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Modell:</span> {detail.model}</div>
                        <div><span className="text-muted-foreground">Dauer:</span> {detail.duration_ms != null ? `${detail.duration_ms}ms` : '—'}</div>
                        <div><span className="text-muted-foreground">Tokens:</span> {detail.total_tokens?.toLocaleString() ?? '—'}</div>
                        <div><span className="text-muted-foreground">Kosten:</span> {detail.cost_eur != null ? `${detail.cost_eur.toFixed(6)} €` : '—'}</div>
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">Prompt</summary>
                        <pre className="mt-2 p-3 rounded bg-muted text-xs overflow-x-auto max-h-96 whitespace-pre-wrap">
                          {JSON.stringify(detail.prompt, null, 2)}
                        </pre>
                      </details>
                      <details className="text-sm" open>
                        <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">Response</summary>
                        <pre className="mt-2 p-3 rounded bg-muted text-xs overflow-x-auto max-h-96 whitespace-pre-wrap">
                          {detail.response || '(leer)'}
                        </pre>
                      </details>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
          >
            Zurück
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Seite {data.page} / {data.total_pages}
          </span>
          <button
            onClick={() => goToPage(Math.min(data.total_pages, page + 1))}
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
