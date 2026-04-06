import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useMealPlan,
  useUpdateMealPlan,
  useAddDay,
  useRemoveDay,
  useAddMeal,
  useRemoveMeal,
  useAddMealItem,
  useRemoveMealItem,
  useNutritionSummary,
  useShoppingList,
  useRecipeSearch,
} from '@/api/mealPlans';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@/schemas/mealPlan';
import type { MealDay, Meal } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mealPlanId = Number(id) || 0;

  const { data: plan, error, isLoading, refetch } = useMealPlan(mealPlanId);
  const updateMutation = useUpdateMealPlan(mealPlanId);
  const addDayMutation = useAddDay(mealPlanId);
  const removeDayMutation = useRemoveDay(mealPlanId);
  const addMealMutation = useAddMeal(mealPlanId);
  const removeMealMutation = useRemoveMeal(mealPlanId);
  const addMealItemMutation = useAddMealItem(mealPlanId);
  const removeMealItemMutation = useRemoveMealItem(mealPlanId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'plan' | 'nutrition' | 'shopping'>('plan');

  // Add day state
  const [newDayDate, setNewDayDate] = useState('');

  // Recipe search state
  const [searchMealId, setSearchMealId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults } = useRecipeSearch(searchQuery);

  // Delete confirmations
  const [deleteDayId, setDeleteDayId] = useState<number | null>(null);
  const [deleteMealId, setDeleteMealId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Edit settings
  const [showSettings, setShowSettings] = useState(false);

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!plan) return <ErrorDisplay error={new Error('Essensplan nicht gefunden')} />;

  const handleAddDay = () => {
    if (!newDayDate) return;
    addDayMutation.mutate(
      { date: newDayDate },
      {
        onSuccess: () => {
          toast.success('Tag hinzugefügt');
          setNewDayDate('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddMealType = (dayId: number, mealType: string) => {
    addMealMutation.mutate(
      { dayId, meal_type: mealType },
      {
        onSuccess: () => toast.success('Mahlzeit hinzugefügt'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddRecipe = (mealId: number, recipeId: number) => {
    addMealItemMutation.mutate(
      { mealId, recipe_id: recipeId },
      {
        onSuccess: () => {
          toast.success('Rezept hinzugefügt');
          setSearchMealId(null);
          setSearchQuery('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleSaveSettings = (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    activity_factor?: number;
    reserve_factor?: number;
  }) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Einstellungen gespeichert');
        setShowSettings(false);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="container py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button
           onClick={() => navigate('/meal-plans/app')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Zurück
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{plan.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">group</span>
              {plan.norm_portions} Portionen
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">speed</span>
              PAL {plan.activity_factor}
            </span>
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">celebration</span>
                {plan.event_name}
              </span>
            )}
          </div>
        </div>
        {plan.can_edit && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors self-start"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Einstellungen
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && plan.can_edit && (
        <SettingsPanel plan={plan} onSave={handleSaveSettings} isPending={updateMutation.isPending} />
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { key: 'plan' as const, icon: 'calendar_month', label: 'Tagesplan' },
          { key: 'nutrition' as const, icon: 'nutrition', label: 'Nährwerte' },
          { key: 'shopping' as const, icon: 'shopping_cart', label: 'Einkaufsliste' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' && (
        <DayPlanView
          plan={plan}
          canEdit={plan.can_edit}
          newDayDate={newDayDate}
          setNewDayDate={setNewDayDate}
          onAddDay={handleAddDay}
          addDayPending={addDayMutation.isPending}
          onDeleteDay={setDeleteDayId}
          onAddMealType={handleAddMealType}
          onDeleteMeal={setDeleteMealId}
          searchMealId={searchMealId}
          setSearchMealId={setSearchMealId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onAddRecipe={handleAddRecipe}
          onDeleteItem={setDeleteItemId}
        />
      )}
      {activeTab === 'nutrition' && <NutritionView mealPlanId={mealPlanId} />}
      {activeTab === 'shopping' && <ShoppingView mealPlanId={mealPlanId} />}

      {/* Delete Day Confirm */}
      <ConfirmDialog
        open={deleteDayId !== null}
        onConfirm={() => {
          if (deleteDayId === null) return;
          removeDayMutation.mutate(deleteDayId, {
            onSuccess: () => {
              toast.success('Tag gelöscht');
              setDeleteDayId(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteDayId(null)}
        title="Tag löschen?"
        description="Alle Mahlzeiten und Rezeptzuordnungen dieses Tages werden gelöscht."
        confirmLabel="Löschen"
        loading={removeDayMutation.isPending}
      />

      {/* Delete Meal Confirm */}
      <ConfirmDialog
        open={deleteMealId !== null}
        onConfirm={() => {
          if (deleteMealId === null) return;
          removeMealMutation.mutate(deleteMealId, {
            onSuccess: () => {
              toast.success('Mahlzeit gelöscht');
              setDeleteMealId(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteMealId(null)}
        title="Mahlzeit löschen?"
        description="Alle zugeordneten Rezepte werden entfernt."
        confirmLabel="Löschen"
        loading={removeMealMutation.isPending}
      />

      {/* Delete Item Confirm */}
      <ConfirmDialog
        open={deleteItemId !== null}
        onConfirm={() => {
          if (deleteItemId === null) return;
          removeMealItemMutation.mutate(deleteItemId, {
            onSuccess: () => {
              toast.success('Rezept entfernt');
              setDeleteItemId(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteItemId(null)}
        title="Rezept entfernen?"
        description="Das Rezept wird aus der Mahlzeit entfernt."
        confirmLabel="Entfernen"
        loading={removeMealItemMutation.isPending}
      />
    </div>
  );
}

// ==========================================================================
// Settings Panel
// ==========================================================================

function SettingsPanel({
  plan,
  onSave,
  isPending,
}: {
  plan: { name: string; description: string; norm_portions: number; activity_factor: number; reserve_factor: number };
  onSave: (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    activity_factor?: number;
    reserve_factor?: number;
  }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [portions, setPortions] = useState(plan.norm_portions);
  const [activity, setActivity] = useState(plan.activity_factor);
  const [reserve, setReserve] = useState(plan.reserve_factor);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold">Einstellungen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Portionen (Personen)</label>
          <input
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Aktivitätsfaktor (PAL)</label>
          <input
            type="number"
            min={1.0}
            max={3.0}
            step={0.1}
            value={activity}
            onChange={(e) => setActivity(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reservefaktor</label>
          <input
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={reserve}
            onChange={(e) => setReserve(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave({ name, description, norm_portions: portions, activity_factor: activity, reserve_factor: reserve })}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// Day Plan View
// ==========================================================================

function DayPlanView({
  plan,
  canEdit,
  newDayDate,
  setNewDayDate,
  onAddDay,
  addDayPending,
  onDeleteDay,
  onAddMealType,
  onDeleteMeal,
  searchMealId,
  setSearchMealId,
  searchQuery,
  setSearchQuery,
  searchResults,
  onAddRecipe,
  onDeleteItem,
}: {
  plan: { days: MealDay[] };
  canEdit: boolean;
  newDayDate: string;
  setNewDayDate: (v: string) => void;
  onAddDay: () => void;
  addDayPending: boolean;
  onDeleteDay: (id: number) => void;
  onAddMealType: (dayId: number, mealType: string) => void;
  onDeleteMeal: (id: number) => void;
  searchMealId: number | null;
  setSearchMealId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: { id: number; title: string; slug: string }[] | undefined;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onDeleteItem: (id: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

  return (
    <div className="space-y-6">
      {/* Add Day */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={newDayDate}
            onChange={(e) => setNewDayDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={onAddDay}
            disabled={!newDayDate || addDayPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tag hinzufügen
          </button>
        </div>
      )}

      {/* Days */}
      {plan.days.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 block">event</span>
          <p>Noch keine Tage vorhanden. Füge einen Tag hinzu.</p>
        </div>
      ) : (
        plan.days.map((day) => (
          <div key={day.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Day Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <h3 className="font-semibold text-sm sm:text-base">{formatDate(day.date)}</h3>
              {canEdit && (
                <button
                  onClick={() => onDeleteDay(day.id)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Tag löschen"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>

            {/* Meals */}
            <div className="divide-y">
              {day.meals.map((meal) => (
                <MealSlot
                  key={meal.id}
                  meal={meal}
                  canEdit={canEdit}
                  onDeleteMeal={onDeleteMeal}
                  searchMealId={searchMealId}
                  setSearchMealId={setSearchMealId}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  onAddRecipe={onAddRecipe}
                  onDeleteItem={onDeleteItem}
                />
              ))}
            </div>

            {/* Add Meal */}
            {canEdit && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <div className="flex flex-wrap gap-1">
                  {mealTypes
                    .filter((mt) => !day.meals.some((m) => m.meal_type === mt))
                    .map((mt) => (
                      <button
                        key={mt}
                        onClick={() => onAddMealType(day.id, mt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">{MEAL_TYPE_ICONS[mt] || 'add'}</span>
                        {MEAL_TYPE_LABELS[mt] || mt}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ==========================================================================
// Meal Slot
// ==========================================================================

function MealSlot({
  meal,
  canEdit,
  onDeleteMeal,
  searchMealId,
  setSearchMealId,
  searchQuery,
  setSearchQuery,
  searchResults,
  onAddRecipe,
  onDeleteItem,
}: {
  meal: Meal;
  canEdit: boolean;
  onDeleteMeal: (id: number) => void;
  searchMealId: number | null;
  setSearchMealId: (id: number | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: { id: number; title: string; slug: string }[] | undefined;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onDeleteItem: (id: number) => void;
}) {
  const isSearching = searchMealId === meal.id;

  return (
    <div className="px-4 py-3">
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-muted-foreground">
            {MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'}
          </span>
          <span className="font-medium text-sm">
            {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
          </span>
          <span className="text-xs text-muted-foreground">
            ({Math.round(meal.day_part_factor * 100)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={() => {
                  if (isSearching) {
                    setSearchMealId(null);
                    setSearchQuery('');
                  } else {
                    setSearchMealId(meal.id);
                    setSearchQuery('');
                  }
                }}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Rezept hinzufügen"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
              <button
                onClick={() => onDeleteMeal(meal.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Mahlzeit löschen"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meal Items */}
      {meal.items.length === 0 && !isSearching && (
        <p className="text-xs text-muted-foreground italic pl-7">Noch kein Rezept zugeordnet</p>
      )}
      {meal.items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 pl-7 py-1 group">
          {item.recipe_image && (
            <img
              src={item.recipe_image}
              alt={item.recipe_title}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
              loading="lazy"
            />
          )}
          <Link
            to={`/recipes/${item.recipe_slug}`}
            className="text-sm hover:text-primary transition-colors flex-1 truncate"
          >
            {item.recipe_title}
          </Link>
          {item.factor !== 1.0 && (
            <span className="text-xs text-muted-foreground">&times;{item.factor}</span>
          )}
          {canEdit && (
            <button
              onClick={() => onDeleteItem(item.id)}
              className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              title="Entfernen"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      ))}

      {/* Recipe Search */}
      {isSearching && (
        <div className="pl-7 mt-2 space-y-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rezept suchen..."
            autoFocus
            className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchResults && searchResults.length > 0 && (
            <div className="rounded-lg border bg-card max-h-40 overflow-y-auto divide-y">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onAddRecipe(meal.id, r.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground">Keine Rezepte gefunden</p>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Nutrition View
// ==========================================================================

function NutritionView({ mealPlanId }: { mealPlanId: number }) {
  const { data, error, isLoading, refetch } = useNutritionSummary(mealPlanId);

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data) return null;

  const rows = [
    { label: 'Energie', value: `${Math.round(data.energy_kj)} kJ`, icon: 'local_fire_department' },
    { label: 'Protein', value: `${data.protein_g.toFixed(1)} g`, icon: 'fitness_center' },
    { label: 'Fett', value: `${data.fat_g.toFixed(1)} g`, icon: 'water_drop' },
    { label: 'Kohlenhydrate', value: `${data.carbohydrate_g.toFixed(1)} g`, icon: 'grain' },
    { label: 'Zucker', value: `${data.sugar_g.toFixed(1)} g`, icon: 'cake' },
    { label: 'Ballaststoffe', value: `${data.fibre_g.toFixed(1)} g`, icon: 'eco' },
    { label: 'Salz', value: `${data.salt_g.toFixed(1)} g`, icon: 'water_drop' },
  ];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">nutrition</span>
          Nährwert-Zusammenfassung (gesamt)
        </h3>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">{row.icon}</span>
              {row.label}
            </span>
            <span className="text-sm font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
// Shopping View
// ==========================================================================

function ShoppingView({ mealPlanId }: { mealPlanId: number }) {
  const { data, error, isLoading, refetch } = useShoppingList(mealPlanId);

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 block">shopping_cart</span>
        <p>Noch keine Zutaten. Füge Rezepte zu den Mahlzeiten hinzu.</p>
      </div>
    );
  }

  // Group by retail section
  const grouped: Record<string, typeof data> = {};
  for (const item of data) {
    const section = item.retail_section || 'Sonstiges';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(item);
  }

  const totalPrice = data.reduce((sum, item) => sum + (item.estimated_price_eur || 0), 0);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              {section}
            </h3>
          </div>
          <div className="divide-y">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{item.ingredient_name}</span>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{Math.round(item.total_quantity_g)} {item.unit}</span>
                  {item.estimated_price_eur !== null && (
                    <span className="text-foreground font-medium">
                      {item.estimated_price_eur.toFixed(2)} EUR
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Total */}
      {totalPrice > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Geschätzter Gesamtpreis</span>
          <span className="font-bold text-lg">{totalPrice.toFixed(2)} EUR</span>
        </div>
      )}
    </div>
  );
}
