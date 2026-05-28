import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useMealPlan,
  useDeleteMealPlan,
  useAddDay,
  useRemoveDay,
  useAddMealItem,
  useRemoveMealItem,
  useRecipeSearch,
} from '@/api/mealPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { Meal, MealItem as MealItemType } from '@/schemas/mealPlan';
import CollaboratorSection from '@/components/meal-plan/CollaboratorSection';

// Group meals by date
function groupMealsByDay(meals: Meal[]): Map<string, Meal[]> {
  const map = new Map<string, Meal[]>();
  for (const meal of meals) {
    const date = meal.start_datetime.slice(0, 10);
    const existing = map.get(date) || [];
    existing.push(meal);
    map.set(date, existing);
  }
  return map;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function MealItemCard({
  item,
  canEdit,
  onRemove,
}: {
  item: MealItemType;
  canEdit: boolean;
  onRemove: () => void;
}) {
  const name = item.display_name || item.recipe_title || item.ingredient_name || '?';
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/40 transition text-sm">
      <span className="truncate">{name}</span>
      {canEdit && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition p-0.5"
          title="Entfernen"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
}

function MealCard({
  meal,
  canEdit,
  mealPlanId,
}: {
  meal: Meal;
  canEdit: boolean;
  mealPlanId: number;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const addItem = useAddMealItem(mealPlanId);
  const removeItem = useRemoveMealItem(mealPlanId);
  const { data: searchResults } = useRecipeSearch({ q: searchQuery, limit: 5 });

  return (
    <div className="border rounded-lg p-3 bg-card">
      <h4 className="text-sm font-semibold text-muted-foreground mb-2">
        {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
        {meal.override_portions && (
          <span className="ml-2 text-xs font-normal">({meal.override_portions} Portionen)</span>
        )}
      </h4>

      {meal.items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Keine Rezepte zugewiesen</p>
      )}

      <div className="space-y-0.5">
        {meal.items.map((item) => (
          <MealItemCard
            key={item.id}
            item={item}
            canEdit={canEdit}
            onRemove={() =>
              removeItem.mutate(item.id, {
                onError: () => toast.error('Fehler beim Entfernen'),
              })
            }
          />
        ))}
      </div>

      {canEdit && !showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Rezept hinzufügen
        </button>
      )}

      {canEdit && showSearch && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder="Rezept suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          {searchResults && searchResults.length > 0 && (
            <div className="border rounded bg-background max-h-40 overflow-y-auto">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition"
                  onClick={() => {
                    addItem.mutate(
                      { mealId: meal.id, recipe_id: r.id },
                      {
                        onSuccess: () => {
                          setShowSearch(false);
                          setSearchQuery('');
                        },
                        onError: () => toast.error('Fehler beim Hinzufügen'),
                      },
                    );
                  }}
                >
                  {r.title}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Abbrechen
          </button>
        </div>
      )}
    </div>
  );
}

function DaySection({
  date,
  meals,
  canEdit,
  mealPlanId,
  onRemoveDay,
}: {
  date: string;
  meals: Meal[];
  canEdit: boolean;
  mealPlanId: number;
  onRemoveDay: () => void;
}) {
  const sorted = [...meals].sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">{formatDate(date)}</h3>
        {canEdit && (
          <button
            onClick={onRemoveDay}
            className="text-xs text-muted-foreground hover:text-destructive transition flex items-center gap-0.5"
            title="Tag entfernen"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((meal) => (
          <MealCard key={meal.id} meal={meal} canEdit={canEdit} mealPlanId={mealPlanId} />
        ))}
      </div>
    </div>
  );
}

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id);
  const navigate = useNavigate();
  const { data: plan, isLoading, error } = useMealPlan(mealPlanId);
  const deleteMutation = useDeleteMealPlan();
  const addDay = useAddDay(mealPlanId);
  const removeDay = useRemoveDay(mealPlanId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState('');
  const [dayToRemove, setDayToRemove] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
          <div className="h-4 w-96 bg-muted/30 rounded animate-pulse" />
          <div className="h-48 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container py-10 text-center">
        <p className="text-destructive">Essensplan nicht gefunden.</p>
        <button
          onClick={() => navigate('/meal-plans/app')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Zurück zur Liste
        </button>
      </div>
    );
  }

  const canEdit = plan.can_edit;
  const dayMap = groupMealsByDay(plan.meals);
  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  const handleDelete = () => {
    deleteMutation.mutate(mealPlanId, {
      onSuccess: () => {
        toast.success('Essensplan gelöscht');
        navigate('/meal-plans/app');
      },
      onError: () => toast.error('Fehler beim Löschen'),
    });
  };

  const handleAddDay = () => {
    if (!newDayDate) return;
    addDay.mutate(
      { date: newDayDate },
      {
        onSuccess: () => {
          setShowAddDay(false);
          setNewDayDate('');
        },
        onError: () => toast.error('Fehler beim Hinzufügen des Tages'),
      },
    );
  };

  const handleRemoveDay = () => {
    if (!dayToRemove) return;
    removeDay.mutate(dayToRemove, {
      onSuccess: () => setDayToRemove(null),
      onError: () => toast.error('Fehler beim Entfernen des Tages'),
    });
  };

  return (
    <div className="container py-6 md:py-10 space-y-6 max-w-4xl">
      {/* Back + Header */}
      <button
        onClick={() => navigate('/meal-plans/app')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Zurück
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          {plan.description && (
            <p className="text-muted-foreground mt-1">{plan.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span>{plan.norm_portions} Portionen</span>
            {plan.event_name && <span>Event: {plan.event_name}</span>}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-muted-foreground hover:text-destructive transition rounded"
            title="Essensplan löschen"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      </div>

      {/* Day sections */}
      <div className="space-y-6">
        {sortedDays.map(([date, meals]) => (
          <DaySection
            key={date}
            date={date}
            meals={meals}
            canEdit={canEdit}
            mealPlanId={mealPlanId}
            onRemoveDay={() => setDayToRemove(date)}
          />
        ))}

        {sortedDays.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Noch keine Tage im Plan. Füge einen Tag hinzu, um zu starten.
          </p>
        )}
      </div>

      {/* Add Day */}
      {canEdit && (
        <div>
          {!showAddDay ? (
            <button
              onClick={() => setShowAddDay(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Tag hinzufügen
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleAddDay}
                disabled={!newDayDate || addDay.isPending}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
              >
                Hinzufügen
              </button>
              <button
                onClick={() => setShowAddDay(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:underline"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collaborators */}
      <CollaboratorSection mealPlanId={mealPlanId} canManage={canEdit} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Essensplan löschen?"
        description="Der Essensplan und alle zugehörigen Mahlzeiten werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Remove Day Confirm */}
      <ConfirmDialog
        open={dayToRemove !== null}
        onCancel={() => setDayToRemove(null)}
        title="Tag entfernen?"
        description="Alle Mahlzeiten dieses Tages werden gelöscht."
        confirmLabel="Entfernen"
        onConfirm={handleRemoveDay}
        variant="destructive"
      />
    </div>
  );
}
