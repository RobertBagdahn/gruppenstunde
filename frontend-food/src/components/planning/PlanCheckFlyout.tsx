import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { usePlanCheck } from '@/api/mealPlans';
import type { PlanCheckAlert } from '@/schemas/mealPlan';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PlanCheckFlyoutProps {
  mealPlanId: number;
  onOpenOmnibar?: (mealId?: number) => void;
  onNavigateToCosts?: () => void;
  onScrollToMeal?: (mealId: number) => void;
}

export function PlanCheckFlyout({
  mealPlanId,
  onOpenOmnibar,
  onNavigateToCosts,
  onScrollToMeal,
}: PlanCheckFlyoutProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = usePlanCheck(mealPlanId);

  const totalIssues = data?.total_issues || 0;
  const alerts = data?.alerts || [];

  const handleAction = (alert: PlanCheckAlert) => {
    setOpen(false);
    if (alert.action_type === 'suggest_recipe') {
      if (alert.meal_id && onScrollToMeal) {
        onScrollToMeal(alert.meal_id);
      }
      if (alert.meal_id && onOpenOmnibar) {
        onOpenOmnibar(alert.meal_id);
      }
    } else if (alert.action_type === 'open_slot') {
      if (alert.meal_id && onScrollToMeal) {
        onScrollToMeal(alert.meal_id);
      }
    } else if (alert.action_type === 'open_budget') {
      onNavigateToCosts?.();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Plan-Check öffnen"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-soft',
          totalIssues > 0
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
        )}
      >
        {totalIssues > 0 ? (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Plan-Check ({totalIssues})</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Plan-Check (0)</span>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden shadow-lg border-border">
          <DialogHeader className="p-4 border-b border-border bg-muted/30">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Plan-Check ({totalIssues})</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
            {isLoading && <p className="text-xs text-muted-foreground py-4 text-center">Analysiere Essensplan...</p>}

            {!isLoading && alerts.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">Alles bestens!</p>
                <p>Keine Lücken, Budgetüberschreitungen oder Konflikte gefunden.</p>
              </div>
            )}

            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'p-3 rounded-xl border text-xs space-y-2 transition-colors',
                  alert.severity === 'error'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {alert.severity === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground text-sm leading-tight">{alert.title}</div>
                    <div className="text-muted-foreground text-xs mt-1 leading-normal">
                      {alert.description}
                    </div>
                  </div>
                </div>

                {alert.action_label && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAction(alert)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                    >
                      <span>{alert.action_label}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
