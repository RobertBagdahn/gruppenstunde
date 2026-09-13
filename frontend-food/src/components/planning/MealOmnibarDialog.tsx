import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChefHat, Carrot, Layers, Sparkles, Check, X, Users, Euro, AlertCircle, Plus, BadgeCheck, Flame, Utensils } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRecipeSearch } from '@/api/mealPlans';
import type { RecipeSearchResult, IngredientSearchResult } from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';

type FilterPill = 'all' | 'recipes' | 'ingredients' | 'bundles';

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

function formatNumber(value: number | null | undefined, suffix: string): string | null {
  return value == null ? null : `${Math.round(value)} ${suffix}`;
}

export interface MealOmnibarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealType?: string;
  mealId?: number;
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
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Global Cmd+K trigger listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

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

  // Sample quick sets/bundles for breakfast or quick meal setups
  const sampleBundles = useMemo(() => {
    if (mealType === 'breakfast') {
      return [
        {
          id: -1,
          title: 'Klassisches Lager-Frühstück (Set)',
          description: 'Mischbrot, Butter, Gouda, Marmelade, Äpfel & Tee',
          price_per_serving: 1.45,
          recipe_type: 'bundle',
        },
        {
          id: -2,
          title: 'Süßes Müsli & Obst-Buffet (Set)',
          description: 'Haferflocken, Milch, Joghurt, Bananen & Honig',
          price_per_serving: 1.3,
          recipe_type: 'bundle',
        },
      ];
    }
    return [
      {
        id: -10,
        title: 'Schnelles Vesper-Paket (Set)',
        description: 'Brot, Aufschnitt, Gurken & Obst für unterwegs',
        price_per_serving: 1.8,
        recipe_type: 'bundle',
      },
    ];
  }, [mealType]);

  const displayedItems = useMemo(() => {
    const result: Array<
      | { type: 'recipe'; data: RecipeSearchResult }
      | { type: 'ingredient'; data: IngredientSearchResult }
      | { type: 'bundle'; data: (typeof sampleBundles)[0] }
    > = [];

    if (filter === 'all' || filter === 'recipes') {
      recipes.forEach((r) => result.push({ type: 'recipe', data: r }));
    }
    if (filter === 'all' || filter === 'ingredients') {
      ingredients.forEach((ing) => result.push({ type: 'ingredient', data: ing }));
    }
    if (filter === 'all' || filter === 'bundles') {
      sampleBundles.forEach((b) => result.push({ type: 'bundle', data: b }));
    }
    return result;
  }, [filter, recipes, ingredients, sampleBundles]);

  const activeItem = displayedItems[selectedIndex] || displayedItems[0] || null;

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
    } else if (item.type === 'bundle') {
      // Future bundle action: trigger bundle fill
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[min(760px,90vh)] p-0 overflow-hidden shadow-2xl border-border">
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
            placeholder="Gericht, Zutat oder Set suchen... (z. B. Spaghetti, Haferflocken)"
            className="min-w-0 w-full text-base font-sans bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded border border-border bg-muted/40">
            Esc
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-muted/20 overflow-x-auto text-xs">
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
            Alle ({recipes.length + ingredients.length + sampleBundles.length})
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
          <button
            type="button"
            onClick={() => {
              setFilter('bundles');
              setSelectedIndex(0);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-all',
              filter === 'bundles'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Sets & Bundles ({sampleBundles.length})
          </button>
        </div>

        {/* 2-Column Area: List on left, Live Preview on right */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[420px] max-h-[620px]">
          {/* List Area */}
          <div className="md:col-span-7 overflow-y-auto border-r border-border p-3 space-y-1">
            {isLoading && (
              <p className="text-xs text-muted-foreground py-10 text-center">Suche läuft...</p>
            )}

            {!isLoading && displayedItems.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-1 opacity-50" />
                <p className="font-semibold text-foreground">Keine Treffer gefunden</p>
                <p>Probiere einen anderen Suchbegriff oder wechsle den Filter.</p>
              </div>
            )}

            {displayedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.data.id}`}
                  onClick={() => {
                    setSelectedIndex(idx);
                    handleConfirmSelection(item);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'p-3 rounded-xl cursor-pointer flex items-start gap-3 transition-colors text-xs',
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
                    <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                      <Carrot className="w-4 h-4" />
                    </div>
                  )}
                  {item.type === 'bundle' && (
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-bold text-foreground text-sm leading-snug break-words">
                      {item.type === 'ingredient' ? item.data.name : item.data.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      {item.type === 'recipe' && (
                        <>
                          <span>{recipeTypeLabel(item.data.recipe_type)}</span>
                          {item.data.portions != null && <span>{item.data.portions} Portionen</span>}
                          {item.data.price_per_serving != null && <span>{item.data.price_per_serving.toFixed(2)} €/P.</span>}
                        </>
                      )}
                      {item.type === 'ingredient' && <span>Einzelzutat</span>}
                      {item.type === 'bundle' && <span className="break-words">{item.data.description}</span>}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Details Panel on Right */}
          <div className="md:col-span-5 p-5 flex flex-col justify-between bg-muted/10 overflow-y-auto">
            {activeItem ? (
              <div className="space-y-5">
                {activeItem.type === 'recipe' && (
                  <>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                        <ChefHat className="w-4 h-4" />
                        {recipeTypeLabel(activeItem.data.recipe_type)}
                        {activeItem.data.recipe_badge === 'verified' && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground"><BadgeCheck className="w-3.5 h-3.5" />Verifiziert</span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-xl text-foreground leading-tight break-words">
                        {activeItem.data.title}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs">
                        <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 font-semibold text-foreground break-words">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {normPortions} Personen
                        </span>
                        {activeItem.data.price_per_serving != null && (
                          <span className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 font-semibold text-foreground break-words">
                            <Euro className="w-3.5 h-3.5 text-emerald-600" />
                            {(activeItem.data.price_per_serving * normPortions).toFixed(2)} € gesamt
                          </span>
                        )}
                      </div>
                    </div>
                    {(activeItem.data.description || (activeItem.data.ingredients_preview?.length ?? 0) > 0) && (
                      <div className="space-y-3 text-xs">
                        {activeItem.data.description && <p className="text-muted-foreground leading-relaxed break-words">{activeItem.data.description}</p>}
                        {activeItem.data.ingredients_preview && activeItem.data.ingredients_preview.length > 0 && (
                          <div className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center gap-2 font-semibold text-foreground mb-2"><Utensils className="w-3.5 h-3.5 text-primary" />Enthält unter anderem</div>
                            <p className="text-muted-foreground leading-relaxed break-words">{activeItem.data.ingredients_preview.join(' · ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {(activeItem.data.cached_energy_kcal != null || activeItem.data.cached_protein_g != null || activeItem.data.nutritional_tags?.length) && (
                      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Flame className="w-3.5 h-3.5 text-primary" />Nährwerte und Hinweise</div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {formatNumber(activeItem.data.cached_energy_kcal, 'kcal') && <span>{formatNumber(activeItem.data.cached_energy_kcal, 'kcal')}</span>}
                          {formatNumber(activeItem.data.cached_protein_g, 'g Protein') && <span>{formatNumber(activeItem.data.cached_protein_g, 'g Protein')}</span>}
                          {activeItem.data.nutritional_tags?.map((tag) => <span key={tag.id} className="rounded-full bg-primary/10 px-2 py-1 text-primary">{tag.name}</span>)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeItem.type === 'ingredient' && (
                  <div className="space-y-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto">
                      <Carrot className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {activeItem.data.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Einzelzutat für {normPortions} Personen hinzufügen
                      </p>
                    </div>
                  </div>
                )}

                {activeItem.type === 'bundle' && (
                  <div className="space-y-3 py-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                      <Layers className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {activeItem.data.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeItem.data.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Kein Element ausgewählt
              </div>
            )}

            {activeItem && (
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleConfirmSelection(activeItem)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {activeItem.type === 'recipe'
                      ? `Gericht hinzufügen (${normPortions} P.)`
                      : activeItem.type === 'ingredient'
                        ? 'Zutat hinzufügen'
                        : 'Set übernehmen'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
