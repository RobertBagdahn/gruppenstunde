import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Sparkles, Copy } from 'lucide-react';
import type { MealPlan } from '@/schemas/mealPlan';
import { getPlanBadge, formatDateRange } from '@/schemas/mealPlan';
import { formatNumber } from '@/lib/format';
import { sourceBadgeHelp } from '@/lib/sourceBadgeHelp';

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  verified: {
    label: 'Inspi-verifiziert',
    bg: 'bg-primary/10 border border-primary/20',
    text: 'text-primary',
  },
  community: {
    label: 'Community',
    bg: 'bg-info-soft border border-info-border',
    text: 'text-info',
  },
  personal: {
    label: 'Mein Plan',
    bg: 'bg-warning-soft border border-warning-border',
    text: 'text-warning',
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
  const borderColor = isReference ? 'border-l-info' : 'border-l-primary';

  return (
    <div
      onClick={() => navigate(`/meal-plans/${plan.id}`)}
      className={`group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all cursor-pointer border-l-4 ${borderColor}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          {/* The name wins over the badge: up to two lines, the badge sits on its own row. */}
          <h3
            title={plan.name}
            className="font-display font-bold text-body text-foreground line-clamp-2 break-words group-hover:text-primary transition-colors"
          >
            {plan.name}
          </h3>
          {badgeConfig && (
            <span title={badge ? sourceBadgeHelp(badge) : undefined} className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-caption font-bold ${badgeConfig.bg} ${badgeConfig.text}`}>
              {badgeConfig.label}
            </span>
          )}
        </div>
      </div>

      {/* Date range */}
      {dateRange && (
        <p className="text-caption text-muted-foreground font-medium mb-1.5 ml-5">
          {dateRange}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 text-caption font-semibold text-muted-foreground ml-5 mb-2">
        {plan.meals_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="w-3 h-3" />
          {formatNumber(plan.norm_portions, { maxDecimals: 1 })} Portionen
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
          className="ml-5 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-caption font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Copy className="w-3 h-3" />
          Als Vorlage
        </button>
      )}
    </div>
  );
}
