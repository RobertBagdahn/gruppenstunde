import { useState, useDeferredValue, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Egg, Plus, ShieldCheck, Users, LayoutGrid, Leaf, Apple } from 'lucide-react';
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
import { useRecipeSearch } from '@/api/mealPlans';
import type { IngredientSearchResult, IngredientPortion, RecipeSearchResult } from '@/schemas/mealPlan';
import RecipePreviewDialog from './RecipePreviewDialog';
import CategoryPills from '@/components/recipe/CategoryPills';
import RecipeSearchCard from '@/components/recipe/RecipeSearchCard';
import RecentlyUsedSection from '@/components/recipe/RecentlyUsedSection';

// Welche recipe_types beim Öffnen aus einem bestimmten meal_type vorausgewählt werden
export const MEAL_TYPE_DEFAULT_RECIPE_TYPES: Record<string, string[]> = {
  breakfast: ['breakfast'],
  lunch: ['warm_meal', 'cold_meal'],
  dinner: ['warm_meal', 'cold_meal'],
  snack: ['snack'],
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
  const defaultTypes = MEAL_TYPE_DEFAULT_RECIPE_TYPES[mealType] ?? [];

  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(defaultTypes));
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>('all');
  const [ingredientDialog, setIngredientDialog] = useState<IngredientSearchResult | null>(null);
  const [previewRecipe, setPreviewRecipe] = useState<RecipeSearchResult | null>(null);
  const [excludeDietaryTags, setExcludeDietaryTags] = useState(true);
  const [includeTagIds, setIncludeTagIds] = useState<number[]>([]);

  const { data: allNutritionalTags = [] } = useNutritionalTags();

  // Tags that make sense as quick filters (vegan, vegetarisch, laktosefrei, glutenfrei)
  const QUICK_FILTER_NAMES = ['vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei'];
  const quickFilterTags = allNutritionalTags.filter(
    (t) => QUICK_FILTER_NAMES.some((name) => t.name.toLowerCase().includes(name))
  );

  const deferredQuery = useDeferredValue(query);

  const recipeTypesArray = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined;

  const { data: results } = useRecipeSearch({
    q: deferredQuery,
    meal_type: recipeTypesArray ? undefined : mealType, // meal_type nur als Fallback wenn kein expliziter Filter
    recipe_types: recipeTypesArray,
    recipe_badge: badgeFilter !== 'all' ? badgeFilter : null,
    exclude_nutritional_tag_ids: excludeDietaryTags && nutritionalTagIds?.length ? nutritionalTagIds : undefined,
    nutritional_tag_ids: includeTagIds.length > 0 ? includeTagIds : undefined,
    limit: 20,
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedTypes(new Set(defaultTypes));
      setBadgeFilter('all');
      setIngredientDialog(null);
      setPreviewRecipe(null);
    }
  }, [open, mealType]); // defaultTypes is derived from mealType

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

  const isIngredientMode = selectedTypes.has('ingredient');

  const recipes = results?.recipes ?? [];
  const ingredients = results?.ingredients ?? [];
  const fallbackApplied = results?.fallback_applied ?? false;

  const mealTypeLabel = mealType === 'breakfast' ? 'Frühstück'
    : mealType === 'lunch' ? 'Mittagessen'
    : mealType === 'dinner' ? 'Abendessen'
    : mealType === 'snack' ? 'Snack'
    : mealType === 'drinks' ? 'Getränke'
    : 'Mahlzeit';

  return (
    <>
      <Dialog open={open && !ingredientDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              {isIngredientMode ? (
                <><Apple className="w-5 h-5 text-primary" /> Zutat hinzufügen</>
              ) : (
                <><Search className="w-5 h-5 text-primary" /> Rezept für {mealTypeLabel} wählen</>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Suchfeld + Neu-Button */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isIngredientMode ? 'Zutat suchen...' : 'Rezept oder Zutat suchen...'}
                autoFocus
                className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {!isIngredientMode && (
              <Link
                to="/recipes/new"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Neues Rezept
              </Link>
            )}
          </div>

          {/* Filter-Zeile */}
          <div className="space-y-2">
            {/* Typ-Multi-Chips */}
            <CategoryPills selected={selectedTypes} onChange={setSelectedTypes} />

            {/* Badge-Filter */}
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

          {/* Ernährungsweise-Filter (Vegan, Vegetarisch, etc.) */}
          {quickFilterTags.length > 0 && (
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

          {/* Ernährungs-Ausschluss */}
          {nutritionalTagIds && nutritionalTagIds.length > 0 && (
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

          {/* Kürzlich verwendet (nur im Rezept-Modus) */}
          {!isIngredientMode && (
            <RecentlyUsedSection onSelect={(recipeId) => { onSelect(recipeId); onOpenChange(false); }} />
          )}

          {/* Fallback-Hinweis */}
          {fallbackApplied && (
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1.5 rounded-md">
              Nicht genug Rezepte für diesen Typ — zeige auch andere
            </p>
          )}

          {/* Ergebnisliste */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {!isIngredientMode && recipes.length > 0 && (
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
                     <Apple className="w-4 h-4 text-muted-foreground shrink-0" />
                     <span className="flex-1">{ing.name}</span>
                     <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                       Zutat
                     </span>
                   </button>
                 ))}
              </>
            )}

            {((!isIngredientMode && recipes.length === 0 && ingredients.length === 0) ||
             (isIngredientMode && ingredients.length === 0)) && (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Keine {isIngredientMode ? 'Zutaten' : 'Ergebnisse'} gefunden
                </p>
                {!isIngredientMode && (
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

      {/* Zutaten-Mengen-Dialog */}
      {ingredientDialog && (
        <IngredientQuantityDialog
          ingredient={ingredientDialog}
          open={!!ingredientDialog}
          onOpenChange={(open) => { if (!open) setIngredientDialog(null); }}
          onConfirm={handleIngredientConfirm}
        />
      )}

      {/* Rezept-Vorschau-Dialog */}
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

          {totalWeightG && selectedPortion?.weight_g && (
            <p className="text-xs text-muted-foreground">
              {quantity} × {selectedPortion.weight_g}g = {Math.round(totalWeightG)}g
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
