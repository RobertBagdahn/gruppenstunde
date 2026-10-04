import { Fragment, useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChefHat, Carrot, Sparkles, Check, X, Users, Euro, AlertCircle, Plus, BadgeCheck, Flame, Utensils } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRecipeSearch } from '@/api/mealPlans';
import type { RecipeSearchResult, IngredientSearchResult } from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

type FilterPill = 'all' | 'recipes' | 'ingredients';

/** In the `Alle` pill each group shows only its best matches. */
const ALL_GROUP_LIMIT = 5;

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  snack: 'Snack',
  drink: 'Getränk',
  dessert: 'Dessert',
};

function recipeTypeLabel(type: string): string {
  return RECIPE_TYPE_LABELS[type] ?? 'Rezept';
}

function formatOptionalBadge(value: number | null | undefined, suffix: string): string | null {
  return value == null ? null : `${Math.round(value)} ${suffix}`;
}

export interface MealOmnibarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType?: string;
  mealId?: number;
  /** Names the meal the selection is added to, e.g. "Abendessen · Fr., 11.12.". */
  targetLabel?: string;
  normPortions?: number;
  onSelectRecipe: (recipeId: number, title?: string) => void;
  onSelectIngredient?: (
    ingredientId: number,
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
    ingredientName: string
  ) => void;
  nutritionalTagIds?: number[];
  excludedRecipeIds?: Set<number>;
  excludedIngredientIds?: Set<number>;
}

export function MealOmnibarDialog({
  open,
  onOpenChange,
  mealType,
  targetLabel,
  normPortions = 10,
  onSelectRecipe,
  onSelectIngredient,
  nutritionalTagIds,
  excludedRecipeIds = new Set(),
  excludedIngredientIds = new Set(),
}: MealOmnibarDialogProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterPill>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setFilter('all');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data: searchResults, isLoading } = useRecipeSearch({
    q: query,
    meal_type: mealType,
    exclude_nutritional_tag_ids: nutritionalTagIds,
    limit: 25,
    enabled: open,
  });

  const recipes = useMemo(() => {
    const list = searchResults?.recipes || [];
    return list.filter((r) => !excludedRecipeIds.has(r.id));
  }, [searchResults?.recipes, excludedRecipeIds]);

  const ingredients = useMemo(() => {
    const list = searchResults?.ingredients || [];
    return list.filter((ing) => !excludedIngredientIds.has(ing.id));
  }, [searchResults?.ingredients, excludedIngredientIds]);

  const displayedItems = useMemo(() => {
    const result: Array<
      | { type: 'recipe'; data: RecipeSearchResult }
      | { type: 'ingredient'; data: IngredientSearchResult }
    > = [];

    const recipeLimit = filter === 'all' ? ALL_GROUP_LIMIT : recipes.length;
    const ingredientLimit = filter === 'all' ? ALL_GROUP_LIMIT : ingredients.length;
    if (filter === 'all' || filter === 'recipes') {
      recipes.slice(0, recipeLimit).forEach((r) => result.push({ type: 'recipe', data: r }));
    }
    if (filter === 'all' || filter === 'ingredients') {
      ingredients.slice(0, ingredientLimit).forEach((ing) => result.push({ type: 'ingredient', data: ing }));
    }
    return result;
  }, [filter, recipes, ingredients]);

  const activeItem = displayedItems[selectedIndex] ?? displayedItems[0] ?? null;

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < displayedItems.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeItem) {
      e.preventDefault();
      handleConfirmSelection(activeItem);
    }
  };

  const handleConfirmSelection = (item: (typeof displayedItems)[0]) => {
    if (item.type === 'recipe') {
      onSelectRecipe(item.data.id, item.data.title);
      onOpenChange(false);
    } else if (item.type === 'ingredient') {
      const ing = item.data;
      const defaultPortion = ing.portions?.[0] || null;
      if (onSelectIngredient) {
        onSelectIngredient(
          ing.id,
          defaultPortion?.id || null,
          defaultPortion?.measuring_unit_id || null,
          1,
          ing.name
        );
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[min(760px,90dvh)] max-h-[90dvh] min-h-0 p-0 overflow-hidden shadow-2xl border-border flex flex-col gap-0">
        {targetLabel && (
          <p className="px-4 pt-3 text-caption text-muted-foreground">
            Hinzufügen zu: <span className="font-semibold text-foreground">{targetLabel}</span>
          </p>
        )}

        {/* Top Search Omnibar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Gericht oder Zutat suchen... (z. B. Spaghetti, Haferflocken)"
            className="min-w-0 w-full text-emphasis font-sans bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-caption font-semibold text-muted-foreground px-2 py-0.5 rounded-lg border border-border bg-muted/40">
            Esc
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-muted/20 overflow-x-auto text-caption">
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setSelectedIndex(0);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all',
              filter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Alle ({recipes.length + ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('recipes');
              setSelectedIndex(0);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all',
              filter === 'recipes'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ChefHat className="w-3.5 h-3.5" />
            Rezepte ({recipes.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('ingredients');
              setSelectedIndex(0);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all',
              filter === 'ingredients'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Carrot className="w-3.5 h-3.5" />
            Zutaten ({ingredients.length})
          </button>
        </div>

        {/* 2-Column Area: List on left, Live Preview on right */}
        <div className="grid grid-cols-1 grid-rows-[minmax(0,1fr)] md:grid-cols-12 flex-1 min-h-0 md:min-h-[420px] md:max-h-[620px]">
          {/* List Area */}
          <div className="md:col-span-7 min-h-0 overflow-y-auto overscroll-contain md:border-r border-border p-3 space-y-1">
            {isLoading && (
              <p className="text-caption text-muted-foreground py-10 text-center">Suche läuft...</p>
            )}

            {!isLoading && displayedItems.length === 0 && (
              <div className="py-12 text-center text-caption text-muted-foreground space-y-1">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-1 opacity-50" />
                <p className="font-semibold text-foreground">Keine Treffer gefunden</p>
                <p>Probiere einen anderen Suchbegriff oder wechsle den Filter.</p>
              </div>
            )}

            {displayedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const startsGroup = filter === 'all' && (idx === 0 || displayedItems[idx - 1].type !== item.type);
              const endsGroup = filter === 'all' && (idx === displayedItems.length - 1 || displayedItems[idx + 1].type !== item.type);
              const groupTotal = item.type === 'recipe' ? recipes.length : ingredients.length;
              return (
                <Fragment key={`${item.type}-${item.data.id}`}>
                {startsGroup && (
                  <p className="px-1 pt-2 pb-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.type === 'recipe' ? 'Rezepte' : 'Zutaten'}
                  </p>
                )}
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedIndex(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'w-full p-3 rounded-xl cursor-pointer flex items-start gap-3 transition-colors text-caption text-left',
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.type === 'recipe' && (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ChefHat className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === 'ingredient' && (
                    <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                      <Carrot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-bold text-foreground text-body leading-snug break-words">
                      {item.type === 'ingredient' ? item.data.name : item.data.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                      {item.type === 'recipe' && (
                        <>
                          <span>{recipeTypeLabel(item.data.recipe_type)}</span>
                          {item.data.portions != null && <span>{item.data.portions} Portionen</span>}
                          {item.data.price_per_serving != null && <span>{formatNumber(item.data.price_per_serving, { maxDecimals: 2 })} €/P.</span>}
                        </>
                      )}
                      {item.type === 'ingredient' && <span>Einzelzutat</span>}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
                {endsGroup && groupTotal > ALL_GROUP_LIMIT && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(item.type === 'recipe' ? 'recipes' : 'ingredients');
                      setSelectedIndex(0);
                    }}
                    className="w-full rounded-lg px-3 py-1.5 text-left text-caption font-semibold text-primary hover:bg-primary/5"
                  >
                    Alle {groupTotal} {item.type === 'recipe' ? 'Rezepte' : 'Zutaten'} anzeigen
                  </button>
                )}
                </Fragment>
              );
            })}
          </div>

          {/* Details Panel on Right */}
          <div className="hidden md:col-span-5 p-5 md:flex flex-col justify-between bg-muted/10 overflow-y-auto">
            {activeItem ? (
              <div className="space-y-5">
                {activeItem.type === 'recipe' && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 text-caption font-semibold text-primary mb-2">
                        <ChefHat className="w-4 h-4" />
                        {recipeTypeLabel(activeItem.data.recipe_type)}
                        {activeItem.data.recipe_badge === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><BadgeCheck className="w-3.5 h-3.5" />Verifiziert</span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-section text-foreground leading-tight break-words">
                        {activeItem.data.title}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-caption">
                        <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2 font-semibold text-foreground break-words shadow-card">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {normPortions} Personen
                        </span>
                        {activeItem.data.price_per_serving != null && (
                          <span className="inline-flex min-w-0 items-center gap-2 rounded-xl bg-card px-3 py-2 font-semibold text-foreground break-words shadow-card">
                            <Euro className="w-3.5 h-3.5 text-success" />
                            {formatNumber((activeItem.data.price_per_serving * normPortions), { maxDecimals: 2 })} € gesamt
                          </span>
                        )}
                      </div>
                    </div>
                    {(activeItem.data.description || (activeItem.data.ingredients_preview?.length ?? 0) > 0) && (
                      <div className="space-y-3 text-caption">
                        {activeItem.data.description && <p className="text-muted-foreground leading-relaxed break-words">{activeItem.data.description}</p>}
                        {activeItem.data.ingredients_preview && activeItem.data.ingredients_preview.length > 0 && (
                          <div className="rounded-xl bg-card p-3 shadow-card">
                            <div className="flex items-center gap-2 font-semibold text-foreground mb-2"><Utensils className="w-3.5 h-3.5 text-primary" />Enthält unter anderem</div>
                            <p className="text-muted-foreground leading-relaxed break-words">{activeItem.data.ingredients_preview.join(' · ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {(activeItem.data.cached_energy_kcal != null || activeItem.data.cached_protein_g != null || activeItem.data.nutritional_tags?.length) && (
                      <div className="rounded-xl bg-card p-3 space-y-2 shadow-card">
                        <div className="flex items-center gap-2 text-caption font-semibold text-foreground"><Flame className="w-3.5 h-3.5 text-primary" />Nährwerte und Hinweise</div>
                        <div className="flex flex-wrap gap-2 text-caption text-muted-foreground">
                          {formatOptionalBadge(activeItem.data.cached_energy_kcal, 'kcal/100 g') && <span>{formatOptionalBadge(activeItem.data.cached_energy_kcal, 'kcal/100 g')}</span>}
                          {formatOptionalBadge(activeItem.data.cached_protein_g, 'g Protein/100 g') && <span>{formatOptionalBadge(activeItem.data.cached_protein_g, 'g Protein/100 g')}</span>}
                          {activeItem.data.nutritional_tags?.map((tag) => <span key={tag.id} className="rounded-full bg-primary/10 px-2 py-1 text-primary">{tag.name}</span>)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeItem.type === 'ingredient' && (
                  <div className="space-y-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-xl bg-warning-soft text-warning flex items-center justify-center mx-auto">
                      <Carrot className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-emphasis text-foreground">
                        {activeItem.data.name}
                      </h3>
                      <p className="text-caption text-muted-foreground mt-1">
                        Einzelzutat für {normPortions} Personen hinzufügen
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-caption text-muted-foreground">
                Kein Element ausgewählt
              </div>
            )}

            {activeItem && (
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleConfirmSelection(activeItem)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-caption bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {activeItem.type === 'recipe'
                      ? `Gericht hinzufügen (${normPortions} P.)`
                      : 'Zutat hinzufügen'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Phones have no detail column: keep the confirm action in view below the list. */}
        {activeItem && (
          <div className="md:hidden shrink-0 border-t border-border bg-card p-3 space-y-2">
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground truncate">
                Vorschau: <span className="font-semibold text-foreground">{activeItem.type === 'ingredient' ? activeItem.data.name : activeItem.data.title}</span>
              </p>
              <p className="text-caption text-muted-foreground truncate">
                {activeItem.type === 'ingredient'
                  ? `Einzelzutat · ${normPortions} Personen`
                  : `${recipeTypeLabel(activeItem.data.recipe_type)}${activeItem.data.price_per_serving == null ? '' : ` · ${formatNumber(activeItem.data.price_per_serving * normPortions, { maxDecimals: 2 })} € gesamt`}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleConfirmSelection(activeItem)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-caption bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {activeItem.type === 'recipe' ? `Gericht hinzufügen (${normPortions} P.)` : 'Zutat hinzufügen'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
