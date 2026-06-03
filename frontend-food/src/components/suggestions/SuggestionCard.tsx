import { Card, CardContent } from '@/components/ui/card';
import type { Suggestion } from '@/schemas/suggestions';
import { SUGGESTION_STATUS_COLORS, SUGGESTION_STATUS_BG } from '@/schemas/suggestions';
import SollIstBar from '../shared/SollIstBar';

interface SuggestionCardProps {
  suggestion: Suggestion;
}

function getUnitForSuggestion(suggestion: Suggestion): string {
  if (suggestion.category === 'budget') return 'EUR';
  const msg = suggestion.message.toLowerCase();
  if (msg.includes('kcal') || msg.includes('energie')) return 'kcal';
  if (msg.includes('protein') || msg.includes('eiweiß')) return 'g';
  if (msg.includes('fett')) return 'g';
  if (msg.includes('kohlenhydrate') || msg.includes('carbs')) return 'g';
  if (msg.includes('zucker')) return 'g';
  if (msg.includes('ballaststoffe')) return 'g';
  if (msg.includes('salz')) return 'g';
  return '';
}

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const hasSollIst =
    suggestion.current_value !== null &&
    (suggestion.min_green !== null ||
      suggestion.max_green !== null ||
      suggestion.target_mid !== null);

  return (
    <Card className={`${SUGGESTION_STATUS_BG[suggestion.status]} border-0`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <span
            className={`mt-1 inline-block w-3 h-3 rounded-full shrink-0 ${
              suggestion.status === 'green'
                ? 'bg-green-500'
                : suggestion.status === 'yellow'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              {suggestion.scope_label}
            </p>
            <p className={`text-sm font-medium mt-0.5 ${SUGGESTION_STATUS_COLORS[suggestion.status]}`}>
              {suggestion.message}
            </p>
            {suggestion.tip && (
              <p className="text-xs text-muted-foreground mt-1">{suggestion.tip}</p>
            )}

            {hasSollIst && (
              <div className="mt-2 p-2 bg-white/40 dark:bg-black/20 rounded-lg max-w-md">
                <SollIstBar
                  current={suggestion.current_value!}
                  min_green={suggestion.min_green}
                  max_green={suggestion.max_green}
                  target_mid={suggestion.target_mid}
                  status={suggestion.status}
                  unit={getUnitForSuggestion(suggestion)}
                />
              </div>
            )}

            {suggestion.recipe_suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestion.recipe_suggestions.map((recipe) => (
                  <a
                    key={recipe.id}
                    href={`/recipes/${recipe.slug}`}
                    className="text-xs bg-white/70 rounded px-2 py-1 hover:bg-white transition-colors"
                  >
                    {recipe.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
