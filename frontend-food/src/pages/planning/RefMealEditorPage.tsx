/**
 * RefMealEditorPage — Baukasten-Ansicht zum Zusammenstellen von Reference Meals.
 * Route: /meal-plans/:id/ref-meals/:mealType
 */
import { useState, useMemo } from 'react';
import { MealItemAmountText } from '@/components/planning/MealItemAmountEditor';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { notify } from '@/lib/notify';
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
import { BackButton } from '@/components/shared/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import { RefMealSyncConfirmDialog } from '@/components/planning/RefMealSyncConfirmDialog';
import { formatNumber } from '@/lib/format';
import { PageSkeleton } from '@/components/ui/skeleton';
import { DecimalInput } from '@/components/ui/DecimalInput';

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

/** Category labels/order for breakfast-mode grouping */
const CATEGORY_LABELS: Record<string, string> = {
  basis: 'Brot',
  belag: 'Belag',
  warm: 'Warme Gerichte',
  extras: 'Extras',
  getraenke: 'Getränke',
};

const CATEGORY_ORDER = ['basis', 'belag', 'warm', 'extras', 'getraenke'] as const;

function getItemCategory(
  item: Pick<MealItem, 'ingredient_tags' | 'recipe_type' | 'recipe_id'>
): string {
  const tags = item.ingredient_tags || [];
  if (tags.includes('breakfast-base')) return 'basis';
  if (tags.includes('breakfast-topping')) return 'belag';
  if (item.recipe_type === 'drink') return 'getraenke';
  if (item.recipe_id) return 'warm';
  return 'extras';
}

export default function RefMealEditorPage() {
  const { id, mealType } = useParams<{ id: string; mealType: string }>();
  const navigate = useNavigate();
  const planId = Number(id) || 0;
  const currentMealType = mealType || 'breakfast';
  const isBreakfast = currentMealType === 'breakfast';
  const mealTypeLabel = MEAL_TYPE_LABELS[currentMealType] || currentMealType;

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

  const canEdit = plan?.can_edit ?? false;

  // Local state for items being edited
  const [localItems, setLocalItems] = useState<RefMealItemIn[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

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

  // Category grouping (breakfast mode). Hooks must run unconditionally, so these
  // memoised values live above the early returns below.
  const drinkCategory = 'getraenke';

  const groupedItems = useMemo(() => {
    if (!refMeal) return {} as Record<string, MealItem[]>;
    const groups: Record<string, MealItem[]> = {};
    for (const item of refMeal.items) {
      const cat = getItemCategory(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item as MealItem);
    }
    return groups;
  }, [refMeal]);

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

  // Handlers
  const handleCreateRefMeal = async () => {
    try {
      await createRefMeal.mutateAsync({ meal_type: currentMealType });
      notify.success('Referenz-Mahlzeit erstellt');
    } catch (error) {
      notify.error('Vorlage konnte nicht angelegt werden', { error: error });
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
      const result = await updateRefMealMutation.mutateAsync({ items: localItems });
      const count = result.synced_meal_count ?? 0;
      if (count > 0) {
        notify.success(
          `Referenz-Mahlzeit gespeichert · ${count} verknüpfte Mahlzeit${count === 1 ? '' : 'en'} aktualisiert`
        );
      } else {
        notify.success('Referenz-Mahlzeit gespeichert');
      }
    } catch (error) {
      notify.error('Vorlage konnte nicht gespeichert werden', { error: error });
    }
  };

  const handleSaveClick = () => {
    if (!refMeal) return;
    if (refMeal.synced_meals_count > 0) {
      setShowSyncConfirm(true);
      return;
    }
    void handleSave();
  };

  const handleConfirmSave = () => {
    setShowSyncConfirm(false);
    void handleSave();
  };

  const handleSync = async () => {
    if (!refMeal) return;
    try {
      const result = await syncRefMeal.mutateAsync(refMeal.id);
      const count = result?.synced_meals ?? 0;
      if (count === 0) {
        notify.info('Keine synchronisierten Mahlzeiten vorhanden');
      } else {
        notify.success(`${count} Mahlzeit${count === 1 ? '' : 'en'} wurde${count === 1 ? '' : 'n'} aktualisiert`);
      }
    } catch (error) {
      notify.error('Mahlzeiten konnten nicht synchronisiert werden', { error: error });
    }
  };

  const handleLinkAll = async () => {
    try {
      await linkAllMeals.mutateAsync(currentMealType);
      notify.success('Alle Mahlzeiten verknüpft und synchronisiert');
    } catch (error) {
      notify.error('Mahlzeiten konnten nicht verknüpft werden', { error: error });
    }
  };

  const handleNormalize = () => {
    if (totalEnergyKcal <= 0 || targetKcal <= 0) return;
    const ratio = targetKcal / totalEnergyKcal;
    setLocalItems((prev) =>
      prev.map((item) => ({ ...item, factor: Math.round((item.factor || 1) * ratio * 100) / 100 }))
    );
    notify.success(`Faktoren normalisiert (×${formatNumber(ratio, { maxDecimals: 2 })})`);
  };

  if (isLoading) {
    return (
      <PageSkeleton label="Vorlage wird geladen" />
    );
  }

  // Breakfast with no RefMeal → redirect directly to wizard
  if (isBreakfast && !refMeal) {
    return <Navigate to={`/meal-plans/${planId}/ref-meals/breakfast/wizard`} replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-title font-bold">
            Referenz-Mahlzeit: {mealTypeLabel}
          </h1>
          {plan && (
            <p className="text-muted-foreground text-body">{plan.name}</p>
          )}
        </div>
      </div>

      {/* No RefMeal yet — create one */}
      {!refMeal && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Noch keine Referenz-Mahlzeit für {mealTypeLabel} vorhanden.
            </p>
            {isBreakfast ? (
              canEdit ? (
                <button
                  onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Frühstücksassistent starten
                </button>
              ) : (
                <p className="text-body text-muted-foreground">Keine Berechtigung zum Erstellen von Referenz-Mahlzeiten.</p>
              )
            ) : (
              canEdit ? (
                <button
                  onClick={handleCreateRefMeal}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Referenz-Mahlzeit erstellen
                </button>
              ) : (
                <p className="text-body text-muted-foreground">Keine Berechtigung zum Erstellen von Referenz-Mahlzeiten.</p>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Wizard button for existing breakfast RefMeal */}
      {refMeal && isBreakfast && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
            className="flex items-center gap-2 px-3 py-1.5 text-body border rounded-lg hover:bg-muted transition-colors"
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
              <Card key={cat}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-body text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-body"
                    >
                      <span className="font-medium">
                        {item.display_name || item.recipe_title || item.ingredient_name || 'Unbekannt'}
                      </span>
                      <span className="text-muted-foreground">
                        {item.quantity ? <MealItemAmountText item={item} /> : `×${item.factor}`}
                        {item.energy_kcal != null && ` · ${Math.round(item.energy_kcal)} kcal`}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Energy split */}
          <Card>
            <CardContent className="p-4 space-y-2 bg-muted/50">
              <h3 className="font-semibold text-body">Energie pro Person</h3>
              <div className="flex justify-between text-body">
                <span>Essen:</span>
                <span className="font-mono">{Math.round(foodKcal)} kcal</span>
              </div>
              <div className="flex justify-between text-body">
                <span>Getränke:</span>
                <span className="font-mono">{Math.round(drinkKcal)} kcal</span>
              </div>
            </CardContent>
          </Card>

          {/* Sync info */}
          <Card>
            <CardContent className="p-4 space-y-2 bg-muted/50">
              <h3 className="font-semibold text-body">Verknüpfung</h3>
              <p className="text-body text-muted-foreground">
                {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
                {plan && (
                  <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
                )}
              </p>
            </CardContent>
          </Card>

          {/* Action buttons */}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSync}
                disabled={syncRefMeal.isPending}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-body disabled:opacity-50"
              >
                Für alle übernehmen
              </button>
              <button
                onClick={handleLinkAll}
                disabled={linkAllMeals.isPending}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-body disabled:opacity-50"
              >
                Alle {mealTypeLabel} verknüpfen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Non-Breakfast RefMeal Editor (existing Baukasten) */}
      {refMeal && !isBreakfast && canEdit && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Recipe Picker (Baukasten) */}
          <div className="space-y-4">
            <h2 className="text-section font-semibold">Verfügbare Rezepte</h2>
            <input
              type="text"
              placeholder="Rezepte suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-body"
            />

            {/* Recipe tiles grouped by type */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {searchResults?.recipes && searchResults.recipes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleAddRecipe(recipe.id, recipe.title)}
                      className="p-3 border rounded-lg text-left text-body hover:bg-accent hover:border-primary transition-colors"
                    >
                      <span className="font-medium">{recipe.title}</span>
                      <span className="block text-caption text-muted-foreground mt-0.5">
                        {RECIPE_TYPE_GROUPS[recipe.recipe_type] || recipe.recipe_type}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-body text-muted-foreground">
                  Keine Rezepte gefunden. Führe den Seed-Command aus.
                </p>
              )}
            </div>
          </div>

          {/* Right: Selected items + Energy overview */}
          <div className="space-y-4">
            <h2 className="text-section font-semibold">Zusammenstellung</h2>

            {/* Items list */}
            <div className="space-y-2">
              {localItems.length === 0 ? (
                <p className="text-body text-muted-foreground p-4 border rounded-lg text-center">
                  Noch keine Rezepte ausgewählt. Klicke links auf ein Rezept.
                </p>
              ) : (
                localItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    <span className="flex-1 text-body font-medium truncate">
                      {item.display_name || `Rezept #${item.recipe_id}`}
                    </span>
                    <label className="flex items-center gap-1 text-caption text-muted-foreground">
                      ×
                      <DecimalInput
                        value={item.factor}
                        onChange={(factor) => handleFactorChange(index, factor)}
                        min={0.1}
                        max={5}
                        aria-label={`Faktor für ${item.display_name || `Rezept ${item.recipe_id ?? ''}`}`}
                        className="w-16 px-1 py-0.5 border rounded-lg text-body text-center"
                      />
                    </label>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-destructive hover:text-destructive/80 text-body p-1"
                      title="Entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Energy overview */}
            <Card>
              <CardContent className="p-4 space-y-2 bg-muted/50">
                <h3 className="font-semibold text-body">Energie pro Person</h3>
                <div className="flex justify-between text-body">
                  <span>Ist:</span>
                  <span className="font-mono">{Math.round(totalEnergyKcal)} kcal</span>
                </div>
                <div className="flex justify-between text-body">
                  <span>Soll ({Math.round(dayPartFactor * 100)}% von {NORM_PERSON_DAILY_KCAL}):</span>
                  <span className="font-mono">{Math.round(targetKcal)} kcal</span>
                </div>
                <div className="flex justify-between text-body font-medium">
                  <span>Abweichung:</span>
                  <span
                    className={
                      energyPercent > 120 || energyPercent < 80
                        ? 'text-destructive'
                        : 'text-primary'
                    }
                  >
                    {energyPercent}%
                  </span>
                </div>
                {localItems.length > 0 && (
                  <button
                    onClick={handleNormalize}
                    className="w-full mt-2 px-3 py-1.5 text-body border rounded-lg hover:bg-background"
                  >
                    Normalisieren auf {Math.round(targetKcal)} kcal
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Sync info */}
            <Card>
              <CardContent className="p-4 space-y-2 bg-muted/50">
                <h3 className="font-semibold text-body">Verknüpfung</h3>
                <p className="text-body text-muted-foreground">
                  {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
                  {plan && (
                    <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveClick}
                disabled={updateRefMealMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-body disabled:opacity-50"
                data-testid="ref-meal-save-button"
              >
                Speichern
              </button>
              <button
                onClick={handleSync}
                disabled={syncRefMeal.isPending}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-body disabled:opacity-50"
              >
                Für alle übernehmen
              </button>
              <button
                onClick={handleLinkAll}
                disabled={linkAllMeals.isPending}
                className="px-4 py-2 border rounded-lg hover:bg-accent text-body disabled:opacity-50"
              >
                Alle {mealTypeLabel} verknüpfen
              </button>
            </div>
          </div>
        </div>
      )}

      {refMeal && !isBreakfast && !canEdit && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Keine Berechtigung zum Bearbeiten dieser Referenz-Mahlzeit.</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog before destructive auto-sync */}
      <RefMealSyncConfirmDialog
        open={showSyncConfirm}
        onOpenChange={setShowSyncConfirm}
        syncedMealsCount={refMeal?.synced_meals_count ?? 0}
        onCancel={() => setShowSyncConfirm(false)}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}
