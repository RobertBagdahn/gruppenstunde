import { useState } from 'react';
import { useNutritionPlausibility, useAiFillMissingIngredient, useAiFillMissingBatch } from '@/api/dataQuality';
import type { NutritionPlausibility } from '@/schemas/dataQuality';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

const ANOMALY_OPTIONS = [
  { value: '', label: 'Alle Auffälligkeiten' },
  { value: 'sugar_gt_carbs', label: 'Zucker > Kohlenhydrate' },
  { value: 'sat_fat_gt_fat', label: 'Gesättigtes Fett > Gesamtfett' },
  { value: 'macro_sum', label: 'Makro-Summe > 100g' },
  { value: 'missing_energy', label: 'Fehlende Kalorien (trotz Makros)' },
  { value: 'missing_macros', label: 'Fehlende Makros (trotz Kalorien)' },
  { value: 'extreme_energy', label: 'Energiedichte > 900 kcal' },
] as const;

export default function NutritionPlausibilityList() {
  const [page, setPage] = useState(1);
  const [anomalyType, setAnomalyType] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fillingId, setFillingId] = useState<number | null>(null);

  const { data, isLoading, error } = useNutritionPlausibility({
    page,
    page_size: 20,
    anomaly_type: anomalyType || undefined,
    search: search.trim() || undefined,
  });

  const fillSingleMutation = useAiFillMissingIngredient();
  const fillBatchMutation = useAiFillMissingBatch();

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (!data?.items) return;
    const allIds = data.items.map((i) => i.id);
    if (allIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleFillSingle = async (item: NutritionPlausibility) => {
    setFillingId(item.id);
    try {
      const result = await fillSingleMutation.mutateAsync(item.id);
      if (result.filled_fields.length > 0) {
        const labels = result.filled_fields.map((f) => f.label).slice(0, 3).join(', ');
        const more = result.filled_fields.length > 3 ? ` und ${result.filled_fields.length - 3} weitere` : '';
        toast.success(`Stammdaten für "${item.name}" ergänzt: ${labels}${more}`);
      } else {
        toast.info(`Keine leeren Felder für "${item.name}" gefunden. Bestehende Daten wurden beibehalten.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler bei der KI-Ergänzung');
    } finally {
      setFillingId(null);
    }
  };

  const handleFillBatch = async () => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : data?.items?.map((i) => i.id) || [];
    if (targetIds.length === 0) {
      toast.error('Keine Zutaten zum Ergänzen vorhanden');
      return;
    }

    try {
      toast.info(`Ergänze fehlende Stammdaten für ${targetIds.length} Zutaten mit KI...`);
      const result = await fillBatchMutation.mutateAsync({ ingredient_ids: targetIds });
      toast.success(
        `${result.total_filled} von ${targetIds.length} Zutaten erfolgreich mit fehlenden Stammdaten ergänzt!`
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Batch-Auffüllen');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-3xl text-primary" />
        <p className="text-sm text-muted-foreground">Prüfe Datenqualität und Plausibilität...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive space-y-2">
        <p className="font-semibold">Fehler beim Laden der Datenqualität</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  const allPageIdsSelected =
    data?.items && data.items.length > 0 && data.items.every((i) => selectedIds.has(i.id));

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Zutat suchen..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <select
            value={anomalyType}
            onChange={(e) => {
              setAnomalyType(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ANOMALY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Batch AI Magic Wand */}
        <Button
          onClick={handleFillBatch}
          disabled={fillBatchMutation.isPending || !data?.items?.length}
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
          title="Füllt fehlende Stammdaten mit KI auf. Bestehende Daten werden niemals überschrieben."
        >
          {fillBatchMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
          <span>
            {selectedIds.size > 0
              ? `${selectedIds.size} mit KI auffüllen`
              : 'Seite mit KI auffüllen'}
          </span>
        </Button>
      </div>

      {/* Summary Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          {data?.total ?? 0} {data?.total === 1 ? 'Auffälligkeit' : 'Auffälligkeiten'} gefunden
          {anomalyType && ' (gefiltert)'}
        </div>
        {data?.items && data.items.length > 0 && (
          <button
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium cursor-pointer"
          >
            {allPageIdsSelected ? (
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
            <span>{allPageIdsSelected ? 'Auswahl aufheben' : 'Alle auf Seite auswählen'}</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {!data?.items?.length && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="font-medium text-foreground">Keine Datenfehler gefunden</p>
          <p className="text-sm text-muted-foreground">
            {search || anomalyType
              ? 'Für die gewählten Filter wurden keine Auffälligkeiten gefunden.'
              : 'Alle Nährwerte und Stammdaten der geprüften Zutaten sind plausibel erfasst.'}
          </p>
        </div>
      )}

      {/* List of Data Issues */}
      <div className="space-y-2.5">
        {data?.items?.map((item: NutritionPlausibility) => {
          const isSelected = selectedIds.has(item.id);
          const isFilling = fillingId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3.5 transition-all ${
                isSelected
                  ? 'border-primary/50 bg-primary/5'
                  : item.severity === 'error'
                  ? 'border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/15'
                  : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/15'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleSelect(item.id)}
                  className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <a
                      href={`/ingredients/${item.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors inline-flex items-center gap-1 group text-sm"
                    >
                      <span>{item.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                    </a>

                    {item.severity === 'error' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                        <XCircle className="h-3 w-3" />
                        Fehler
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        Warnung
                      </span>
                    )}
                  </div>

                  {/* Primary Issue description */}
                  <div className="text-xs font-semibold text-red-700 dark:text-red-300">
                    {item.issue}
                  </div>

                  {/* Nutritional values snippet */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {item.energy_kcal != null ? `${Math.round(item.energy_kcal)} kcal` : '– kcal'}
                    </span>
                    <span>P: {item.protein_g != null ? `${item.protein_g.toFixed(1)}g` : '–'}</span>
                    <span>F: {item.fat_g != null ? `${item.fat_g.toFixed(1)}g` : '–'}</span>
                    <span>KH: {item.carbohydrate_g != null ? `${item.carbohydrate_g.toFixed(1)}g` : '–'}</span>
                    {item.sugar_g != null && (
                      <span className="text-muted-foreground/80">(Zucker: {item.sugar_g.toFixed(1)}g)</span>
                    )}
                    {item.fat_sat_g != null && (
                      <span className="text-muted-foreground/80">(ges. Fett: {item.fat_sat_g.toFixed(1)}g)</span>
                    )}
                    {item.macro_sum != null && item.macro_sum > 100 && (
                      <span className="text-red-600 font-semibold">
                        Summe: {item.macro_sum.toFixed(1)}g
                      </span>
                    )}
                  </div>
                </div>

                {/* Magic wand action per item */}
                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    type="button"
                    onClick={() => handleFillSingle(item)}
                    disabled={isFilling || fillBatchMutation.isPending}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Fehlende Stammdaten mit KI ergänzen (bestehende Daten bleiben unverändert)"
                  >
                    {isFilling ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                    <span className="hidden sm:inline">KI-Zauberstab</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <Pagination
          currentPage={data.page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
