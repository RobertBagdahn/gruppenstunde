import { useState, useDeferredValue, useEffect } from 'react';
import { Search, Star, TrendingUp, BookOpen, Egg } from 'lucide-react';
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
import { useNutritionalTags } from '@/api/supplies';
import type { IngredientSearchResult, IngredientPortion, RecipeSearchResult } from '@/schemas/mealPlan';
import RecipePreviewDialog from './RecipePreviewDialog';

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

const TAG_COLOR_MAP: Record<string, string> = {
  // Tierisch — rot
  'Tierbestandteile (nicht Vegetarisch)': 'bg-red-100 text-red-700 border-red-200',
  'Tierische Produkte (nicht Vegan)': 'bg-red-100 text-red-700 border-red-200',
  // Allergene — amber
  'Gluten (Zöliakie)': 'bg-amber-100 text-amber-700 border-amber-200',
  'Laktose': 'bg-amber-100 text-amber-700 border-amber-200',
  'Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...': 'bg-amber-100 text-amber-700 border-amber-200',
  'Erdnüsse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Fisch': 'bg-amber-100 text-amber-700 border-amber-200',
  'Soja, Sojaerzeugnisse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Sellerie, Sellerieerzeugnisse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Senf': 'bg-amber-100 text-amber-700 border-amber-200',
  'Sesam': 'bg-amber-100 text-amber-700 border-amber-200',
  'Lupinen': 'bg-amber-100 text-amber-700 border-amber-200',
  // Intoleranzen — purple
  'Histamin': 'bg-purple-100 text-purple-700 border-purple-200',
  'Fructose': 'bg-purple-100 text-purple-700 border-purple-200',
  'Koffeinhaltig': 'bg-purple-100 text-purple-700 border-purple-200',
  // Religiös/Ethisch — green
  'Halal': 'bg-green-100 text-green-700 border-green-200',
  'Koscher': 'bg-green-100 text-green-700 border-green-200',
  // Getreide — stone
  'Gluten (nicht zöliakie)': 'bg-stone-100 text-stone-700 border-stone-200',
  'Weizen': 'bg-stone-100 text-stone-700 border-stone-200',
  'Roggen': 'bg-stone-100 text-stone-700 border-stone-200',
  'Gerste': 'bg-stone-100 text-stone-700 border-stone-200',
  'Hafer': 'bg-stone-100 text-stone-700 border-stone-200',
  'Dinkel': 'bg-stone-100 text-stone-700 border-stone-200',
  'Kamut': 'bg-stone-100 text-stone-700 border-stone-200',
  // Sonstige — sky
  'Alkohol': 'bg-sky-100 text-sky-700 border-sky-200',
  'Scharf': 'bg-sky-100 text-sky-700 border-sky-200',
  'Schwefeldioxid und Sulfide': 'bg-sky-100 text-sky-700 border-sky-200',
  'Hülsenfrüchte': 'bg-sky-100 text-sky-700 border-sky-200',
  'Knoblauch': 'bg-sky-100 text-sky-700 border-sky-200',
};

const RECIPE_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-yellow-100 text-yellow-800',
  warm_meal: 'bg-orange-100 text-orange-800',
  cold_meal: 'bg-blue-100 text-blue-800',
  dessert: 'bg-pink-100 text-pink-800',
  side_dish: 'bg-lime-100 text-lime-800',
  snack: 'bg-green-100 text-green-800',
  drink: 'bg-cyan-100 text-cyan-800',
  simple_meal: 'bg-slate-100 text-slate-800',
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
  const [previewRecipe, setPreviewRecipe] = useState<RecipeSearchResult | null>(null);

  const deferredQuery = useDeferredValue(query);

  const { data: results } = useRecipeSearch({
    q: deferredQuery,
    recipe_type: recipeType || undefined,
    nutritional_tag_ids: selectedTagIds.length ? selectedTagIds : undefined,
    limit: 20,
  });

  const { data: popularData } = usePopularRecipes({ mealType });
  const { data: nutritionalTags } = useNutritionalTags();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setRecipeType(defaultTypes[0] ?? '');
      setSelectedTagIds([]);
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
              <div className="flex flex-wrap gap-1.5">
                {nutritionalTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  const colorClasses = TAG_COLOR_MAP[tag.name] ?? 'bg-muted text-muted-foreground border-border';
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-full text-sm border transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : `${colorClasses} hover:opacity-80`
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Popular Recipes (shown when no active search) */}
          {(!deferredQuery || deferredQuery.length < 2) && !recipeType && !selectedTagIds.length && popularData && (
            <div className="rounded-lg border p-3 space-y-3">
              {popularData.personal.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-primary" />
                    Deine Top-Rezepte
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularData.personal.map((r) => (
                      <button
                        key={`pop-p-${r.id}`}
                        onClick={() => handleSelect({ ...r, slug: '', image: r.image ?? undefined } as RecipeSearchResult)}
                        className="px-2.5 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.title}
                        <span className="text-xs text-muted-foreground">({r.usage_count}×)</span>
                      </button>
                    ))}
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
                    {popularData.community.map((r) => (
                      <button
                        key={`pop-c-${r.id}`}
                        onClick={() => handleSelect({ ...r, slug: '', image: r.image ?? undefined } as RecipeSearchResult)}
                        className="px-2.5 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.title}
                        <span className="text-xs text-muted-foreground">({r.usage_count}×)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {/* Recipe results */}
            {recipes.length > 0 && (
              <>
                {ingredients.length > 0 && (
                  <div className="px-3 py-1.5 bg-muted/50 text-sm font-semibold text-muted-foreground">
                    Rezepte
                  </div>
                )}
                {recipes.map((r) => (
                  <button
                    key={`recipe-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2.5 text-base hover:bg-accent hover:shadow-sm transition-all flex items-center gap-3"
                  >
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RECIPE_TYPE_COLORS[r.recipe_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {RECIPE_TYPE_LABELS[r.recipe_type] ?? r.recipe_type}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Ingredient results */}
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
          {/* Quantity */}
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
