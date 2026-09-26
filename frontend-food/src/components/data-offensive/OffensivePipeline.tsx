import { useCallback } from 'react';
import { CheckCircle2, Loader2, Play, Square } from 'lucide-react';
import {
  runAiReviewChunk,
  runEmbeddingChunk,
  useInvalidateOffensive,
  useOffensiveBulkAction,
} from '@/api/dataOffensive';
import type { BulkAction, OffensiveSummary } from '@/schemas/dataOffensive';
import { useChunkedRunner } from '@/hooks/useChunkedRunner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatEuro } from './offensiveMeta';

interface OffensivePipelineProps {
  summary: OffensiveSummary;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

interface StepProps {
  index: number;
  title: string;
  description: string;
  metric: string;
  done: boolean;
  cost?: string;
  children: React.ReactNode;
}

function PipelineStep({ index, title, description, metric, done, cost, children }: StepProps) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
          aria-hidden
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : index}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-sm leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs">
            <span className={cn('font-semibold', done ? 'text-primary' : 'text-foreground')}>{metric}</span>
            {cost && <span className="text-muted-foreground"> · {cost}</span>}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:w-64 sm:items-end">{children}</div>
    </li>
  );
}

function describeBulk(result: BulkAction, verb: string): string {
  return `${result.changed.toLocaleString('de-DE')} ${verb}` + (result.remaining ? ` · ${result.remaining} offen` : '');
}

export default function OffensivePipeline({ summary, onNotify }: OffensivePipelineProps) {
  const invalidate = useInvalidateOffensive();
  const reclassify = useOffensiveBulkAction('/reclassify-sections/');
  const repair = useOffensiveBulkAction('/repair-nutrition/');
  const mergeExact = useOffensiveBulkAction('/merge-exact-duplicates/');
  const publish = useOffensiveBulkAction('/publish/');
  const autoResolve = useOffensiveBulkAction('/auto-resolve/');

  const runReviewChunk = useCallback(async () => {
    const result = await runAiReviewChunk({ limit: 45 });
    return { processed: result.reviewed, remaining: result.remaining, errors: result.errors };
  }, []);
  const runEmbedChunk = useCallback(async () => {
    const result = await runEmbeddingChunk(60);
    return { processed: result.changed, remaining: result.remaining };
  }, []);
  const review = useChunkedRunner(runReviewChunk, invalidate);
  const embeddings = useChunkedRunner(runEmbedChunk, invalidate);

  const runBulk = (
    action: ReturnType<typeof useOffensiveBulkAction>,
    verb: string
  ) =>
    action.mutate([], {
      onSuccess: (result) => onNotify('success', describeBulk(result, verb)),
      onError: (error) => onNotify('error', error.message),
    });

  const pendingDecisions =
    (summary.issue_counts.suggestions_pending ?? 0) +
    (summary.issue_counts.rename_suggested ?? 0) +
    (summary.issue_counts.duplicate_suggested ?? 0) +
    (summary.issue_counts.suspect_name ?? 0);
  const sectionMissing = summary.issue_counts.section_missing ?? 0;
  const implausible = summary.issue_counts.nutrition_implausible ?? 0;

  return (
    <section className="rounded-xl border bg-card p-4 md:p-5 space-y-1">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold">Datenoffensive in 7 Schritten</h2>
        <p className="text-sm text-muted-foreground">
          Von oben nach unten ausführen. Schritte 1–3, 5 und 7 kosten nichts, Schritt 4 nutzt Gemini 3.5 Flash-Lite
          nur für Zutaten, die Regeln nicht selbst reparieren können.
        </p>
      </div>
      <ol className="divide-y">
        <PipelineStep
          index={1}
          title="Warengruppen per Regelwerk zuordnen"
          description="Kopfwort-Analyse (z. B. Orangen·saft → Säfte). Manuell gesetzte Gruppen bleiben."
          metric={`${sectionMissing.toLocaleString('de-DE')} ohne Warengruppe`}
          cost="kostenlos"
          done={sectionMissing === 0}
        >
          <Button size="sm" variant="outline" disabled={reclassify.isPending} onClick={() => runBulk(reclassify, 'Zutaten neu zugeordnet')}>
            {reclassify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Zuordnen
          </Button>
        </PipelineStep>

        <PipelineStep
          index={2}
          title="Nährwerte regelbasiert reparieren"
          description="kJ → kcal, Platzhalter-Nullen → unbekannt, Salz ↔ Natrium, Energie aus Makros."
          metric={`${implausible.toLocaleString('de-DE')} unplausibel`}
          cost="kostenlos"
          done={implausible === 0}
        >
          <Button size="sm" variant="outline" disabled={repair.isPending} onClick={() => runBulk(repair, 'Zutaten repariert')}>
            {repair.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Reparieren
          </Button>
        </PipelineStep>

        <PipelineStep
          index={3}
          title="Exakte Duplikate zusammenführen"
          description="Gleiche Namen (z. B. 34× „Nudeln“) werden in die beste Zutat gemergt, Rezepte zeigen danach dorthin."
          metric={`${summary.exact_duplicate_groups} Gruppen`}
          cost="kostenlos"
          done={summary.exact_duplicate_groups === 0}
        >
          <Button size="sm" variant="outline" disabled={mergeExact.isPending || summary.exact_duplicate_groups === 0} onClick={() => runBulk(mergeExact, 'Duplikate zusammengeführt')}>
            {mergeExact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Zusammenführen
          </Button>
        </PipelineStep>

        <PipelineStep
          index={4}
          title="KI-Review der auffälligen Zutaten"
          description="15 Zutaten pro Aufruf: ergänzt fehlende Werte, korrigiert Widersprüche, prüft Warengruppe, Preis und Namen."
          metric={`${summary.needs_review.toLocaleString('de-DE')} warten auf Prüfung`}
          cost={`≈ ${formatEuro(summary.estimated_review_cost_eur)}`}
          done={summary.needs_review === 0}
        >
          {review.running ? (
            <Button size="sm" variant="outline" onClick={review.stop}>
              <Square className="h-4 w-4" /> Anhalten
            </Button>
          ) : (
            <Button size="sm" disabled={summary.needs_review === 0} onClick={review.start}>
              <Play className="h-4 w-4" /> KI-Review starten
            </Button>
          )}
          {(review.running || review.processed > 0) && (
            <div className="w-full space-y-1">
              <Progress value={review.progress} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-right">
                {review.processed} geprüft{review.remaining !== null ? ` · ${review.remaining} offen` : ''}
                {review.errors.length > 0 && ` · ${review.errors.length} Fehler`}
              </p>
            </div>
          )}
        </PipelineStep>

        <PipelineStep
          index={5}
          title="KI-Vorschläge automatisch entscheiden"
          description="Übernimmt plausible Wertkorrekturen, Schreibkorrekturen und eindeutige Duplikate, löscht unbenutzte Testdaten. Unklare Fälle bleiben in der Arbeitsliste."
          metric={`${pendingDecisions.toLocaleString('de-DE')} offene Vorschläge`}
          cost="kostenlos"
          done={pendingDecisions === 0}
        >
          <Button
            size="sm"
            variant="outline"
            disabled={autoResolve.isPending || pendingDecisions === 0}
            onClick={() =>
              autoResolve.mutate([], {
                onSuccess: (result) => result.messages.forEach((message) => onNotify('info', message)),
                onError: (error) => onNotify('error', error.message),
              })
            }
          >
            {autoResolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Entscheiden
          </Button>
        </PipelineStep>

        <PipelineStep
          index={6}
          title="Embeddings berechnen"
          description="Grundlage für semantische Suche, Zutaten-Matching und Duplikaterkennung."
          metric={`${summary.embeddings_missing.toLocaleString('de-DE')} fehlen`}
          cost="< 0,20 € für alle"
          done={summary.embeddings_missing === 0}
        >
          {embeddings.running ? (
            <Button size="sm" variant="outline" onClick={embeddings.stop}>
              <Square className="h-4 w-4" /> Anhalten
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={summary.embeddings_missing === 0} onClick={embeddings.start}>
              <Play className="h-4 w-4" /> Berechnen
            </Button>
          )}
          {(embeddings.running || embeddings.processed > 0) && (
            <div className="w-full space-y-1">
              <Progress value={embeddings.progress} className="h-2" />
              <p className="text-[11px] text-muted-foreground text-right">
                {embeddings.processed} berechnet{embeddings.remaining !== null ? ` · ${embeddings.remaining} offen` : ''}
              </p>
            </div>
          )}
        </PipelineStep>

        <PipelineStep
          index={7}
          title="Plausible Zutaten veröffentlichen"
          description="Nur Entwürfe ohne blockierende Probleme: Nährwerte plausibel und vollständig, Preis, Warengruppe, kein Duplikat."
          metric={`${summary.publishable.toLocaleString('de-DE')} bereit`}
          cost="kostenlos"
          done={summary.publishable === 0}
        >
          <Button size="sm" variant="outline" disabled={publish.isPending || summary.publishable === 0} onClick={() => runBulk(publish, 'Zutaten veröffentlicht')}>
            {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Veröffentlichen
          </Button>
        </PipelineStep>
      </ol>
    </section>
  );
}
