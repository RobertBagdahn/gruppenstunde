import { useState, useDeferredValue, useEffect } from 'react';
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
import { useNutritionalTags } from '@/api/supplies';
import type { IngredientSearchResult, IngredientPortion } from '@/schemas/mealPlan';

const RECIPE_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  dessert: 'Nachtisch',
  side_dish: 'Beilage',
  snack: 'Snack',
  drink: 'Getränk',
  simple_meal: 'Einfache Mahlzeit',
};

/** Map meal_type to default recipe_type filter values */
const MEAL_TYPE_TO_RECIPE_TYPES: Record<string, string[]> = {
  breakfast: ['breakfast', 'simple_meal'],
  lunch: ['warm_meal', 'cold_meal', 'side_dish'],
  dinner: ['warm_meal', 'cold_meal', 'side_dish'],
  snack: ['snack', 'simple_meal'],
  dessert: ['dessert'],
};

interface RecipeSearchDialogProps {
  mealType: string;
  onSelect: (recipeId: number) => void;
  onSelectIngredient?: (ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecipeSearchDialog({
  mealType,
  onSelect,
  onSelectIngredient,
  open,
  onOpenChange,
}: RecipeSearchDialogProps) {
  const defaultTypes = MEAL_TYPE_TO_RECIPE_TYPES[mealType] ?? [];

  const [query, setQuery] = useState('');
  const [recipeType, setRecipeType] = useState<string>(defaultTypes[0] ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [ingredientDialog, setIngredientDialog] = useState<IngredientSearchResult | null>(null);

  const deferredQuery = useDeferredValue(query);

  const { data: results } = useRecipeSearch({
    q: deferredQuery,
    recipe_type: recipeType || undefined,
    nutritional_tag_ids: selectedTagIds.length ? selectedTagIds : undefined,
    limit: 20,
  });

  const { data: nutritionalTags } = useNutritionalTags();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setRecipeType(defaultTypes[0] ?? '');
      setSelectedTagIds([]);
      setIngredientDialog(null);
    }
  }, [open]);

  const handleSelect = (recipeId: number) => {
    onSelect(recipeId);
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

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const recipes = results?.recipes ?? [];
  const ingredients = results?.ingredients ?? [];

  return (
    <>
      <Dialog open={open && !ingredientDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Rezept-Detailsuche</DialogTitle>
          </DialogHeader>

          {/* Search input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept oder Zutat suchen..."
            autoFocus
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={recipeType || '_all'} onValueChange={(v) => setRecipeType(v === '_all' ? '' : v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Rezepttyp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Alle Typen</SelectItem>
                {Object.entries(RECIPE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {nutritionalTags && nutritionalTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {nutritionalTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {/* Recipe results */}
            {recipes.length > 0 && (
              <>
                {ingredients.length > 0 && (
                  <div className="px-3 py-1 bg-muted/50 text-xs font-medium text-muted-foreground">
                    Rezepte
                  </div>
                )}
                {recipes.map((r) => (
                  <button
                    key={`recipe-${r.id}`}
                    onClick={() => handleSelect(r.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span>{r.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {RECIPE_TYPE_LABELS[r.recipe_type] ?? r.recipe_type}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Ingredient results */}
            {ingredients.length > 0 && (
              <>
                <div className="px-3 py-1 bg-muted/50 text-xs font-medium text-muted-foreground">
                  Zutaten
                </div>
                {ingredients.map((ing) => (
                  <button
                    key={`ing-${ing.id}`}
                    onClick={() => setIngredientDialog(ing)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span>{ing.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ing.standalone_type ? (RECIPE_TYPE_LABELS[ing.standalone_type] ?? ing.standalone_type) : 'Zutat'}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Empty state */}
            {recipes.length === 0 && ingredients.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                {deferredQuery.length >= 2 || recipeType || selectedTagIds.length
                  ? 'Keine Ergebnisse gefunden'
                  : 'Suchbegriff oder Filter wählen'}
              </p>
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
          <DialogTitle>{ingredient.name} hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="text-sm font-medium">Menge</label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Portion select */}
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

          {/* Weight display */}
          {totalWeightG && (
            <p className="text-xs text-muted-foreground">
              = {Math.round(totalWeightG)}g
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onConfirm(ingredient.id, selectedPortion, quantity)}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
