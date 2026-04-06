import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function MealPlanListPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: mealPlans, error, isLoading, refetch } = useMealPlans();
  const createMutation = useCreateMealPlan();
  const deleteMutation = useDeleteMealPlan();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createNumDays, setCreateNumDays] = useState(3);
  const [createPortions, setCreatePortions] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 block">login</span>
        <p>Bitte melde dich an, um Essenspläne zu verwalten.</p>
      </div>
    );
  }

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const handleCreate = () => {
    if (!createName.trim()) return;
    createMutation.mutate(
      {
        name: createName.trim(),
        start_date: createStartDate || null,
        num_days: createNumDays,
        norm_portions: createPortions,
      },
      {
        onSuccess: (plan) => {
          toast.success('Essensplan erstellt');
          setShowCreate(false);
          setCreateName('');
          setCreateStartDate('');
          setCreateNumDays(3);
          setCreatePortions(10);
          navigate(`/meal-plans/${plan.id}`);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Essensplan gelöscht');
        setDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-2xl text-primary">restaurant_menu</span>
          <h2 className="text-lg font-semibold">Essenspläne</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Neuer Essensplan
        </button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold">Neuen Essensplan erstellen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="z.B. Sommerlager 2026"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Startdatum</label>
              <input
                type="date"
                value={createStartDate}
                onChange={(e) => setCreateStartDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anzahl Tage</label>
              <input
                type="number"
                min={1}
                max={30}
                value={createNumDays}
                onChange={(e) => setCreateNumDays(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Portionen (Personen)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={createPortions}
                onChange={(e) => setCreatePortions(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!createName.trim() || createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </div>
      )}

      {/* Meal Plan List */}
      {mealPlans && mealPlans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <span className="material-symbols-outlined text-5xl mb-3 block">restaurant_menu</span>
          <p className="text-lg font-medium mb-1">Noch keine Essenspläne</p>
          <p className="text-sm">Erstelle deinen ersten Essensplan für eine Fahrt oder den Gruppenalltag.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {mealPlans?.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/meal-plans/${plan.id}`)}
              className="rounded-xl border bg-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{plan.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      {plan.days_count} {plan.days_count === 1 ? 'Tag' : 'Tage'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      {plan.norm_portions} Portionen
                    </span>
                    {plan.event_name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">celebration</span>
                        {plan.event_name}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{plan.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(plan.id);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Löschen"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Essensplan löschen?"
        description="Der Essensplan und alle zugehörigen Tage, Mahlzeiten und Rezeptzuordnungen werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
