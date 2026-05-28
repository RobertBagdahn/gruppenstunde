import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateMealPlan } from '@/api/mealPlans';

export default function CreateMealPlanPage() {
  const navigate = useNavigate();
  const createMutation = useCreateMealPlan();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [normPortions, setNormPortions] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [numDays, setNumDays] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Bitte einen Namen eingeben');
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        description,
        norm_portions: normPortions,
        start_date: startDate || null,
        num_days: numDays,
      },
      {
        onSuccess: (plan) => {
          toast.success('Essensplan erstellt');
          navigate(`/meal-plans/${plan.id}`);
        },
        onError: () => toast.error('Fehler beim Erstellen'),
      },
    );
  };

  return (
    <div className="container py-6 md:py-10 max-w-2xl">
      <button
        onClick={() => navigate('/meal-plans/app')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Zurück
      </button>

      <h1 className="text-2xl font-bold mb-6">Neuer Essensplan</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Sommerlager 2026"
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung..."
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Portionen</label>
            <input
              type="number"
              min={1}
              max={500}
              value={normPortions}
              onChange={(e) => setNormPortions(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Anzahl Tage</label>
            <input
              type="number"
              min={1}
              max={30}
              value={numDays}
              onChange={(e) => setNumDays(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/meal-plans/app')}
            className="px-5 py-2.5 border rounded-full text-sm font-medium hover:bg-muted/50 transition"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
