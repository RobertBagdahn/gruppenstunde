import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Sparkles, Copy } from 'lucide-react';
import type { MealPlan } from '@/schemas/mealPlan';
import { getPlanBadge, formatDateRange } from '@/schemas/mealPlan';

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  verified: {
    label: 'Inspi-verifiziert',
    bg: 'bg-primary/10 border border-primary/20',
    text: 'text-primary',
  },
  community: {
    label: 'Community',
    bg: 'bg-[hsl(var(--chart-3))]/10 border border-[hsl(var(--chart-3))]/20',
    text: 'text-[hsl(var(--chart-3))]',
  },
  personal: {
    label: 'Mein Plan',
    bg: 'bg-[hsl(var(--chart-2))]/10 border border-[hsl(var(--chart-2))]/20',
    text: 'text-[hsl(var(--chart-2))]',
  },
};

interface MealPlanCompactCardProps {
  plan: MealPlan;
  userId: number | undefined;
  showProgress?: boolean; // kept for future use
  isReference?: boolean;
  onUseAsTemplate?: (plan: MealPlan) => void;
}

export default function MealPlanCompactCard({
  plan,
  userId,
  showProgress: _showProgress = false,
  isReference = false,
  onUseAsTemplate,
}: MealPlanCompactCardProps) {
  const navigate = useNavigate();
  const badge = getPlanBadge(plan, userId);
  const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
  const dateRange = formatDateRange(plan.start_datetime, plan.end_datetime);
  const borderColor = isReference ? 'border-l-[hsl(var(--chart-3))]' : 'border-l-primary';

  return (
    <div
      onClick={() => navigate(`/meal-plans/${plan.id}`)}
      className={`group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all cursor-pointer border-l-4 ${borderColor}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {plan.name}
            </h3>
            {badgeConfig && (
              <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${badgeConfig.bg} ${badgeConfig.text}`}>
                {badgeConfig.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Date range */}
      {dateRange && (
        <p className="text-[11px] text-muted-foreground font-medium mb-1.5 ml-5">
          {dateRange}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground ml-5 mb-2">
        {plan.meals_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" />
          {plan.norm_portions} Portionen
        </span>
        {plan.event_name && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {plan.event_name}
          </span>
        )}
      </div>

      {/* Reference action */}
      {isReference && onUseAsTemplate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUseAsTemplate(plan);
          }}
          className="ml-5 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Copy className="w-3 h-3" />
          Als Vorlage
        </button>
      )}
    </div>
  );
}
