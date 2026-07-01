import { useState, type ReactNode } from 'react';
import { EntityLink } from '@/components/shared/EntityLink';
import { NutritionBaseBadge } from '@/components/recipe/NutritionBaseBadge';
import { NutritionContributionPanel, PARAMETER_LABELS } from '@/components/recipe/NutritionContributionPanel';
import type { RecipeItemNutrition } from '@/schemas/recipe';

export const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

// --- Collapsible Section Component ---
export function AnalysisSection({
  icon,
  title,
  accentColor,
  defaultOpen = false,
  preview,
  children,
}: {
  icon: string;
  title: string;
  accentColor: string;
  defaultOpen?: boolean;
  preview?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className={`material-symbols-outlined text-[18px] ${accentColor}`}>{icon}</span>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {preview && <div className="shrink-0">{preview}</div>}
          <span
            className={`material-symbols-outlined text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </section>
  );
}

// --- Macro Bar Component ---
export function MacroBar({
  label,
  value,
  max,
  color,
  unit = 'g',
  dgeRef,
  dgeCoverage,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
  dgeRef?: number | null;
  dgeCoverage?: number | null;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
        {unit === 'kcal' ? Math.round(value) : parseFloat(value.toFixed(1))} {unit}
          {dgeRef != null && dgeRef > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              Referenz: {dgeRef.toFixed(1)} {unit}
            </span>
          )}
          {dgeCoverage != null && (
            <span className={`ml-1.5 text-[10px] font-semibold ${
              dgeCoverage >= 80 ? 'text-green-600' : dgeCoverage >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {dgeCoverage.toFixed(0)}%
            </span>
          )}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
         />
      </div>
    </div>
  );
}

// --- Collapsible Micronutrient Section (Vitamins / Minerals) ---
export function MicronutrientSection({
  title,
  icon,
  accentColor,
  nutrients,
  dgeCoverage,
  portions,
}: {
  title: string;
  icon: string;
  accentColor: string;
  nutrients: Array<{
    label: string;
    value: number | null | undefined;
    unit: string;
    dgeKey: string;
    per100g?: boolean;
  }>;
  dgeCoverage: Record<string, number | null>;
  portions?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasAnyValue = nutrients.some((n) => n.value != null && n.value > 0);
  if (!hasAnyValue) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`material-symbols-outlined text-base ${accentColor}`}>{icon}</span>
          {title}
        </span>
        <span
          className={`material-symbols-outlined text-muted-foreground text-base transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {nutrients.map((n) => {
            if (n.value == null || n.value <= 0) return null;
            const displayValue = n.per100g ? n.value : n.value / (portions ?? 1);
            const unitLabel = n.per100g ? `${n.unit}/100g` : `${n.unit}/Portion`;
            const coverage = dgeCoverage[n.dgeKey] ?? null;
            return (
              <div key={n.dgeKey} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{n.label}</span>
                  <span className="text-muted-foreground">
                    {displayValue < 0.1 ? displayValue.toFixed(3) : displayValue.toFixed(1)} {unitLabel}
                    {coverage != null && (
                      <span className={`ml-2 font-semibold ${coverage >= 80 ? 'text-green-600' : coverage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {coverage.toFixed(0)}% DGE
                      </span>
                    )}
                  </span>
                </div>
                {coverage != null && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        coverage >= 80 ? 'bg-green-500' : coverage >= 40 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(coverage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Collapsible accordion showing per-parameter contribution panels. */
export function CollapsibleContributions({ items }: { items: RecipeItemNutrition[] }) {
  const [openParam, setOpenParam] = useState<string | null>(null);

  const parameters = ['energy', 'protein', 'fat', 'sat_fat', 'carbs', 'sugar', 'salt', 'fiber'] as const;
  const units: Record<string, string> = {
    energy: 'kcal', protein: 'g', fat: 'g', sat_fat: 'g',
    carbs: 'g', sugar: 'g', salt: 'g', fiber: 'g',
  };

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        Zutaten-Beiträge pro Portion
        <NutritionBaseBadge base="per_portion" />
      </h3>
      <div className="border rounded-lg divide-y">
        {parameters.map((param) => {
          const isOpen = openParam === param;
          return (
            <div key={param}>
              <button
                onClick={() => setOpenParam(isOpen ? null : param)}
                className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium">{PARAMETER_LABELS[param] ?? param}</span>
                <span
                  className={`material-symbols-outlined text-muted-foreground text-base transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  <NutritionContributionPanel
                    parameter={param}
                    items={items}
                    unit={units[param]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NutrientCard({
  label,
  value,
  unit,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`text-center p-4 rounded-xl border ${bgColor}`}>
      <span className={`material-symbols-outlined text-2xl ${color}`}>{icon}</span>
      <p className="text-xl font-extrabold mt-1">
        {value.toFixed(unit === 'kcal' ? 0 : 1)}
      </p>
      <p className="text-xs text-muted-foreground">
        {label} ({unit})
      </p>
    </div>
  );
}

export function HealthIndicator({
  label,
  value,
  max,
  unit,
  goodBelow,
  warnBelow,
  inverted = false,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  goodBelow: number;
  warnBelow: number;
  inverted?: boolean;
}) {
  let status: 'good' | 'warn' | 'bad';
  if (inverted) {
    status = value >= goodBelow ? 'good' : value >= warnBelow ? 'warn' : 'good';
  } else {
    status = value <= goodBelow ? 'good' : value <= warnBelow ? 'warn' : 'bad';
  }

  const statusColors = {
    good: 'bg-green-50 border-green-200 text-green-700',
    warn: 'bg-amber-50 border-amber-200 text-amber-700',
    bad: 'bg-red-50 border-red-200 text-red-700',
  };

  const statusIcons = {
    good: 'check_circle',
    warn: 'warning',
    bad: 'error',
  };

  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const dgePct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={`p-3 rounded-xl border ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="material-symbols-outlined text-[16px]">{statusIcons[status]}</span>
      </div>
      <p className="text-lg font-bold">
        {value.toFixed(1)} {unit}
      </p>
      <p className="text-[10px] opacity-75">{dgePct}% der DGE-Referenz</p>
      <div className="h-1.5 bg-white/50 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full rounded-full ${status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PriceRow({
  item,
  totalPrice,
  ingredientSlugById,
}: {
  item: RecipeItemNutrition;
  totalPrice: number;
  ingredientSlugById: Map<number, string>;
}) {
  const pricePct = totalPrice > 0 && item.price_eur ? (item.price_eur / totalPrice) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {item.ingredient_id && ingredientSlugById.get(item.ingredient_id) ? (
        <EntityLink
          type="ingredient"
          slug={ingredientSlugById.get(item.ingredient_id)!}
          name={item.ingredient_name}
          variant="muted"
          className="text-sm font-medium w-32 truncate"
        />
      ) : (
        <span className="text-sm font-medium w-32 truncate">{item.ingredient_name}</span>
      )}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${pricePct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-yellow-700 w-16 text-right">
        {item.price_eur?.toFixed(2)} EUR
      </span>
    </div>
  );
}
