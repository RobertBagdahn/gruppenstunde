import { useState, useDeferredValue, useEffect } from 'react';
import { Search, Star, TrendingUp, BookOpen, Egg, Plus } from 'lucide-react';
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
import { useRecipeSearch, usePopularRecipes } from '@/api/mealPlans';
import type { IngredientSearchResult, IngredientPortion, RecipeSearchResult } from '@/schemas/mealPlan';
import RecipePreviewDialog from './RecipePreviewDialog';
import CategoryPills from '@/components/recipe/CategoryPills';
import RecipeSearchCard from '@/components/recipe/RecipeSearchCard';
import RecipeBadge from '@/components/recipe/RecipeBadge';
import RecentlyUsedSection from '@/components/recipe/RecentlyUsedSection';

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  dessert: 'Nachtisch',
  side_dish: 'Beilage',
  drink: 'Getränk',
  simple_meal: 'Einfache Mahlzeit',
};

interface RecipeSearchDialogProps {
  mealType: string;
  onSelect: (recipeId: number) => void;
  onSelectIngredient?: (ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nutritionalTagIds?: number[];
  nutritionalTagNames?: string[];
}

export default function RecipeSearchDialog({
  mealType,
  onSelect,
  onSelectIngredient,
  open,
  onOpenChange,
  nutritionalTagIds,
  nutritionalTagNames,
}: RecipeSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [recipeType, setRecipeType] = useState<string | null>(null);
  const [ingredientDialog, setIngredientDialog] = useState<IngredientSearchResult | null>(null);
  const [previewRecipe, setPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [requireDietaryTags, setRequireDietaryTags] = useState(true);

  const deferredQuery = useDeferredValue(query);

  const { data: results } = useRecipeSearch({
    q: deferredQuery,
    meal_type: mealType,
    recipe_type: recipeType || undefined,
    nutritional_tag_ids: requireDietaryTags && nutritionalTagIds?.length ? nutritionalTagIds : undefined,
    require_nutritional_tags: requireDietaryTags && nutritionalTagIds?.length ? true : undefined,
    limit: 20,
  });

  const { data: popularData } = usePopularRecipes({ mealType });

  useEffect(() => {
    if (open) {
      setQuery('');
      setRecipeType(null);
      setIngredientDialog(null);
      setPreviewRecipe(null);
    }
  }, [open]);

  const handleSelect = (recipe: RecipeSearchResult) => {
    setPreviewRecipe(recipe);
  };

  const handlePreviewConfirm = (recipeId: number) => {
    onSelect(recipeId);
    setPreviewRecipe(null);
    onOpenChange(false);
  };

  const handleIngredientConfirm = (
    ingredientId: number,
    portion: IngredientPortion | null,
    quantity: number,
  ) => {
    if (onSelectIngredient) {
      onSelectIngredient(
        ingredientId,
        portion?.id ?? null,
        portion?.measuring_unit_id ?? null,
        quantity,
      );
    }
    setIngredientDialog(null);
    onOpenChange(false);
  };

  const recipes = results?.recipes ?? [];
  const ingredients = results?.ingredients ?? [];
  const fallbackApplied = results?.fallback_applied ?? false;
  const hasActiveFilter = !!recipeType || deferredQuery.length >= 2;

  return (
    <>
      <Dialog open={open && !ingredientDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              <Search className="w-5 h-5 text-primary" />
              Rezept-Detailsuche
            </DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rezept oder Zutat suchen..."
              autoFocus
              className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Category Pills */}
          <CategoryPills selected={recipeType} onChange={setRecipeType} />

          {/* Dietary filter checkbox */}
          {nutritionalTagIds && nutritionalTagIds.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted-foreground select-none bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/50 w-fit">
              <input
                type="checkbox"
                checked={requireDietaryTags}
                onChange={(e) => setRequireDietaryTags(e.target.checked)}
                className="rounded border-muted-foreground accent-primary"
              />
              <span>Nur {nutritionalTagNames?.join(', ') ?? nutritionalTagIds.join(', ')}</span>
            </label>
          )}

          {/* Fallback hint */}
          {fallbackApplied && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-md">
              Keine Rezepte in dieser Kategorie gefunden — zeige alle Typen
            </p>
          )}

          {/* Recently Used */}
          {!hasActiveFilter && <RecentlyUsedSection />}

          {/* Popular Recipes (shown when no active search) */}
          {!hasActiveFilter && popularData && (
            <div className="rounded-lg border p-3 space-y-3">
              {popularData.personal.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-primary" />
                    Deine Top-Rezepte
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularData.personal.map((r) => {
                      const price = r.price_per_serving != null
                        ? `${r.price_per_serving.toFixed(2).replace('.', ',')} €`
                        : '—';
                      return (
                        <button
                          key={`pop-p-${r.id}`}
                          onClick={() => handleSelect({ ...r, slug: '', image: r.image ?? undefined } as RecipeSearchResult)}
                          className="px-2.5 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors flex items-center gap-1.5"
                        >
                          <RecipeBadge badge={r.recipe_badge ?? 'community'} />
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.title}
                          <span className="text-xs text-muted-foreground">({r.usage_count}×, {price})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {popularData.community.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    Community-Hits
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularData.community.map((r) => {
                      const price = r.price_per_serving != null
                        ? `${r.price_per_serving.toFixed(2).replace('.', ',')} €`
                        : '—';
                      return (
                        <button
                          key={`pop-c-${r.id}`}
                          onClick={() => handleSelect({ ...r, slug: '', image: r.image ?? undefined } as RecipeSearchResult)}
                          className="px-2.5 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors flex items-center gap-1.5"
                        >
                          <RecipeBadge badge={r.recipe_badge ?? 'community'} />
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.title}
                          <span className="text-xs text-muted-foreground">({r.usage_count}×, {price})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {recipes.length > 0 && (
              <>
                {ingredients.length > 0 && (
                  <div className="px-3 py-1.5 bg-muted/50 text-sm font-semibold text-muted-foreground">
                    Rezepte
                  </div>
                )}
                {recipes.map((r) => (
                  <RecipeSearchCard
                    key={`recipe-${r.id}`}
                    recipe={r}
                    onClick={() => handleSelect(r)}
                  />
                ))}
              </>
            )}

            {ingredients.length > 0 && (
              <>
                <div className="px-3 py-1.5 bg-muted/50 text-sm font-semibold text-muted-foreground">
                  Zutaten
                </div>
                {ingredients.map((ing) => (
                  <button
                    key={`ing-${ing.id}`}
                    onClick={() => setIngredientDialog(ing)}
                    className="w-full text-left px-3 py-2.5 text-base hover:bg-accent hover:shadow-sm transition-all flex items-center gap-3"
                  >
                    <Egg className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{ing.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      {ing.standalone_type ? (RECIPE_TYPE_LABELS[ing.standalone_type] ?? ing.standalone_type) : 'Zutat'}
                    </span>
                  </button>
                ))}
              </>
            )}

            {recipes.length === 0 && ingredients.length === 0 && (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilter
                    ? 'Keine Ergebnisse gefunden'
                    : 'Suchbegriff oder Filter wählen'}
                </p>
                {hasActiveFilter && (
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
        </DialogContent>
      </Dialog>

      {/* Ingredient Quantity Dialog */}
      {ingredientDialog && (
        <IngredientQuantityDialog
          ingredient={ingredientDialog}
          open={!!ingredientDialog}
          onOpenChange={(open) => { if (!open) setIngredientDialog(null); }}
          onConfirm={handleIngredientConfirm}
        />
      )}

      {/* Recipe Preview Dialog */}
      <RecipePreviewDialog
        recipe={previewRecipe}
        open={!!previewRecipe}
        onOpenChange={(open) => { if (!open) setPreviewRecipe(null); }}
        onConfirm={handlePreviewConfirm}
      />
    </>
  );
}

// ==========================================================================
// Ingredient Quantity Dialog
// ==========================================================================

interface IngredientQuantityDialogProps {
  ingredient: IngredientSearchResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ingredientId: number, portion: IngredientPortion | null, quantity: number) => void;
}

function IngredientQuantityDialog({
  ingredient,
  open,
  onOpenChange,
  onConfirm,
}: IngredientQuantityDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Egg className="w-5 h-5 text-primary" />
            {ingredient.name} hinzufügen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {totalWeightG && (
            <p className="text-xs text-muted-foreground">
              = {Math.round(totalWeightG)}g
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
