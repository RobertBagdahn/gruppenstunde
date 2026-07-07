import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Egg, Plus, ShieldCheck, Users, LayoutGrid, Leaf, Apple, X } from 'lucide-react';
import { useNutritionalTags } from '@/api/supplies';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecipeSearch, useRecentlyUsedRecipes } from '@/api/mealPlans';
import type { IngredientSearchResult, IngredientPortion, RecipeSearchResult } from '@/schemas/mealPlan';
import RecipePreviewInline from './RecipePreviewInline';
import CategoryPills from '@/components/recipe/CategoryPills';
import SearchResultCard from '@/components/recipe/RecipeSearchCard';
import RecentlyUsedSection from '@/components/recipe/RecentlyUsedSection';

// Welche recipe_types beim Öffnen aus einem bestimmten meal_type vorausgewählt werden
export const MEAL_TYPE_DEFAULT_RECIPE_TYPES: Record<string, string[]> = {
  breakfast: ['breakfast', 'warm_meal', 'drink'],
  lunch: ['warm_meal', 'cold_meal', 'drink'],
  dinner: ['warm_meal', 'cold_meal', 'drink'],
  snack: ['snack', 'drink'],
  drinks: ['drink'],
};

type BadgeFilter = 'all' | 'verified' | 'community';

interface BadgePillProps {
  value: BadgeFilter;
  selected: BadgeFilter;
  onChange: (v: BadgeFilter) => void;
  icon: React.ReactNode;
  label: string;
}

function BadgePill({ value, selected, onChange, icon, label }: BadgePillProps) {
  return (
    <button
      onClick={() => onChange(selected === value ? 'all' : value)}
      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
        selected === value
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:bg-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface RecipeSearchDialogProps {
  mealType: string;
  onSelect?: (recipeId: number, recipeTitle?: string) => void;
  onSelectIngredient?: (ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number, ingredientName: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutritionalTagIds?: number[];
  nutritionalTagNames?: string[];
  excludedRecipeIds?: Set<number>;
  excludedIngredientIds?: Set<number>;
  ingredientOnly?: boolean;
  breakfastDayTags?: Array<{ id: number; name: string }>;
}

export default function RecipeSearchDialog({
  mealType,
  onSelect,
  onSelectIngredient,
  open,
  onOpenChange,
  nutritionalTagIds,
  nutritionalTagNames,
  excludedRecipeIds = new Set(),
  excludedIngredientIds = new Set(),
  ingredientOnly = false,
  breakfastDayTags,
}: RecipeSearchDialogProps) {
  const defaultTypes = ingredientOnly
    ? ['ingredient']
    : (MEAL_TYPE_DEFAULT_RECIPE_TYPES[mealType] ?? []);

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(defaultTypes));
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [ingredientDialog, setIngredientDialog] = useState<IngredientSearchResult | null>(null);
  const [previewRecipe, setPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [excludeDietaryTags, setExcludeDietaryTags] = useState(true);
  const [includeTagIds, setIncludeTagIds] = useState<number[]>([]);
  const [selectedBreakfastDayTagIds, setSelectedBreakfastDayTagIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allNutritionalTags = [] } = useNutritionalTags();
  const { data: recentlyUsedData } = useRecentlyUsedRecipes(5);

  // Tags that make sense as quick filters (vegan, vegetarisch, laktosefrei, glutenfrei)
  const QUICK_FILTER_NAMES = ['vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei'];
  const quickFilterTags = allNutritionalTags.filter(
    (t) => QUICK_FILTER_NAMES.some((name) => t.name.toLowerCase().includes(name))
  );

  // Debounce search query: 300ms after last keystroke
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (searchQuery.length < 2) {
      setDebouncedQuery('');
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const recipeTypesArray = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined;

  const { data: results } = useRecipeSearch({
    q: debouncedQuery || undefined,
    meal_type: recipeTypesArray ? undefined : mealType, // meal_type nur als Fallback wenn kein expliziter Filter
    recipe_types: recipeTypesArray,
    recipe_badge: badgeFilter !== 'all' ? badgeFilter : null,
    exclude_nutritional_tag_ids: excludeDietaryTags && nutritionalTagIds?.length ? nutritionalTagIds : undefined,
    nutritional_tag_ids: includeTagIds.length > 0 ? includeTagIds : undefined,
    tag_ids: selectedBreakfastDayTagIds.size > 0 ? Array.from(selectedBreakfastDayTagIds) : undefined,
    limit: 20,
  });

  useEffect(() => {
    if (open) {
      setSelectedTypes(new Set(defaultTypes));
      setBadgeFilter('all');
      setIngredientDialog(null);
      setPreviewRecipe(null);
      setSearchQuery('');
      setDebouncedQuery('');
      setSelectedBreakfastDayTagIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealType, ingredientOnly]);

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    searchInputRef.current?.focus();
  };

  const handleSelect = (recipe: RecipeSearchResult) => {
    setPreviewRecipe(recipe);
  };

  const handlePreviewConfirm = (recipeId: number) => {
    onSelect?.(recipeId, previewRecipe?.title);
    setPreviewRecipe(null);
    onOpenChange(false);
  };

  const handleIngredientConfirm = (
    ingredientId: number,
    portion: IngredientPortion | null,
    quantity: number,
  ) => {
    if (onSelectIngredient) {
      const totalWeightG = portion?.weight_g ? quantity * portion.weight_g : null;
      onSelectIngredient(
        ingredientId,
        portion?.id ?? null,
        portion?.measuring_unit_id ?? null,
        totalWeightG ?? quantity,
        ingredientDialog?.name ?? '',
      );
    }
    setIngredientDialog(null);
    onOpenChange(false);
  };

  const isIngredientMode = selectedTypes.has('ingredient');

  const showRecentlyUsed = !ingredientOnly && !isIngredientMode
    && debouncedQuery.length < 2
    && (recentlyUsedData?.recipes?.length ?? 0) > 0;

  const recipes = results?.recipes ?? [];
  const ingredients = results?.ingredients ?? [];
  const fallbackApplied = results?.fallback_applied ?? false;

  const mealTypeLabel = mealType === 'breakfast' ? 'Frühstück'
    : mealType === 'lunch' ? 'Mittagessen'
    : mealType === 'dinner' ? 'Abendessen'
    : mealType === 'snack' ? 'Snack'
    : mealType === 'drinks' ? 'Getränke'
    : 'Mahlzeit';

  const handleEscapeKeyDown = useCallback((e: KeyboardEvent) => {
    if (previewRecipe || ingredientDialog) {
      e.preventDefault();
      setPreviewRecipe(null);
      setIngredientDialog(null);
    }
  }, [previewRecipe, ingredientDialog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] min-h-[60vh] max-[640px]:min-h-[80vh] flex flex-col gap-3"
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        {previewRecipe ? (
          <RecipePreviewInline
            recipe={previewRecipe}
            onConfirm={handlePreviewConfirm}
            onCancel={() => setPreviewRecipe(null)}
          />
        ) : ingredientDialog ? (
          <IngredientQuantityInline
            ingredient={ingredientDialog}
            onConfirm={handleIngredientConfirm}
            onCancel={() => setIngredientDialog(null)}
          />
        ) : (
          <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              {ingredientOnly || isIngredientMode ? (
                <><Apple className="w-5 h-5 text-primary" /> Zutat hinzufügen</>
              ) : (
                <><Search className="w-5 h-5 text-primary" /> Rezept für {mealTypeLabel} wählen</>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Suchfeld — nur im Rezept-Modus */}
          {!ingredientOnly && !isIngredientMode && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Filter-Zeile — nur im Rezept-Modus */}
          {!ingredientOnly && (
            <div className="space-y-2">
              <CategoryPills selected={selectedTypes} onChange={setSelectedTypes} />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">Quelle:</span>
                <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  <BadgePill
                    value="all"
                    selected={badgeFilter}
                    onChange={setBadgeFilter}
                    icon={<LayoutGrid className="w-3 h-3" />}
                    label="Alle"
                  />
                  <BadgePill
                    value="verified"
                    selected={badgeFilter}
                    onChange={setBadgeFilter}
                    icon={<ShieldCheck className="w-3 h-3" />}
                    label="Verifiziert"
                  />
                  <BadgePill
                    value="community"
                    selected={badgeFilter}
                    onChange={setBadgeFilter}
                    icon={<Users className="w-3 h-3" />}
                    label="Community"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Ernährungsweise-Filter — nur im Rezept-Modus */}
          {!ingredientOnly && quickFilterTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Leaf className="w-3 h-3" />
                Ernährung:
              </span>
              {quickFilterTags.map((tag) => {
                const isSelected = includeTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => setIncludeTagIds(
                      isSelected
                        ? includeTagIds.filter((id) => id !== tag.id)
                        : [...includeTagIds, tag.id]
                    )}
                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Frühstückstag-Filter — nur im Rezept-Modus und wenn breakfastDayTags übergeben */}
          {!ingredientOnly && breakfastDayTags && breakfastDayTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Frühstückstag:</span>
              {breakfastDayTags.map((tag) => {
                const isSelected = selectedBreakfastDayTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const next = new Set(selectedBreakfastDayTagIds);
                      if (isSelected) {
                        next.delete(tag.id);
                      } else {
                        next.add(tag.id);
                      }
                      setSelectedBreakfastDayTagIds(next);
                    }}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tag.name}
                    {isSelected && (
                      <span className="ml-1">✕</span>
                    )}
                  </button>
                );
              })}
              {selectedBreakfastDayTagIds.size > 0 && (
                <button
                  onClick={() => setSelectedBreakfastDayTagIds(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground underline px-1"
                >
                  Alle
                </button>
              )}
            </div>
          )}

          {/* Ernährungs-Ausschluss — nur im Rezept-Modus */}
          {!ingredientOnly && nutritionalTagIds && nutritionalTagIds.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground select-none bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/50 w-fit">
              <input
                type="checkbox"
                checked={excludeDietaryTags}
                onChange={(e) => setExcludeDietaryTags(e.target.checked)}
                className="rounded border-muted-foreground accent-primary"
              />
              <span>{nutritionalTagNames?.join(', ') ?? nutritionalTagIds.join(', ')} ausschließen</span>
            </label>
          )}

          {/* Kürzlich verwendet — nur wenn nicht gesucht wird */}
          {showRecentlyUsed && (
            <RecentlyUsedSection onSelect={(recipeId, title) => { onSelect?.(recipeId, title); onOpenChange(false); }} />
          )}

          {/* Fallback-Hinweis */}
          {fallbackApplied && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-md">
              Nicht genug Rezepte für diesen Typ — zeige auch andere
            </p>
          )}

          {/* Ergebnisliste */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {!ingredientOnly && !isIngredientMode && (recipes.length > 0 || ingredients.length > 0) && (
              <>
                {/* Available items (mixed, sorted) */}
                {(() => {
                  const availableItems: Array<{
                    kind: 'recipe' | 'ingredient';
                    data: RecipeSearchResult | IngredientSearchResult;
                    onClick: () => void;
                  }> = [];

                  for (const r of recipes) {
                    if (!excludedRecipeIds.has(r.id)) {
                      availableItems.push({
                        kind: 'recipe',
                        data: r,
                        onClick: () => handleSelect(r),
                      });
                    }
                  }

                  for (const ing of ingredients) {
                    if (!excludedIngredientIds.has(ing.id)) {
                      availableItems.push({
                        kind: 'ingredient',
                        data: ing,
                        onClick: () => setIngredientDialog(ing),
                      });
                    }
                  }

                  availableItems.sort(
                    (a, b) => ((b.data.usage_count ?? 0) - (a.data.usage_count ?? 0))
                  );

                  return availableItems.map((item) => (
                    <SearchResultCard
                      key={`${item.kind}-${item.data.id}`}
                      result={item.data}
                      onClick={item.onClick}
                    />
                  ));
                })()}

                {/* Excluded items (at the bottom) */}
                {recipes.filter((r) => excludedRecipeIds.has(r.id)).map((r) => (
                  <div
                    key={`recipe-excluded-${r.id}`}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 opacity-50 pointer-events-none bg-muted/30"
                  >
                    <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      Bereits enthalten
                    </span>
                  </div>
                ))}
                {ingredients.filter((i) => excludedIngredientIds.has(i.id)).map((ing) => (
                  <div
                    key={`ing-excluded-${ing.id}`}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-3 opacity-50 pointer-events-none bg-muted/30"
                  >
                    <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{ing.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      Bereits enthalten
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* Ingredient-only / Ingredient mode: keep original simple rendering */}
            {(ingredientOnly || isIngredientMode) && ingredients.length > 0 && (
              <>
                {ingredients.map((ing) => {
                  const isExcluded = excludedIngredientIds.has(ing.id);
                  return isExcluded ? (
                    <div
                      key={`ing-${ing.id}`}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-3 opacity-50 pointer-events-none bg-muted/30"
                    >
                      <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1">{ing.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        Bereits enthalten
                      </span>
                    </div>
                  ) : (
                    <button
                      key={`ing-${ing.id}`}
                      onClick={() => setIngredientDialog(ing)}
                      className="w-full text-left px-3 py-2.5 text-base hover:bg-accent hover:shadow-sm transition-all flex items-center gap-3"
                    >
                      <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1">{ing.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                        Zutat
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {((!ingredientOnly && !isIngredientMode && recipes.length === 0 && ingredients.length === 0) ||
             ((ingredientOnly || isIngredientMode) && ingredients.length === 0)) && (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Keine {ingredientOnly || isIngredientMode ? 'Zutaten' : 'Ergebnisse'} gefunden
                </p>
                {!(ingredientOnly || isIngredientMode) && (
                  <a
                    href="/recipes/new"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Neues Rezept erstellen
                  </a>
                )}
              </div>
            )}
          </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================================================
// Ingredient Quantity Inline (rendered inside RecipeSearchDialog)
// ==========================================================================

interface IngredientQuantityInlineProps {
  ingredient: IngredientSearchResult;
  onConfirm: (ingredientId: number, portion: IngredientPortion | null, quantity: number) => void;
  onCancel: () => void;
}

function IngredientQuantityInline({
  ingredient,
  onConfirm,
  onCancel,
}: IngredientQuantityInlineProps) {
  const [selectedPortionId, setSelectedPortionId] = useState<string>(
    ingredient.portions.length > 0 ? String(ingredient.portions[0].id) : '',
  );
  const [quantity, setQuantity] = useState<number>(1);

  const selectedPortion = ingredient.portions.find(
    (p) => String(p.id) === selectedPortionId,
  ) ?? null;

  const totalWeightG = selectedPortion?.weight_g
    ? quantity * selectedPortion.weight_g
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 text-lg font-display font-bold mb-4">
        <Egg className="w-5 h-5 text-primary" />
        {ingredient.name} hinzufügen
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="text-sm font-medium">Menge</label>
          <input
            type="number"
            min={0.1}
            step={0.5}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
            className="w-full mt-1 rounded-lg border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {ingredient.portions.length > 0 && (
          <div>
            <label className="text-sm font-medium">Einheit</label>
            <Select value={selectedPortionId} onValueChange={setSelectedPortionId}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Portion wählen" />
              </SelectTrigger>
              <SelectContent>
                {ingredient.portions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {p.measuring_unit ? ` (${p.measuring_unit})` : ''}
                    {p.weight_g ? ` — ${p.weight_g}g` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {totalWeightG && selectedPortion?.weight_g && (
          <p className="text-xs text-muted-foreground">
            {quantity} × {selectedPortion.weight_g}g = {Math.round(totalWeightG)}g
          </p>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-3 border-t mt-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => onConfirm(ingredient.id, selectedPortion, quantity)}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
