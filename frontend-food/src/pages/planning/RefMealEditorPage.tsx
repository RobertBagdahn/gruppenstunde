import DetailHeader from '@/components/shared/DetailHeader';
/**
 * RefMealEditorPage — Baukasten-Ansicht zum Zusammenstellen von Reference Meals.
 * Route: /meal-plans/:id/ref-meals/:mealType
 */
import { useState, useMemo, type ReactNode } from 'react';
import { BookOpen, Flame, GlassWater, Layers, Link2, ListChecks, Search, Sparkles, UtensilsCrossed, Wheat, X } from 'lucide-react';
import { MealItemAmountText } from '@/components/planning/MealItemAmountEditor';
import { UnitViewToggle } from '@/components/quantity/UnitViewToggle';
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
import { RefMealSyncConfirmDialog } from '@/components/planning/RefMealSyncConfirmDialog';
import { formatNumber } from '@/lib/format';
import { PageSkeleton } from '@/components/ui/skeleton';
import { DecimalInput } from '@/components/ui/DecimalInput';
import RecipeTypeTag from '@/components/recipe/RecipeTypeTag';
import WizardSectionHeading from '@/pages/planning/wizard/WizardSectionHeading';
import { WIZARD_INPUT_CLASS } from '@/pages/planning/wizard/wizardStyles';

/** Neutral section card of the editor (tokens only, no category tint). */
const SECTION_CARD_CLASS = 'space-y-4 rounded-xl bg-card p-5 shadow-card';

/** Primary action, 44 px touch height. */
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-body font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50';

/** Secondary action in the primary-soft language, 44 px touch height. */
const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary/15 disabled:opacity-50';

/** Label/value line inside a section card. */
const KEY_VALUE_ROW_CLASS = 'flex items-center justify-between gap-3 text-body';

/** Category labels/order for breakfast-mode grouping */
const CATEGORY_LABELS: Record<string, string> = {
  basis: 'Brot',
  belag: 'Belag',
  warm: 'Warme Gerichte',
  extras: 'Extras',
  getraenke: 'Getränke',
};

const CATEGORY_ICONS: Record<string, ReactNode> = {
  basis: <Wheat className="h-5 w-5" aria-hidden="true" />,
  belag: <Layers className="h-5 w-5" aria-hidden="true" />,
  warm: <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />,
  extras: <Sparkles className="h-5 w-5" aria-hidden="true" />,
  getraenke: <GlassWater className="h-5 w-5" aria-hidden="true" />,
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
        portion_id: item.portion_id ?? null,
        standard_measure_key: item.standard_measure_key || null,
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
    <div className="pb-8">
      <DetailHeader
        title={`Referenz-Mahlzeit: ${mealTypeLabel}`}
        description={plan?.name}
        back={{ to: `/meal-plans/${id}`, label: 'Zurück zum Essensplan' }}
      />
      <div className="mx-auto max-w-7xl space-y-6 px-4">

        {/* No RefMeal yet — create one */}
        {!refMeal && (
          <section className={`${SECTION_CARD_CLASS} text-center`}>
            <p className="text-emphasis text-muted-foreground">
              Noch keine Referenz-Mahlzeit für {mealTypeLabel} vorhanden.
            </p>
            {isBreakfast ? (
              canEdit ? (
                <button
                  onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
                  className={PRIMARY_BUTTON_CLASS}
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
                  className={PRIMARY_BUTTON_CLASS}
                >
                  Referenz-Mahlzeit erstellen
                </button>
              ) : (
                <p className="text-body text-muted-foreground">Keine Berechtigung zum Erstellen von Referenz-Mahlzeiten.</p>
              )
            )}
          </section>
        )}

        {/* Wizard button for existing breakfast RefMeal */}
        {refMeal && isBreakfast && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <UnitViewToggle />
            <button
              onClick={() => navigate(`/meal-plans/${planId}/ref-meals/breakfast/wizard`)}
              className={SECONDARY_BUTTON_CLASS}
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
                <section key={cat} className={SECTION_CARD_CLASS}>
                  <WizardSectionHeading icon={CATEGORY_ICONS[cat]}>
                    {CATEGORY_LABELS[cat]}
                  </WizardSectionHeading>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={KEY_VALUE_ROW_CLASS}
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
                </section>
              );
            })}

            {/* Energy split */}
            <section className={SECTION_CARD_CLASS}>
              <WizardSectionHeading icon={<Flame className="h-5 w-5" aria-hidden="true" />}>
                Energie pro Person
              </WizardSectionHeading>
              <div className={KEY_VALUE_ROW_CLASS}>
                <span>Essen:</span>
                <span className="font-mono">{Math.round(foodKcal)} kcal</span>
              </div>
              <div className={KEY_VALUE_ROW_CLASS}>
                <span>Getränke:</span>
                <span className="font-mono">{Math.round(drinkKcal)} kcal</span>
              </div>
            </section>

            {/* Sync info */}
            <section className={SECTION_CARD_CLASS}>
              <WizardSectionHeading icon={<Link2 className="h-5 w-5" aria-hidden="true" />}>
                Verknüpfung
              </WizardSectionHeading>
              <p className="text-body text-muted-foreground">
                {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
                {plan && (
                  <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
                )}
              </p>
            </section>

            {/* Action buttons */}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncRefMeal.isPending}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Für alle übernehmen
                </button>
                <button
                  onClick={handleLinkAll}
                  disabled={linkAllMeals.isPending}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Alle {mealTypeLabel} verknüpfen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Non-Breakfast RefMeal Editor (Baukasten) */}
        {refMeal && !isBreakfast && canEdit && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Recipe Picker (Baukasten) */}
            <section className={SECTION_CARD_CLASS}>
              <WizardSectionHeading icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}>
                Verfügbare Rezepte
              </WizardSectionHeading>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Rezepte suchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${WIZARD_INPUT_CLASS} pl-9`}
                  aria-label="Rezepte suchen"
                />
              </div>

              {/* Recipe tiles grouped by type */}
              <div className="max-h-[60vh] space-y-4 overflow-y-auto">
                {searchResults?.recipes && searchResults.recipes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {searchResults.recipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => handleAddRecipe(recipe.id, recipe.title)}
                        className="flex min-h-11 flex-col items-start gap-2 rounded-lg bg-muted p-3 text-left text-body transition-colors hover:bg-primary-soft"
                      >
                        <span className="font-medium">{recipe.title}</span>
                        <RecipeTypeTag type={recipe.recipe_type} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-body text-muted-foreground">
                    Keine Rezepte gefunden. Führe den Seed-Command aus.
                  </p>
                )}
              </div>
            </section>

            {/* Right: Selected items + Energy overview */}
            <div className="space-y-6">
              <section className={SECTION_CARD_CLASS}>
                <WizardSectionHeading icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}>
                  Zusammenstellung
                </WizardSectionHeading>

                {/* Items list */}
                <div className="space-y-2">
                  {localItems.length === 0 ? (
                    <p className="rounded-lg bg-muted p-4 text-center text-body text-muted-foreground">
                      Noch keine Rezepte ausgewählt. Klicke links auf ein Rezept.
                    </p>
                  ) : (
                    localItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-muted p-2 pl-3"
                      >
                        <span className="flex-1 truncate text-body font-medium">
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
                            className="h-11 w-16 rounded-lg border border-border bg-card px-1 text-center text-emphasis md:text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </label>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-danger-foreground"
                          title="Entfernen"
                          aria-label={`${item.display_name || `Rezept #${item.recipe_id}`} entfernen`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Energy overview */}
              <section className={SECTION_CARD_CLASS}>
                <WizardSectionHeading icon={<Flame className="h-5 w-5" aria-hidden="true" />}>
                  Energie pro Person
                </WizardSectionHeading>
                <div className={KEY_VALUE_ROW_CLASS}>
                  <span>Ist:</span>
                  <span className="font-mono">{Math.round(totalEnergyKcal)} kcal</span>
                </div>
                <div className={KEY_VALUE_ROW_CLASS}>
                  <span>Soll ({Math.round(dayPartFactor * 100)}% von {NORM_PERSON_DAILY_KCAL}):</span>
                  <span className="font-mono">{Math.round(targetKcal)} kcal</span>
                </div>
                <div className={`${KEY_VALUE_ROW_CLASS} font-medium`}>
                  <span>Abweichung:</span>
                  <span
                    className={
                      energyPercent > 120 || energyPercent < 80
                        ? 'text-danger-foreground'
                        : 'text-primary-dark'
                    }
                  >
                    {energyPercent}%
                  </span>
                </div>
                {localItems.length > 0 && (
                  <button
                    onClick={handleNormalize}
                    className={`${SECONDARY_BUTTON_CLASS} w-full`}
                  >
                    Normalisieren auf {Math.round(targetKcal)} kcal
                  </button>
                )}
              </section>

              {/* Sync info */}
              <section className={SECTION_CARD_CLASS}>
                <WizardSectionHeading icon={<Link2 className="h-5 w-5" aria-hidden="true" />}>
                  Verknüpfung
                </WizardSectionHeading>
                <p className="text-body text-muted-foreground">
                  {refMeal.synced_meals_count}/{refMeal.total_meals_count} {mealTypeLabel} verknüpft
                  {plan && (
                    <> · {plan.norm_portions} Personen × {refMeal.synced_meals_count} Tage = {plan.norm_portions * refMeal.synced_meals_count} Portionen</>
                  )}
                </p>
              </section>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveClick}
                  disabled={updateRefMealMutation.isPending}
                  className={PRIMARY_BUTTON_CLASS}
                  data-testid="ref-meal-save-button"
                >
                  Speichern
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncRefMeal.isPending}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Für alle übernehmen
                </button>
                <button
                  onClick={handleLinkAll}
                  disabled={linkAllMeals.isPending}
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Alle {mealTypeLabel} verknüpfen
                </button>
              </div>
            </div>
          </div>
        )}

        {refMeal && !isBreakfast && !canEdit && (
          <section className={`${SECTION_CARD_CLASS} text-center`}>
            <p className="text-body text-muted-foreground">Keine Berechtigung zum Bearbeiten dieser Referenz-Mahlzeit.</p>
          </section>
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
    </div>
  );
}
