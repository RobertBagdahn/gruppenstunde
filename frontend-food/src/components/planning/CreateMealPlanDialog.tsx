import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCreateMealPlan } from '@/api/mealPlans';
import { toast } from 'sonner';

interface CreateMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (planId: number) => void;
}

function getNextWeekendDates() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 5 is Friday
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { friday: fmt(friday), sunday: fmt(sunday) };
}

export function CreateMealPlanDialog({ open, onOpenChange, onSuccess }: CreateMealPlanDialogProps) {
  const navigate = useNavigate();
  const createMutation = useCreateMealPlan();

  const weekend = useMemo(() => getNextWeekendDates(), []);
  const [name, setName] = useState('Neuer Essensplan');
  const [startDate, setStartDate] = useState(weekend.friday);
  const [endDate, setEndDate] = useState(weekend.sunday);
  const [portions, setPortions] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const startDatetime = `${startDate}T08:00:00`;
    const endDatetime = `${endDate}T20:00:00`;

    createMutation.mutate(
      {
        name: name.trim(),
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        norm_portions: portions,
        reserve_factor: 1.1,
      },
      {
        onSuccess: (plan) => {
          toast.success('Essensplan erstellt', {
            description: 'Tage und Standard-Mahlzeiten wurden vorbereitet.',
          });
          onOpenChange(false);
          if (onSuccess) {
            onSuccess(plan.id);
          } else {
            navigate(`/meal-plans/${plan.id}/plan`);
          }
        },
        onError: (err) => {
          toast.error('Fehler beim Erstellen', { description: err.message });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden shadow-2xl border-border">
        <DialogHeader className="p-5 border-b border-border bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-lg font-display font-bold text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Neuen Essensplan erstellen</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Gib einfach die 3 wichtigsten Eckdaten ein. Alle Details und Zeiten kannst du im Plan anpassen.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="plan-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Name des Essensplans *
            </label>
            <input
              id="plan-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Sommerlager 2026 oder Pfingstwochenende"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-soft"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-start" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Startdatum *
              </label>
              <div className="relative">
                <input
                  id="plan-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-soft"
                />
              </div>
            </div>

            <div>
              <label htmlFor="plan-end" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Enddatum *
              </label>
              <div className="relative">
                <input
                  id="plan-end"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-soft"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="plan-portions" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Personenanzahl (Portionen) *
            </label>
            <div className="relative flex items-center">
              <input
                id="plan-portions"
                type="number"
                min={1}
                max={500}
                required
                value={portions}
                onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-soft"
              />
              <span className="absolute right-3.5 text-xs text-muted-foreground font-semibold pointer-events-none">
                Personen
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Standard-Tageseinteilung (Frühstück, Mittag, Abendessen) und 10% Einkaufsreserve werden automatisch hinterlegt.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{createMutation.isPending ? 'Erstelle...' : 'Plan erstellen'}</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
