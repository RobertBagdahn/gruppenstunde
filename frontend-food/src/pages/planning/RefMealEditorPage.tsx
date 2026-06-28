/**
 * RefMealEditorPage — Baukasten-Ansicht zum Zusammenstellen von Reference Meals.
 * Route: /meal-plans/:id/ref-meals/:mealType
 */
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useRefMeals,
  useCreateRefMeal,
  useUpdateRefMeal,
  useSyncRefMeal,
  useLinkAllMeals,
} from '@/api/refMeals';
import { useRecipeSearch } from '@/api/mealPlans';
import { useMealPlan } from '@/api/mealPlans';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { MealItem, RefMealItemIn } from '@/schemas/mealPlan';
import { NORM_PERSON_DAILY_KCAL } from '@/lib/breakfastCalc';

/** Category labels for recipe type grouping */
const RECIPE_TYPE_GROUPS: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warme Mahlzeit',
  cold_meal: 'Kalte Mahlzeit',
  dessert: 'Nachtisch',
  recipe_part: 'Rezeptteil',
  drink: 'Getränke',
  snack: 'Snack',
  ingredient: 'Zutat',
};

export default function RefMealEditorPage() {
  const { id, mealType } = useParams<{ id: string; mealType: string }>();
  const navigate = useNavigate();
  const planId = Number(id) || 0;
  const currentMealType = mealType || 'breakfast';
  const isBreakfast = currentMealType === 'breakfast';

  // Data fetching
  const { data: plan } = useMealPlan(planId);
  const { data: refMeals, isLoading } = useRefMeals(planId);
  const createRefMeal = useCreateRefMeal(planId);
  const syncRefMeal = useSyncRefMeal(planId);
  const linkAllMeals = useLinkAllMeals(planId);

  // Find existing RefMeal for this type
  const refMeal = useMemo(
    () => refMeals?.find((rm) => rm.meal_type === currentMealType),
    [refMeals, currentMealType]
  );

  // Local state for items being edited
  const [localItems, setLocalItems] = useState<RefMealItemIn[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize local items from refMeal
  if (refMeal && !initialized) {
    setLocalItems(
      refMeal.items.map((item) => ({
        recipe_id: item.recipe_id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        measuring_unit_id: item.measuring_unit_id,
        display_name: item.display_name,
        factor: item.factor,
      }))
    );
    setInitialized(true);
  }

  const updateRefMealMutation = useUpdateRefMeal(planId, refMeal?.id || 0);

  // Recipe search for the picker
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useRecipeSearch({
    q: searchQuery,
    meal_type: currentMealType,
  });

  // Energy calculation
  const dayPartFactor = refMeal?.day_part_factor || 0.25;
  const targetKcal = NORM_PERSON_DAILY_KCAL * dayPartFactor;

  const totalEnergyKcal = useMemo(() => {
    if (!refMeal) return 0;
    return refMeal.items.reduce((sum, item) => {
      const energy = item.energy_kcal || 0;
      return sum + energy;
    }, 0);
  }, [refMeal]);
  const energyPercent = targetKcal > 0 ? Math.round((totalEnergyKcal / targetKcal) * 100) : 0;

  // Handlers
  const handleCreateRefMeal = async () => {
    try {
      await createRefMeal.mutateAsync({ meal_type: currentMealType });
      toast.success('Referenz-Mahlzeit erstellt');
    } catch {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleAddRecipe = (recipeId: number, recipeTitle: string) => {
    const newItem: RefMealItemIn = {
      recipe_id: recipeId,
      factor: 1.0,
      display_name: recipeTitle,
    };
    setLocalItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setLocalItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFactorChange = (index: number, factor: number) => {
    setLocalItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, factor } : item))
    );
  };

  const handleSave = async () => {
    if (!refMeal) return;
    try {
      await updateRefMealMutation.mutateAsync({ items: localItems });
      toast.success('Referenz-Mahlzeit gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleSync = async () => {
    if (!refMeal) return;
    try {
      const result = await syncRefMeal.mutateAsync(refMeal.id);
      const count = result?.synced_meals ?? 0;
      if (count === 0) {
        toast.info('Keine synchronisierten Mahlzeiten vorhanden');
      } else {
        toast.success(`${count} Mahlzeit${count === 1 ? '' : 'en'} wurde${count === 1 ? '' : 'n'} aktualisiert`);
      }
    } catch {
      toast.error('Fehler beim Synchronisieren');
    }
  };

  const handleLinkAll = async () => {
    try {
      await linkAllMeals.mutateAsync(currentMealType);
      toast.success('Alle Mahlzeiten verknüpft und synchronisiert');
    } catch {
      toast.error('Fehler beim Verknüpfen');
    }
  };

  const handleNormalize = () => {
    if (totalEnergyKcal <= 0 || targetKcal <= 0) return;
    const ratio = targetKcal / totalEnergyKcal;
    setLocalItems((prev) =>
      prev.map((item) => ({ ...item, factor: Math.round((item.factor || 1) * ratio * 100) / 100 }))
    );
    toast.success(`Faktoren normalisiert (×${ratio.toFixed(2)})`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Breakfast with no RefMeal → redirect directly to wizard
  if (isBreakfast && !refMeal) {
    return <Navigate to={`/meal-plans/${planId}/ref-meals/breakfast/wizard`} replace />;
  }

  const mealTypeLabel = MEAL_TYPE_LABELS[currentMealType] || currentMealType;

  // Category grouping helpers for breakfast mode
  const CATEGORY_LABELS: Record<string, string> = {
    basis: 'Brot',
    belag: 'Belag',
    warm: 'Warme Gerichte',
    extras: 'Extras',
    getraenke: 'Getränke',
  };

  const CATEGORY_ORDER = ['basis', 'belag', 'warm', 'extras', 'getraenke'] as const;

  function getItemCategory(item: MealItem): string {
    const tags = item.ingredient_tags || [];
    if (tags.includes('breakfast-base')) return 'basis';
    if (tags.includes('breakfast-topping')) return 'belag';
    if (item.recipe_type === 'drink') return 'getraenke';
    if (item.recipe_id) return 'warm';
    return 'extras';
  }

  const groupedItems = useMemo(() => {
    if (!refMeal) return {} as Record<string, MealItem[]>;
    const groups: Record<string, MealItem[]> = {};
    for (const item of refMeal.items) {
      const cat = getItemCategory(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [refMeal]);

  const drinkCategory = 'getraenke';

  const foodKcal = useMemo(() => {
    if (!refMeal) return 0;
    return refMeal.items
      .filter((item) => getItemCategory(item) !== drinkCategory)
      .reduce((sum, item) => sum + (item.energy_kcal || 0), 0);
  }, [refMeal]);

  const drinkKcal = useMemo(() => {
    if (!refMeal) return 0;
    return refMeal.items
      .filter((item) => getItemCategory(item) === drinkCategory)
      .reduce((sum, item) => sum + (item.energy_kcal || 0), 0);
  }, [refMeal]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 hover:bg-accent rounded-md"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            Referenz-Mahlzeit: {mealTypeLabel}
          </h1>
          {plan && (
            <p className="text-muted-foreground text-sm">{plan.name}</p>
          )}
        </div>
      </div>

      {/* No RefMeal yet — create one */}
      {!refMeal && (
        <div className="border rounded-lg p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            Noch keine Referenz-Mahlzeit für {mealTypeLabel} vorhanden.
          </p>
          {isBreakfast ? (
            <button
              onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Frühstücksassistent starten
            </button>
          ) : (
            <button
              onClick={handleCreateRefMeal}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Referenz-Mahlzeit erstellen
            </button>
          )}
        </div>
      )}

      {/* Wizard button for existing breakfast RefMeal */}
      {refMeal && isBreakfast && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            Frühstücksassistent öffnen
          </button>
        </div>
      )}

      {/* Breakfast RefMeal — grouped read-only view */}
      {refMeal && isBreakfast && (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const items = groupedItems[cat] || [];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_LABELS[cat]}
                </h3>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">
                      {item.display_name || item.recipe_title || item.ingredient_name || 'Unbekannt'}
                    </span>
                    <span className="text-muted-foreground">
                      {item.quantity ? `${Math.round(item.quantity)} ${item.measuring_unit_name || 'g'}` : `×${item.factor}`}
                      {item.energy_kcal != null && ` · ${Math.round(item.energy_kcal)} kcal`}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Energy split */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
            <h3 className="font-semibold text-sm">Energie pro Person</h3>
            <div className="flex justify-between text-sm">
              <span>Essen:</span>
              <span className="font-mono">{Math.round(foodKcal)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Getränke:</span>
              <span className="font-mono">{Math.round(drinkKcal)} kcal</span>
            </div>
          </div>

          {/* Sync info */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
            <h3 className="font-semibold text-sm">Verknüpfung</h3>
            <p className="text-sm text-muted-foreground">
              {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
              {plan && (
                <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSync}
              disabled={syncRefMeal.isPending}
              className="px-4 py-2 border rounded-md hover:bg-accent text-sm disabled:opacity-50"
            >
              Für alle übernehmen
            </button>
            <button
              onClick={handleLinkAll}
              disabled={linkAllMeals.isPending}
              className="px-4 py-2 border rounded-md hover:bg-accent text-sm disabled:opacity-50"
            >
              Alle {mealTypeLabel} verknüpfen
            </button>
          </div>
        </div>
      )}

      {/* Non-Breakfast RefMeal Editor (existing Baukasten) */}
      {refMeal && !isBreakfast && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Recipe Picker (Baukasten) */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verfügbare Rezepte</h2>
            <input
              type="text"
              placeholder="Rezepte suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />

            {/* Recipe tiles grouped by type */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {searchResults?.recipes && searchResults.recipes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleAddRecipe(recipe.id, recipe.title)}
                      className="p-3 border rounded-md text-left text-sm hover:bg-accent hover:border-primary transition-colors"
                    >
                      <span className="font-medium">{recipe.title}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {RECIPE_TYPE_GROUPS[recipe.recipe_type] || recipe.recipe_type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine Rezepte gefunden. Führe den Seed-Command aus.
                </p>
              )}
            </div>
          </div>

          {/* Right: Selected items + Energy overview */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Zusammenstellung</h2>

            {/* Items list */}
            <div className="space-y-2">
              {localItems.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border rounded-md text-center">
                  Noch keine Rezepte ausgewählt. Klicke links auf ein Rezept.
                </p>
              ) : (
                localItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-md"
                  >
                    <span className="flex-1 text-sm font-medium truncate">
                      {item.display_name || `Rezept #${item.recipe_id}`}
                    </span>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      ×
                      <input
                        type="number"
                        value={item.factor}
                        onChange={(e) =>
                          handleFactorChange(index, parseFloat(e.target.value) || 1)
                        }
                        step={0.1}
                        min={0.1}
                        max={5}
                        className="w-16 px-1 py-0.5 border rounded text-sm text-center"
                      />
                    </label>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-destructive hover:text-destructive/80 text-sm p-1"
                      title="Entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Energy overview */}
            <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
              <h3 className="font-semibold text-sm">Energie pro Person</h3>
              <div className="flex justify-between text-sm">
                <span>Ist:</span>
                <span className="font-mono">{Math.round(totalEnergyKcal)} kcal</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Soll ({Math.round(dayPartFactor * 100)}% von {NORM_PERSON_DAILY_KCAL}):</span>
                <span className="font-mono">{Math.round(targetKcal)} kcal</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Abweichung:</span>
                <span
                  className={
                    energyPercent > 120 || energyPercent < 80
                      ? 'text-destructive'
                      : 'text-green-600'
                  }
                >
                  {energyPercent}%
                </span>
              </div>
              {localItems.length > 0 && (
                <button
                  onClick={handleNormalize}
                  className="w-full mt-2 px-3 py-1.5 text-sm border rounded-md hover:bg-background"
                >
                  Normalisieren auf {Math.round(targetKcal)} kcal
                </button>
              )}
            </div>

            {/* Sync info */}
            <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
              <h3 className="font-semibold text-sm">Verknüpfung</h3>
              <p className="text-sm text-muted-foreground">
                {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
                {plan && (
                  <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={updateRefMealMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                onClick={handleSync}
                disabled={syncRefMeal.isPending}
                className="px-4 py-2 border rounded-md hover:bg-accent text-sm disabled:opacity-50"
              >
                Für alle übernehmen
              </button>
              <button
                onClick={handleLinkAll}
                disabled={linkAllMeals.isPending}
                className="px-4 py-2 border rounded-md hover:bg-accent text-sm disabled:opacity-50"
              >
                Alle {mealTypeLabel} verknüpfen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
