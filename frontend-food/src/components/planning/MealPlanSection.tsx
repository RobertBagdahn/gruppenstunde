import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import MealPlanHeroCard from '@/components/planning/MealPlanHeroCard';
import MealPlanCompactCard from '@/components/planning/MealPlanCompactCard';
import type { MealPlan } from '@/schemas/mealPlan';

interface MealPlanSectionProps {
  title: string;
  icon?: string;
  plans: MealPlan[];
  defaultOpen: boolean;
  variant: 'hero' | 'compact';
  showProgress?: boolean;
  isReference?: boolean;
  userId: number | undefined;
  onDelete?: (id: number) => void;
  onUseAsTemplate?: (plan: MealPlan) => void;
}

export default function MealPlanSection({
  title,
  icon,
  plans,
  defaultOpen,
  variant,
  showProgress = false,
  isReference = false,
  userId,
  onDelete,
  onUseAsTemplate,
}: MealPlanSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (plans.length === 0) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 mb-4 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {icon && (
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        )}
        {title}
        <span className="text-xs font-semibold text-muted-foreground">({plans.length})</span>
      </button>

      {open && (
        variant === 'hero' ? (
          <div className="flex flex-col gap-4">
            {plans.map((plan) => (
              <MealPlanHeroCard
                key={plan.id}
                plan={plan}
                userId={userId}
                onDelete={onDelete || (() => {})}
                onUseAsTemplate={onUseAsTemplate || (() => {})}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <MealPlanCompactCard
                key={plan.id}
                plan={plan}
                userId={userId}
                showProgress={showProgress}
                isReference={isReference}
                onUseAsTemplate={onUseAsTemplate}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
