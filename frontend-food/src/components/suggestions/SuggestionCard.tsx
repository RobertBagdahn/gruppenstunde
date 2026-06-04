import { Card, CardContent } from '@/components/ui/card';
import type { Suggestion } from '@/schemas/suggestions';
import SollIstBar from '../shared/SollIstBar';
import { ArrowUpRight } from 'lucide-react';

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

const suggestionStyles = {
  green: {
    card: 'bg-primary/[0.04] dark:bg-primary/[0.02] border border-primary/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    bullet: 'bg-primary',
  },
  yellow: {
    card: 'bg-[hsl(var(--chart-2))]/[0.04] dark:bg-[hsl(var(--chart-2))]/[0.02] border border-[hsl(var(--chart-2))]/20',
    text: 'text-amber-700 dark:text-amber-400',
    bullet: 'bg-[hsl(var(--chart-2))]',
  },
  red: {
    card: 'bg-destructive/[0.04] dark:bg-destructive/[0.02] border border-destructive/20',
    text: 'text-destructive',
    bullet: 'bg-destructive',
  },
};

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const hasSollIst =
    suggestion.current_value !== null &&
    (suggestion.min_green !== null ||
      suggestion.max_green !== null ||
      suggestion.target_mid !== null);

  const style = suggestionStyles[suggestion.status];

  return (
    <Card className={`${style.card} shadow-sm rounded-xl overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <span className={`mt-1.5 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${style.bullet}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">
              {suggestion.scope_label}
            </p>
            <p className={`text-sm font-semibold mt-1 font-display tracking-tight ${style.text}`}>
              {suggestion.message}
            </p>
            {suggestion.tip && (
              <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed">
                {suggestion.tip}
              </p>
            )}

            {hasSollIst && (
              <div className="mt-3 p-3 bg-card/60 dark:bg-zinc-900/40 border border-border/40 rounded-xl max-w-md shadow-sm">
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
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestion.recipe_suggestions.map((recipe) => (
                  <a
                    key={recipe.id}
                    href={`/recipes/${recipe.slug}`}
                    className="text-xs bg-card/80 dark:bg-zinc-800/80 hover:bg-card border border-border text-foreground hover:text-primary rounded-lg px-2.5 py-1.5 font-medium inline-flex items-center gap-1 transition-all shadow-sm hover:shadow-md hover:border-primary/30"
                  >
                    <span>{recipe.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
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
