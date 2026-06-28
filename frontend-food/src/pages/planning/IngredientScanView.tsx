import { useState } from 'react';
import { useIngredientScan } from '@/api/mealPlans';
import { ShieldCheck, ShieldAlert, AlertTriangle, Settings, ChevronDown, ChevronUp, Link as LinkIcon } from 'lucide-react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { EntityLink } from '@/components/shared/EntityLink';
import { type NutritionalTag, type NutritionalTagViolation } from '@/schemas/mealPlan';

interface IngredientScanViewProps {
  mealPlanId: number;
  canEdit: boolean;
  onOpenSettings?: () => void;
  nutritionalTagsCount: number;
}

export default function IngredientScanView({
  mealPlanId,
  canEdit,
  onOpenSettings,
  nutritionalTagsCount,
}: IngredientScanViewProps) {
  const { data, error, isLoading, refetch } = useIngredientScan(mealPlanId);
  const [collapsedTags, setCollapsedTags] = useState<Record<number, boolean>>({});

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data) return null;

  const { summary, violations } = data;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '.';
    } catch {
      return dateStr;
    }
  };

  // Scenario 1: No tags configured on this plan
  if (nutritionalTagsCount === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4 shadow-soft">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Settings className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-foreground">Keine Ernährungstags konfiguriert</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Konfiguriere in den Einstellungen die Ernährungseinschränkungen deiner Gruppenmitglieder, um diesen Essensplan automatisch scannen und überwachen zu lassen.
          </p>
        </div>
        {canEdit && onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-soft"
          >
            <Settings className="w-4 h-4" />
            Einstellungen öffnen
          </button>
        )}
      </div>
    );
  }

  // Scenario 2: Configured, but no violations found!
  if (violations.length === 0) {
    return (
      <div className="rounded-xl border border-primary/20 bg-emerald-500/5 p-6 text-center space-y-3 shadow-soft">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-emerald-800">Zutaten-Radar: Keine Verstöße!</h3>
          <p className="text-sm text-emerald-700/80 max-w-md mx-auto">
            Keine Verstöße gefunden ✓. Alle Rezepte und Zutaten in deinem Essensplan passen zu den {nutritionalTagsCount} konfigurierten Einschränkungen.
          </p>
        </div>
      </div>
    );
  }

  // Group violations by nutritional tag id
  const groupedViolations = violations.reduce<Record<number, { tag: NutritionalTag; list: NutritionalTagViolation[] }>>(
    (acc, v) => {
      const tagId = v.nutritional_tag.id;
      if (!acc[tagId]) {
        acc[tagId] = { tag: v.nutritional_tag, list: [] };
      }
      acc[tagId].list.push(v);
      return acc;
    },
    {}
  );

  const toggleTagCollapse = (tagId: number) => {
    setCollapsedTags((prev) => ({
      ...prev,
      [tagId]: !prev[tagId],
    }));
  };

  // Scenario 3: Violations found
  return (
    <div className="space-y-5 font-sans">
      {/* Alert Banner */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 shadow-soft">
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-display font-bold text-sm text-destructive">
            Ernährungswarnungen ({summary.total_violations})
          </h4>
          <p className="text-xs text-destructive/80 font-medium">
            Es wurden {summary.total_violations} potentielle Verstöße bei insgesamt{' '}
            {summary.unique_tags} Tags gefunden. Bitte überprüfe die betroffenen Mahlzeiten.
          </p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-foreground pl-1">Gefundene Konflikte</h3>

        <div className="space-y-3">
          {Object.entries(groupedViolations).map(([tagIdStr, group]) => {
            const tagId = Number(tagIdStr);
            const isCollapsed = collapsedTags[tagId] || false;
            const violationCount = group.list.length;

            return (
              <div
                key={tagId}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-soft"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleTagCollapse(tagId)}
                  className="w-full flex items-center justify-between p-4 bg-muted/25 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                      {group.tag.name}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      ({violationCount} {violationCount === 1 ? 'Verstoß' : 'Verstöße'})
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {/* Accordion Content */}
                {!isCollapsed && (
                  <div className="border-t border-border divide-y divide-border">
                    {group.list.map((violation, idx) => {
                      const mealName = MEAL_TYPE_LABELS[violation.meal_type] || violation.meal_type;
                      return (
                        <div
                          key={idx}
                          className="p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {formatDate(violation.date)} {mealName}
                              </p>
                              <p className="font-display font-bold text-sm text-foreground">
                                {violation.recipe_title}
                              </p>
                            </div>
                          </div>

                          <EntityLink
                            type="recipe"
                            slug={violation.recipe_slug}
                            variant="chip"
                            className="shrink-0 gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Rezept öffnen
                          </EntityLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
