import { useMealPlanSuggestions } from '@/api/suggestions';
import SuggestionCard from './SuggestionCard';
import SuggestionBadge from './SuggestionBadge';

interface SuggestionDashboardProps {
  mealPlanId: number;
}

export default function SuggestionDashboard({ mealPlanId }: SuggestionDashboardProps) {
  const { data, isLoading, error } = useMealPlanSuggestions(mealPlanId);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 block animate-spin">progress_activity</span>
        <p>Vorschläge werden geladen…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <span className="material-symbols-outlined text-4xl mb-2 block">error</span>
        <p>Fehler beim Laden der Vorschläge</p>
      </div>
    );
  }

  if (!data) return null;

  const nonGreenSuggestions = data.suggestions.filter((s) => s.status !== 'green');

  if (nonGreenSuggestions.length === 0) {
    return (
      <div className="text-center py-8 text-green-600">
        <span className="material-symbols-outlined text-4xl mb-2 block">thumb_up</span>
        <p className="font-medium">Alles gut!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Keine Verbesserungsvorschläge für diesen Essensplan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Vorschläge</h3>
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
