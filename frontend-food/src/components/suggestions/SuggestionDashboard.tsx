import { useMealPlanSuggestions } from '@/api/suggestions';
import SuggestionCard from './SuggestionCard';
import SuggestionBadge from './SuggestionBadge';
import { Loader2, AlertTriangle, ThumbsUp } from 'lucide-react';

interface SuggestionDashboardProps {
  mealPlanId: number;
}

export default function SuggestionDashboard({ mealPlanId }: SuggestionDashboardProps) {
  const { data, isLoading, error } = useMealPlanSuggestions(mealPlanId);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Vorschläge werden geladen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive flex flex-col items-center justify-center">
        <AlertTriangle className="w-8 h-8 mb-3" />
        <p className="text-sm font-semibold font-display">Fehler beim Laden der Vorschläge</p>
      </div>
    );
  }

  if (!data) return null;

  const nonGreenSuggestions = data.suggestions.filter((s) => s.status !== 'green');

  if (nonGreenSuggestions.length === 0) {
    return (
      <div className="text-center py-12 text-primary flex flex-col items-center justify-center bg-primary/[0.02] border border-primary/10 rounded-2xl p-6">
        <ThumbsUp className="w-8 h-8 mb-3 text-primary opacity-80" />
        <p className="font-bold font-display text-sm tracking-tight">Alles gut!</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
          Keine Verbesserungsvorschläge für diesen Essensplan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h3 className="font-bold font-display text-sm text-foreground tracking-tight">Vorschläge</h3>
        <SuggestionBadge
          summaryStatus={data.summary_status}
          nonGreenCount={data.red_count + data.yellow_count}
        />
      </div>
      <div className="space-y-3">
        {nonGreenSuggestions.map((suggestion, idx) => (
          <SuggestionCard key={idx} suggestion={suggestion} />
        ))}
      </div>
    </div>
  );
}
