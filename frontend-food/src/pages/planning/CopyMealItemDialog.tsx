import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';

interface CopyMealItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetMealId: number) => void;
  meals: Meal[];
  isPending: boolean;
}

/** Group a flat list of meals by date (from start_datetime), preserving sort order. */
function groupMealsByDate(meals: Meal[]): { date: string; meals: Meal[] }[] {
  const groups: Record<string, Meal[]> = {};
  for (const meal of meals) {
    if (!meal.start_datetime) continue; // Skip reference/template meals
    if (meal.is_synced) continue; // Skip synced meals as destination
    
    const date = meal.start_datetime.slice(0, 10); // "YYYY-MM-DD"
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meal);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, meals]) => ({ date, meals }));
}

export function CopyMealItemDialog({ open, onOpenChange, onConfirm, meals, isPending }: CopyMealItemDialogProps) {
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);

  const groups = useMemo(() => {
    return groupMealsByDate(meals);
  }, [meals]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleConfirm = () => {
    if (selectedMealId) {
      onConfirm(selectedMealId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Eintrag kopieren</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle eine Ziel-Mahlzeit aus, in die dieser Eintrag kopiert werden soll:
          </p>
          
          <div className="space-y-4">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Keine geeigneten Ziel-Mahlzeiten vorhanden.</p>
            ) : (
              groups.map((group) => (
                <div key={group.date} className="space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatDate(group.date)}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.meals.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMealId(m.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between",
                          selectedMealId === m.id
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <span>{MEAL_TYPE_LABELS[m.meal_type] || m.meal_type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedMealId || isPending}
          >
            {isPending ? 'Kopieren...' : 'Kopieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
