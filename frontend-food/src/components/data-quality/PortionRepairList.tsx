import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  usePortionRepairApply,
  usePortionRepairFindings,
  usePortionRepairReject,
} from '@/api/portionRepair';
import type { PortionRepairFinding } from '@/schemas/portionRepair';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const STATUS_FILTERS = [
  { key: '', label: 'Alle' },
  { key: 'pending_review', label: 'Prüffälle' },
  { key: 'ready', label: 'Bereit' },
  { key: 'applied', label: 'Angewendet' },
  { key: 'rejected', label: 'Abgelehnt' },
  { key: 'skipped', label: 'Übersprungen' },
] as const;

const REASON_LABELS: Record<string, string> = {
  piece_name_one_gram: 'Stück-Name mit 1 g',
  piece_name_gram_unit: 'Stück-Name mit Gramm-Einheit',
  one_gram_placeholder: '1-g-Platzhalter',
  missing_weight: 'Fehlendes Gewicht',
  implausible_rank1: 'Unplausibles rank-1-Gewicht',
};

const STATUS_LABELS: Record<string, string> = {
  candidate: 'Kandidat',
  pending_review: 'Prüffall',
  ready: 'Bereit',
  applied: 'Angewendet',
  rejected: 'Abgelehnt',
  skipped: 'Übersprungen',
};

function formatWeight(value: number | null | undefined): string {
  if (value == null) return '–';
  return `${value} g`;
}

interface PortionRepairListProps {
  page?: number;
  pageSize?: number;
}

export default function PortionRepairList({ page = 1, pageSize = PAGE_SIZE }: PortionRepairListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(page);
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; action: 'apply' | 'reject' } | null>(null);

  const { data, isLoading, error } = usePortionRepairFindings({
    page: currentPage,
    page_size: pageSize,
    status: statusFilter || undefined,
  });
  const applyMutation = usePortionRepairApply();
  const rejectMutation = usePortionRepairReject();

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.action === 'apply') {
        const result = await applyMutation.mutateAsync(confirmTarget.id);
        toast.success(
          result.applied
            ? `Reparatur angewendet: ${result.moved_recipe_item_ids.length} Zutat(en) umgestellt, ${result.affected_recipe_ids.length} Rezept(e) neu berechnet`
            : 'Befund wurde bereits angewendet'
        );
      } else {
        await rejectMutation.mutateAsync(confirmTarget.id);
        toast.success('Befund abgelehnt');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Aktion fehlgeschlagen');
    } finally {
      setConfirmTarget(null);
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-2xl text-muted-foreground" />
      </div>
    );
  if (error) return <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>;
  if (!data?.items.length)
    return <div className="text-muted-foreground py-4">Keine Portions-Reparatur-Befunde gefunden</div>;

  const totalPages = data.total_pages;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setStatusFilter(filter.key);
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              statusFilter === filter.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {data.items.map((finding: PortionRepairFinding) => {
          const canAct =
            finding.status === 'pending_review' || finding.status === 'ready' || finding.status === 'candidate';
          const proposal = finding.ai_proposal;
          const beforeWeight = finding.before_snapshot.weight_g;
          const afterWeight = proposal?.proposed_weight_g;
          return (
            <div
              key={finding.id}
              className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium">{finding.ingredient_name}</span>
                    <span className="text-muted-foreground"> · {finding.portion_name}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {REASON_LABELS[finding.detection_reason] ?? finding.detection_reason} ·{' '}
                      {finding.recipe_item_ids.length} Rezept-Zutat(en) · Konfidenz:{' '}
                      {finding.confidence != null ? `${Math.round(finding.confidence * 100)}%` : '–'}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-1 rounded-full whitespace-nowrap',
                      finding.status === 'applied' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40',
                      finding.status === 'pending_review' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/40',
                      finding.status === 'ready' && 'bg-sky-100 text-sky-700 dark:bg-sky-950/40',
                      finding.status === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-950/40',
                      finding.status === 'skipped' && 'bg-muted text-muted-foreground',
                      finding.status === 'candidate' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {STATUS_LABELS[finding.status] ?? finding.status}
                  </span>
                </div>

                {proposal && Object.keys(proposal).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground line-through">
                      {finding.portion_name} · {formatWeight(beforeWeight)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">
                      {proposal.proposed_name || finding.portion_name} · {formatWeight(afterWeight)}
                    </span>
                    {proposal.rationale && (
                      <span className="text-xs text-muted-foreground">({proposal.rationale})</span>
                    )}
                  </div>
                )}

                {finding.status === 'applied' && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {finding.moved_recipe_item_ids.length} Zutat(en) umgestellt,{' '}
                    {finding.affected_recipe_ids.length} Rezept(e) neu berechnet
                  </div>
                )}

                {canAct && (
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setConfirmTarget({ id: finding.id, action: 'apply' })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Anwenden
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmTarget({ id: finding.id, action: 'reject' })}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Ablehnen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Weiter
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
        title={confirmTarget?.action === 'apply' ? 'Reparatur anwenden?' : 'Befund ablehnen?'}
        description={
          confirmTarget?.action === 'apply'
            ? 'Die korrigierte Portion wird angelegt und betroffene Rezept-Zutaten werden umgestellt. Betroffene Rezepte werden neu berechnet.'
            : 'Der Befund wird als abgelehnt markiert. Es werden keine Daten verändert.'
        }
        confirmLabel={confirmTarget?.action === 'apply' ? 'Ja, anwenden' : 'Ja, ablehnen'}
        loading={applyMutation.isPending || rejectMutation.isPending}
        variant={confirmTarget?.action === 'apply' ? 'default' : 'destructive'}
      />
    </div>
  );
}
