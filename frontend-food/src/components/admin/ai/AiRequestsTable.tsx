import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAiInteractionDetail, useAiInteractions } from '@/api/aiInteraction';
import type { AiInteractionFilters } from '@/api/aiInteraction';
import type { AiInteractionItem } from '@/schemas/aiInteraction';
import { AiContextChoices } from '@/lib/aiContextLabels';
import Pagination from '@/components/shared/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';

const CONTEXT_OPTIONS = Object.entries(AiContextChoices).sort(([, labelA], [, labelB]) =>
  labelA.localeCompare(labelB, 'de'),
);

const PAGE_PARAM = 'ai_page';
const CONTEXT_PARAM = 'ai_context';
const SUCCESS_PARAM = 'ai_success';
const BACKGROUND_PARAM = 'ai_background';
const VOTE_PARAM = 'ai_vote';
const SEARCH_PARAM = 'ai_search';

function getPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatCost(value: number | null): string {
  if (value == null) return '–';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function formatPrompt(prompt: Record<string, unknown> | unknown[] | string | null): string {
  if (prompt == null) return '–';
  if (typeof prompt === 'string') return prompt;
  return JSON.stringify(prompt, null, 2) ?? '–';
}

function RequestRow({
  item,
  expanded,
  onToggle,
}: {
  item: AiInteractionItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: detail, isLoading } = useAiInteractionDetail(expanded ? item.id : null);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.success ? 'bg-primary' : 'bg-destructive'}`}
            aria-label={item.success ? 'Erfolgreich' : 'Fehlgeschlagen'}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">{AiContextChoices[item.context] ?? item.context}</span>
              <span className="text-xs text-muted-foreground">{item.model}</span>
              {item.is_background && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  System
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{formatDate(item.created_at)}</span>
              <span>{item.user_name ?? 'System'}</span>
              <span>{item.total_tokens?.toLocaleString('de-DE') ?? '–'} Tokens</span>
              <span>{formatCost(item.cost_eur)}</span>
              {item.vote === 'up' && <span className="text-primary">Daumen hoch</span>}
              {item.vote === 'down' && <span className="text-destructive">Daumen runter</span>}
            </div>
            {item.error_code && <p className="text-xs text-destructive">{item.error_code}</p>}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t bg-muted/20 p-3 text-xs">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {detail && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <span>Dauer: {detail.duration_ms != null ? `${detail.duration_ms} ms` : '–'}</span>
                <span>Ergebnis: {detail.success ? 'Erfolgreich' : 'Fehlgeschlagen'}</span>
                <span>Vote: {detail.vote === 'up' ? '👍' : detail.vote === 'down' ? '👎' : 'Noch nicht bewertet'}</span>
                <span>Kosten: {formatCost(detail.cost_eur)}</span>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Anfrage</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-2">
                  {formatPrompt(detail.prompt)}
                </pre>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted-foreground">Antwort</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-2">
                  {detail.response || '–'}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiRequestsTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const page = getPage(searchParams.get(PAGE_PARAM));
  const filters: AiInteractionFilters = {
    page,
    page_size: 20,
    context: searchParams.get(CONTEXT_PARAM) || undefined,
    success: searchParams.get(SUCCESS_PARAM) || undefined,
    is_background: searchParams.get(BACKGROUND_PARAM) || undefined,
    has_vote: searchParams.get(VOTE_PARAM) || undefined,
    search: searchParams.get(SEARCH_PARAM) || undefined,
  };

  const { data, isLoading, error } = useAiInteractions(filters);

  const updateParams = (changes: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    });
    setExpandedId(null);
  };

  const updateFilter = (
    key: typeof CONTEXT_PARAM | typeof SUCCESS_PARAM | typeof BACKGROUND_PARAM | typeof VOTE_PARAM | typeof SEARCH_PARAM,
    value: string,
  ) => updateParams({ [key]: value || null, [PAGE_PARAM]: null });

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <CardTitle>Alle Anfragen</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Jeder KI-Aufruf mit Status, Kosten und vollständigen Anfrage-Details.
            </p>
          </div>
          {data && <span className="text-sm text-muted-foreground">{data.total.toLocaleString('de-DE')} Einträge</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={searchParams.get(CONTEXT_PARAM) ?? ''}
            onChange={(event) => updateFilter(CONTEXT_PARAM, event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Alle Kontexte</option>
            {CONTEXT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={searchParams.get(SUCCESS_PARAM) ?? ''}
            onChange={(event) => updateFilter(SUCCESS_PARAM, event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Alle Ergebnisse</option>
            <option value="true">Erfolgreich</option>
            <option value="false">Fehlgeschlagen</option>
          </select>
          <select
            value={searchParams.get(BACKGROUND_PARAM) ?? ''}
            onChange={(event) => updateFilter(BACKGROUND_PARAM, event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Alle Aufrufer</option>
            <option value="false">Nur Nutzer</option>
            <option value="true">Nur System</option>
          </select>
          <select
            value={searchParams.get(VOTE_PARAM) ?? ''}
            onChange={(event) => updateFilter(VOTE_PARAM, event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Alle Bewertungen</option>
            <option value="true">Nur bewertet</option>
            <option value="false">Nur unbewertet</option>
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchParams.get(SEARCH_PARAM) ?? ''}
              onChange={(event) => updateFilter(SEARCH_PARAM, event.target.value)}
              placeholder="Anfrage, Antwort oder Fehler suchen..."
              className="h-9 pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="py-8 text-center text-destructive">Fehler beim Laden der Anfragen: {error.message}</p>}
        {!isLoading && !error && data?.items.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">Keine Anfragen für diese Filter gefunden.</p>
        )}
        {data?.items.map((item) => (
          <RequestRow
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
          />
        ))}
        {data && data.total_pages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={data.total_pages}
            onPageChange={(nextPage) => updateParams({ [PAGE_PARAM]: String(nextPage) })}
          />
        )}
      </CardContent>
    </Card>
  );
}
