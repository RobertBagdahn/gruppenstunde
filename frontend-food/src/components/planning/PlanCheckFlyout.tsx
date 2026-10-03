import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Info, Sparkles } from 'lucide-react';
import { usePlanCheck } from '@/api/mealPlans';
import type { PlanCheckAlert } from '@/schemas/mealPlan';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PlanCheckFlyoutProps {
  mealPlanId: number;
  /** Viewers see all alerts but no action buttons. */
  canEdit?: boolean;
  onOpenOmnibar?: (mealId?: number) => void;
  onNavigateToCosts?: () => void;
  onScrollToMeal?: (mealId: number) => void;
  /** Create meals for an empty day (`empty_day`). */
  onCreateDayMeals?: (date: string) => void;
  /** Open the plan settings, e.g. to adjust the plan period (`meal_outside_range`). */
  onOpenSettings?: () => void;
  /** Open the reference meal editor for a meal type (`open_ref_meal`). */
  onOpenRefMeal?: (mealType: string) => void;
}

const SEVERITY_ORDER: Record<PlanCheckAlert['severity'], number> = { error: 0, warning: 1, info: 2 };

/** Alerts sorted by severity: errors, then warnings, then hints (stable within a severity). */
export function sortPlanCheckAlerts(alerts: PlanCheckAlert[]): PlanCheckAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Alert types whose primary action opens the recipe search for the meal (swap/suggest). */
const OMNIBAR_ALERT_TYPES = new Set<PlanCheckAlert['type']>(['empty_slot', 'recipe_type_mismatch']);

const SEVERITY_STYLES: Record<PlanCheckAlert['severity'], { box: string; icon: typeof AlertCircle; iconClass: string }> = {
  error: { box: 'border-danger-border bg-danger-soft', icon: AlertCircle, iconClass: 'text-danger' },
  warning: { box: 'border-warning-border bg-warning-soft', icon: AlertTriangle, iconClass: 'text-warning' },
  info: { box: 'border-border bg-muted/30', icon: Info, iconClass: 'text-muted-foreground' },
};

const SECTION_LABELS: Record<PlanCheckAlert['severity'], string> = {
  error: 'Fehler',
  warning: 'Warnungen',
  info: 'Hinweise',
};

export function PlanCheckFlyout({
  mealPlanId,
  canEdit = true,
  onOpenOmnibar,
  onNavigateToCosts,
  onScrollToMeal,
  onCreateDayMeals,
  onOpenSettings,
  onOpenRefMeal,
}: PlanCheckFlyoutProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = usePlanCheck(mealPlanId);

  const totalIssues = data?.total_issues || 0;
  const alerts = sortPlanCheckAlerts(data?.alerts || []);
  const severities = (['error', 'warning', 'info'] as const).filter((s) => alerts.some((a) => a.severity === s));

  const handleAction = (alert: PlanCheckAlert) => {
    setOpen(false);
    switch (alert.action_type) {
      case 'suggest_recipe':
      case 'open_slot':
        if (alert.meal_id) {
          onScrollToMeal?.(alert.meal_id);
          if (OMNIBAR_ALERT_TYPES.has(alert.type)) onOpenOmnibar?.(alert.meal_id);
        }
        break;
      case 'open_budget':
        onNavigateToCosts?.();
        break;
      case 'open_day':
        if (alert.date) onCreateDayMeals?.(alert.date);
        break;
      case 'open_ref_meal':
        if (alert.meal_type) onOpenRefMeal?.(alert.meal_type);
        break;
    }
  };

  const handleOpenSettings = () => {
    setOpen(false);
    onOpenSettings?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Plan-Check öffnen"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-caption font-bold whitespace-nowrap transition-all shadow-soft',
          totalIssues > 0
            ? 'border-warning-border bg-warning-soft text-warning hover:bg-warning-soft'
            : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
        )}
      >
        {totalIssues > 0 ? (
          <>
            <AlertTriangle className="w-4 h-4 text-warning animate-pulse" />
            <span>Plan-Check ({totalIssues})</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-success" />
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

          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {isLoading && <p className="text-caption text-muted-foreground py-4 text-center">Analysiere Essensplan …</p>}

            {!isLoading && alerts.length === 0 && (
              <div className="py-8 text-center text-caption text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="font-semibold text-body text-foreground">Alles bestens!</p>
                <p>Keine Lücken, Budgetüberschreitungen oder Konflikte gefunden.</p>
              </div>
            )}

            {severities.map((severity) => (
              <section key={severity} className="space-y-2" aria-label={SECTION_LABELS[severity]}>
                <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                  {SECTION_LABELS[severity]}
                </h3>
                {alerts
                  .filter((alert) => alert.severity === severity)
                  .map((alert) => {
                    const style = SEVERITY_STYLES[alert.severity];
                    const Icon = style.icon;
                    const showPrimary = canEdit && !!alert.action_label;
                    const showSettings = canEdit && alert.type === 'meal_outside_range' && !!onOpenSettings;
                    return (
                      <div
                        key={alert.id}
                        data-testid="plan-check-alert"
                        className={cn('p-3 rounded-xl border text-caption space-y-2 transition-colors', style.box)}
                      >
                        <div className="flex items-start gap-2.5">
                          <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', style.iconClass)} />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-foreground text-body leading-tight">{alert.title}</div>
                            <div className="text-muted-foreground text-caption mt-1 leading-normal">
                              {alert.description}
                            </div>
                          </div>
                        </div>

                        {(showPrimary || showSettings) && (
                          <div className="pt-1 flex flex-wrap justify-end gap-2">
                            {showSettings && (
                              <button
                                type="button"
                                onClick={handleOpenSettings}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-caption font-semibold border border-border bg-card hover:bg-muted/50 transition-all"
                              >
                                Zeitraum anpassen
                              </button>
                            )}
                            {showPrimary && (
                              <button
                                type="button"
                                onClick={() => handleAction(alert)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                              >
                                <span>{alert.action_label}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
