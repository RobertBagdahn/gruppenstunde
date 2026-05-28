import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMealPlans, useDeleteMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import ListPageHero from '@/components/shared/ListPageHero';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState } from 'react';
import type { MealPlan } from '@/schemas/mealPlan';

function MealPlanCard({
  plan,
  onDelete,
}: {
  plan: MealPlan;
  onDelete: (id: number) => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="border rounded-lg p-4 bg-card hover:shadow-md transition cursor-pointer"
      onClick={() => navigate(`/meal-plans/${plan.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {plan.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">restaurant_menu</span>
              {plan.meals_count} Mahlzeiten
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">group</span>
              {plan.norm_portions} Portionen
            </span>
            {plan.event_name && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">event</span>
                {plan.event_name}
              </span>
            )}
            <span>
              {new Date(plan.created_at).toLocaleDateString('de-DE')}
            </span>
          </div>
        </div>
        <button
          className="p-1.5 text-muted-foreground hover:text-destructive transition rounded"
          title="Löschen"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plan.id);
          }}
        >
          <span className="material-symbols-outlined text-lg">delete</span>
        </button>
      </div>
    </div>
  );
}

export default function MealPlansPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: plans, isLoading, error } = useMealPlans();
  const deleteMutation = useDeleteMealPlan();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  if (!user) {
    return (
      <div className="container py-10">
        <p className="text-muted-foreground">Bitte anmelden, um Essenspläne zu sehen.</p>
      </div>
    );
  }

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Essensplan gelöscht');
        setDeleteId(null);
      },
      onError: () => toast.error('Fehler beim Löschen'),
    });
  };

  return (
    <div className="container py-6 md:py-10 space-y-6">
      <ListPageHero
        title="Essenspläne"
        description="Plane Mahlzeiten für Lager, Fahrten und Gruppenstunden."
        icon="restaurant_menu"
        gradientClasses="from-orange-500 to-amber-500"
      />

      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:opacity-90 transition"
          onClick={() => navigate('/meal-plans/new')}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Neuer Essensplan
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse bg-muted/30 h-24" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-destructive text-center py-10">
          Fehler beim Laden der Essenspläne.
        </div>
      )}

      {plans && plans.length === 0 && (
        <EmptyState
          icon="restaurant_menu"
          title="Noch keine Essenspläne"
          description="Erstelle deinen ersten Essensplan für dein nächstes Lager oder deine nächste Fahrt."
          ctaLabel="Essensplan erstellen"
          onCtaClick={() => navigate('/meal-plans/new')}
        />
      )}

      {plans && plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((plan) => (
            <MealPlanCard key={plan.id} plan={plan} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        title="Essensplan löschen?"
        description="Der Essensplan und alle zugehörigen Mahlzeiten werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
