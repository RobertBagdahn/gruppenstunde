import { Sparkles, Lightbulb, Compass, AlertCircle } from 'lucide-react';
import { useIntelligentSuggestions } from '@/api/mealPlans';
import type { IntelligentSuggestion } from '@/schemas/mealPlan';
import RecipeBadge from './RecipeBadge';
import RecipeThumbnail from './RecipeThumbnail';

interface IntelligentSuggestionsGridProps {
  planId: number;
  mealId: number;
  mealType: string;
  onSelect: (recipeId: number, recipeTitle?: string) => void;
  contextEnhance?: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  top_picks: {
    label: 'Top-Auswahl',
    icon: <Sparkles className="w-4 h-4 text-yellow-500" />,
    description: 'Die besten Rezepte für diese Mahlzeit',
  },
  variety: {
    label: 'Abwechslung',
    icon: <Lightbulb className="w-4 h-4 text-blue-500" />,
    description: 'Etwas ganz anderes',
  },
  discovery: {
    label: 'Entdeckungen',
    icon: <Compass className="w-4 h-4 text-emerald-500" />,
    description: 'Geheimtipps zum Ausprobieren',
  },
};

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: IntelligentSuggestion;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-border bg-card hover:shadow-md transition-all overflow-hidden text-left group"
    >
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <RecipeThumbnail
          imageUrl={suggestion.image_url}
          title={suggestion.title}
          size="md"
          aspectRatio="4/3"
          className="absolute inset-0"
          imgClassName="group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-1.5 right-1.5">
          <RecipeBadge badge={suggestion.recipe_badge as 'draft' | 'verified' | 'community' | 'personal'} />
        </div>
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <span className="text-sm font-medium leading-tight line-clamp-2">{suggestion.title}</span>
        {suggestion.reason_text && (
          <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
            {suggestion.reason_text}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-auto pt-1">
          {suggestion.price_per_serving != null && (
            <span>{suggestion.price_per_serving.toFixed(2).replace('.', ',')} €/P.</span>
          )}
          <span>{suggestion.usage_count}×</span>
        </div>
      </div>
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-4">
      {['top_picks', 'variety', 'discovery'].map((cat) => (
        <div key={cat}>
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-2 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IntelligentSuggestionsGrid({
  planId,
  mealId,
  mealType: _mealType,
  onSelect,
  contextEnhance = true,
}: IntelligentSuggestionsGridProps) {
  const { data, isLoading, isError } = useIntelligentSuggestions(planId, mealId, contextEnhance);

  if (isLoading) {
    return <SkeletonGrid />;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">Vorschläge konnten nicht geladen werden</p>
      </div>
    );
  }

  const hasSuggestions = (data.suggestions.top_picks?.length ?? 0) > 0
    || (data.suggestions.variety?.length ?? 0) > 0
    || (data.suggestions.discovery?.length ?? 0) > 0;

  if (!hasSuggestions) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">Keine passenden Rezepte gefunden</p>
        <p className="text-xs mt-1">Versuche es mit der Suche oder ändere die Filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.ai_enhanced && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
          <Sparkles className="w-3.5 h-3.5" />
          KI-gestützte Vorschläge
        </div>
      )}

      {(['top_picks', 'variety', 'discovery'] as const).map((category) => {
        const items = data.suggestions[category] ?? [];
        if (items.length === 0) return null;
        const catInfo = CATEGORY_LABELS[category];

        return (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              {catInfo.icon}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {catInfo.label}
              </span>
              <span className="text-[10px] text-muted-foreground/60">— {catInfo.description}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onClick={() => onSelect(suggestion.id, suggestion.title)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
