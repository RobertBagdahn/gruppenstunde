import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Sparkles,
  MoreVertical,
  Copy,
  Trash2,
  ShoppingCart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MealPlan } from '@/schemas/mealPlan';
import { getPlanBadge, formatDateRange, getDaysCount } from '@/schemas/mealPlan';

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

interface MealPlanHeroCardProps {
  plan: MealPlan;
  userId: number | undefined;
  onDelete: (id: number) => void;
  onUseAsTemplate: (plan: MealPlan) => void;
}

export default function MealPlanHeroCard({ plan, userId, onDelete, onUseAsTemplate }: MealPlanHeroCardProps) {
  const navigate = useNavigate();
  const badge = getPlanBadge(plan, userId);
  const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
  const dateRange = formatDateRange(plan.start_datetime, plan.end_datetime);
  const daysCount = getDaysCount(plan.start_datetime, plan.end_datetime);
  const totalMeals = plan.meals_count;
  const reservePercent = plan.reserve_factor > 0 ? Math.round((plan.reserve_factor - 1) * 100) : 0;

  return (
    <div
      onClick={() => navigate(`/meal-plans/${plan.id}`)}
      className="group rounded-xl border border-border bg-card p-5 md:p-6 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all cursor-pointer border-l-4 border-l-primary"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          {badgeConfig && (
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeConfig.bg} ${badgeConfig.text}`}>
              {badgeConfig.label}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border shadow-soft">
            <DropdownMenuItem
              className="font-semibold text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onUseAsTemplate(plan);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Als Vorlage verwenden
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(plan.id);
              }}
              className="text-destructive focus:text-destructive font-semibold text-xs"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Name */}
      <h3 className="font-display font-bold text-lg md:text-xl text-foreground truncate group-hover:text-primary transition-colors mb-1">
        {plan.name}
      </h3>

      {/* Event link */}
      {plan.event_name && (
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Verknüpft mit:{' '}
          <span className="inline-flex items-center gap-1 text-primary font-semibold">
            <Sparkles className="w-3 h-3" />
            {plan.event_name}
          </span>
        </p>
      )}

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {dateRange && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {dateRange}
          </span>
        )}
        {daysCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {daysCount} {daysCount === 1 ? 'Tag' : 'Tage'}
          </span>
        )}
      </div>

      {/* Meal count */}
      {totalMeals > 0 && (
        <div className="mb-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {totalMeals} {totalMeals === 1 ? 'Mahlzeit' : 'Mahlzeiten'} geplant
          </span>
        </div>
      )}

      {/* Info row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground mb-3">
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {plan.norm_portions.toFixed(1)} Portionen
          {reservePercent > 0 && (
            <span className="text-[10px] text-muted-foreground/70">(+{reservePercent}% Reserve)</span>
          )}
        </span>
        {plan.budget_per_person_per_day != null && (
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">euro</span>
            {Number(plan.budget_per_person_per_day).toFixed(2).replace('.', ',')} €/Person/Tag
          </span>
        )}
      </div>

      {/* Nutritional tags */}
      {plan.nutritional_tag_names.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {plan.nutritional_tag_names.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/5 border border-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/meal-plans/${plan.id}`);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Öffnen
        </button>
        {plan.budget_per_person_per_day != null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ShoppingCart className="w-3.5 h-3.5" />
            Budget {Number(plan.budget_per_person_per_day).toFixed(2).replace('.', ',')} €/Tag
          </span>
        )}
      </div>
    </div>
  );
}
