import { Card, CardContent } from '@/components/ui/card';
import type { Suggestion } from '@/schemas/suggestions';
import { SUGGESTION_STATUS_COLORS, SUGGESTION_STATUS_BG } from '@/schemas/suggestions';

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
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
