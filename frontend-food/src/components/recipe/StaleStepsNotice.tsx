import { AlertTriangle } from 'lucide-react';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';

/**
 * Shown above the preparation steps when ingredients were removed, added or replaced during the
 * ingredient review, because steps taken over from the import may still mention them.
 */
export default function StaleStepsNotice() {
  const changed = useRecipeIngredientReviewStore((store) => store.ingredientsChangedSinceImport);
  const acknowledge = useRecipeIngredientReviewStore((store) => store.acknowledgeIngredientChange);
  if (!changed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-soft p-3 text-body text-warning"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Zutaten wurden geändert – bitte Schritte prüfen</p>
        <p className="mt-1 text-caption">
          Die Schritte stammen aus dem Import und können Zutaten erwähnen, die du entfernt oder ersetzt hast. Passe sie
          an oder erzeuge sie über „KI Generierung“ neu.
        </p>
      </div>
      <button
        type="button"
        onClick={acknowledge}
        className="shrink-0 rounded-lg border border-warning-border px-3 py-1.5 text-caption font-medium hover:bg-background"
      >
        Verstanden
      </button>
    </div>
  );
}
