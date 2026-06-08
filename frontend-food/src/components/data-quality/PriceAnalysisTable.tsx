import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { usePriceAnalysis, usePriceEvaluate, usePriceApply } from '@/api/dataQuality';
import type { PriceAnomaly, PriceSuggestion } from '@/schemas/dataQuality';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, HelpCircle, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

const ANOMALY_TYPE_OPTIONS = [
  { value: '', label: 'Alle Typen' },
  { value: 'high', label: 'Zu hoch' },
  { value: 'low', label: 'Zu niedrig' },
  { value: 'missing', label: 'Fehlender Preis' },
] as const;

function anomalyBadge(type: PriceAnomaly['anomaly_type']) {
  switch (type) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <TrendingUp className="h-3 w-3" />Zu hoch
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <TrendingDown className="h-3 w-3" />Zu niedrig
        </span>
      );
    case 'missing':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <HelpCircle className="h-3 w-3" />Fehlt
        </span>
      );
  }
}

function formatPrice(val: string | null | undefined): string {
  if (val == null) return '–';
  const num = parseFloat(val);
  if (isNaN(num)) return '–';
  return num.toFixed(2) + ' €/kg';
}

export default function PriceAnalysisTable() {
  const [page, setPage] = useState(1);
  const [anomalyType, setAnomalyType] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = usePriceAnalysis({ page, page_size: 20, anomaly_type: anomalyType || undefined });
  const evaluateMutation = usePriceEvaluate();
  const applyMutation = usePriceApply();

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!data?.items) return;
    const allIds = data.items.map((i) => i.id);
    if (allIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }, [data, selected]);

  const handleEvaluate = async () => {
    if (selected.size === 0) {
      toast.error('Mindestens eine Zutat auswählen');
      return;
    }
    try {
      const res = await evaluateMutation.mutateAsync({ ingredient_ids: [...selected] });
      setSuggestions(res.suggestions);
      setShowComparison(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler bei der KI-Bewertung');
    }
  };

  const handleApplyOne = async (ingredientId: number, pricePerKg: string) => {
    try {
      await applyMutation.mutateAsync({ items: [{ ingredient_id: ingredientId, price_per_kg: pricePerKg }] });
      setAppliedIds((prev) => new Set(prev).add(ingredientId));
      toast.success('Preis übernommen');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Übernehmen');
    }
  };

  const handleApplyAll = async () => {
    try {
      await applyMutation.mutateAsync({
        items: suggestions
          .filter((s) => s.suggested_price != null && !appliedIds.has(s.ingredient_id))
          .map((s) => ({ ingredient_id: s.ingredient_id, price_per_kg: s.suggested_price! })),
      });
      setAppliedIds(new Set(suggestions.map((s) => s.ingredient_id)));
      toast.success('Alle Preise übernommen');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Übernehmen');
    }
  };

  const resetComparison = () => {
    setShowComparison(false);
    setSuggestions([]);
    setSelected(new Set());
    setAppliedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={anomalyType}
          onChange={(e) => { setAnomalyType(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {ANOMALY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {selected.size > 0 && !showComparison && (
          <Button
            variant="default"
            size="sm"
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending}
          >
            {evaluateMutation.isPending ? (
              <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {selected.size} {selected.size === 1 ? 'Zutat' : 'Zutaten'} mit KI bewerten
          </Button>
        )}

        {showComparison && (
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleApplyAll} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              Alle übernehmen
            </Button>
            <Button variant="outline" size="sm" onClick={resetComparison}>
              Zurück zur Liste
            </Button>
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-2xl text-muted-foreground" />
        </div>
      )}
      {error && <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>}

      {/* Comparison Table (after AI evaluation) */}
      {showComparison && suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">KI-Bewertung</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">Zutat</th>
                  <th className="text-left px-4 py-2.5 font-medium">Aktuell</th>
                  <th className="text-left px-4 py-2.5 font-medium">KI-Vorschlag</th>
                  <th className="text-left px-4 py-2.5 font-medium">Begründung</th>
                  <th className="text-right px-4 py-2.5 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => {
                  const ingredient = data?.items?.find((i) => i.id === s.ingredient_id);
                  const isApplied = appliedIds.has(s.ingredient_id);
                  return (
                    <tr key={s.ingredient_id} className={cn('border-t border-border', isApplied && 'opacity-50')}>
                      <td className="px-4 py-2.5 font-medium">{ingredient?.name ?? `#${s.ingredient_id}`}</td>
                      <td className="px-4 py-2.5">{formatPrice(s.current_price)}</td>
                      <td className="px-4 py-2.5 text-primary font-medium">{formatPrice(s.suggested_price)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{s.reasoning}</td>
                      <td className="px-4 py-2.5 text-right">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3 w-3" />Übernommen
                          </span>
                        ) : s.suggested_price != null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyOne(s.ingredient_id, s.suggested_price!)}
                          >
                            Übernehmen
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Kein Vorschlag</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Price Analysis Table */}
      {!showComparison && data && data.items.length > 0 && (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={data.items.every((i) => selected.has(i.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Preis</th>
                  <th className="text-left px-4 py-2.5 font-medium">Abteilung</th>
                  <th className="text-right px-4 py-2.5 font-medium">Z-Score</th>
                  <th className="text-left px-4 py-2.5 font-medium">Typ</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: PriceAnomaly) => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={`/ingredients/${item.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.name}
                      </a>
                    </td>
                    <td className="px-4 py-2.5">{formatPrice(item.price_per_kg)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.retail_section ?? '–'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">
                      {item.z_score != null ? item.z_score.toFixed(2) : '–'}
                    </td>
                    <td className="px-4 py-2.5">{anomalyBadge(item.anomaly_type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={setPage}
          />
        </>
      )}

      {!showComparison && !isLoading && !error && data && data.items.length === 0 && (
        <div className="text-muted-foreground py-4">Keine Preis-Ausreißer gefunden</div>
      )}
    </div>
  );
}
