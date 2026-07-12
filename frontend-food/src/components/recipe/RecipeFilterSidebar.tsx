import { useState } from 'react';
import { useTags, useScoutLevels } from '@/api/tags';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_ORIGIN_OPTIONS,
  RECIPE_PREPARATION_METHOD_OPTIONS,
  type RecipeFilter,
} from '@/schemas/recipe';
import TagMultiSelect from './TagMultiSelect';

const COST_RANGE_OPTIONS = [
  { value: 'lt2', label: '< 2€' },
  { value: '2-5', label: '2 – 5€' },
  { value: '5-10', label: '5 – 10€' },
  { value: 'gt10', label: '> 10€' },
] as const;

function toggleArrayValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value];
}

function costRangeToParams(range: string): { costs_min?: number; costs_max?: number } {
  switch (range) {
    case 'lt2': return { costs_max: 2 };
    case '2-5': return { costs_min: 2, costs_max: 5 };
    case '5-10': return { costs_min: 5, costs_max: 10 };
    case 'gt10': return { costs_min: 10 };
    default: return {};
  }
}

function parseCostRangesFromFilters(
  costsMin: number | undefined,
  costsMax: number | undefined,
): string[] {
  const ranges: string[] = [];
  if (costsMax === 2) ranges.push('lt2');
  if (costsMin === 2 && costsMax === 5) ranges.push('2-5');
  if (costsMin === 5 && costsMax === 10) ranges.push('5-10');
  if (costsMin === 10) ranges.push('gt10');
  return ranges;
}

interface RecipeFilterSidebarProps {
  filters: Partial<RecipeFilter>;
  onFilterChange: (key: string, value: unknown) => void;
  onReset: () => void;
}

export default function RecipeFilterSidebar({ filters, onFilterChange, onReset }: RecipeFilterSidebarProps) {
  const { data: tags } = useTags();
  const { data: scoutLevels } = useScoutLevels();
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedTagSlugs = (filters.tag_slugs as string[]) ?? [];
  const selectedScoutIds = (filters.scout_level_ids as number[]) ?? [];
  const selectedOrigin = (filters.origin as string[]) ?? ['verified'];
  const selectedRecipeType = (filters.recipe_type as string[]) ?? [];
  const selectedDifficulty = (filters.difficulty as string[]) ?? [];
  const selectedExecutionTime = (filters.execution_time as string[]) ?? [];
  const selectedPrepMethod = (filters.preparation_method as string[]) ?? [];
  const selectedCostRanges = parseCostRangesFromFilters(filters.costs_min, filters.costs_max);

  function toggleMulti(key: string, current: string[], value: string) {
    const next = toggleArrayValue(current, value);
    onFilterChange(key, next.length ? next : undefined);
  }

  function handleCostChange(range: string) {
    const next = toggleArrayValue(selectedCostRanges, range);
    if (next.length === 0) {
      onFilterChange('costs_min', undefined);
      onFilterChange('costs_max', undefined);
      return;
    }
    let min: number | undefined;
    let max: number | undefined;
    for (const r of next) {
      const p = costRangeToParams(r);
      if (p.costs_min !== undefined && (min === undefined || p.costs_min < min)) min = p.costs_min;
      if (p.costs_max !== undefined && (max === undefined || p.costs_max > max)) max = p.costs_max;
    }
    onFilterChange('costs_min', min);
    onFilterChange('costs_max', max);
  }

  const hasActiveFilters =
    selectedTagSlugs.length > 0 ||
    selectedScoutIds.length > 0 ||
    selectedRecipeType.length > 0 ||
    selectedDifficulty.length > 0 ||
    selectedExecutionTime.length > 0 ||
    selectedPrepMethod.length > 0 ||
    selectedCostRanges.length > 0 ||
    selectedOrigin.length !== 1 || selectedOrigin[0] !== 'verified';

  const activeFilterCount =
    selectedTagSlugs.length +
    selectedScoutIds.length +
    selectedRecipeType.length +
    selectedDifficulty.length +
    selectedExecutionTime.length +
    selectedPrepMethod.length +
    selectedCostRanges.length +
    (selectedOrigin.length !== 1 || selectedOrigin[0] !== 'verified' ? selectedOrigin.length : 0);

  function toggleTag(slug: string) {
    const next = selectedTagSlugs.includes(slug)
      ? selectedTagSlugs.filter((x) => x !== slug)
      : [...selectedTagSlugs, slug];
    onFilterChange('tag_slugs', next.length ? next : undefined);
  }

  function toggleScoutLevel(id: number) {
    const next = selectedScoutIds.includes(id)
      ? selectedScoutIds.filter((x) => x !== id)
      : [...selectedScoutIds, id];
    onFilterChange('scout_level_ids', next.length ? next : undefined);
  }

  return (
    <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20 md:max-h-[calc(100vh-5rem)] md:overflow-y-auto">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-sm"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
          Filter {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-white text-xs px-1.5">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className={`material-symbols-outlined text-[20px] transition-transform ${mobileOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          Zurücksetzen
        </button>

        {hasActiveFilters && (
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                Aktive Filter
              </span>
              <button onClick={onReset} className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <span className="material-symbols-outlined text-[14px]">close</span>
                Alle löschen
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedRecipeType.map((val) => {
                const opt = RECIPE_TYPE_OPTIONS.find((o) => o.value === val);
                return opt ? (
                  <button
                    key={val}
                    onClick={() => toggleMulti('recipe_type', selectedRecipeType, val)}
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2))]/20 px-2.5 py-1 text-xs font-medium hover:bg-[hsl(var(--chart-2))]/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })}
              {selectedOrigin.map((val) => {
                const opt = RECIPE_ORIGIN_OPTIONS.find((o) => o.value === val);
                return opt ? (
                  <button
                    key={val}
                    onClick={() => toggleMulti('origin', selectedOrigin, val)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })}
              {tags && selectedTagSlugs.map((slug) => {
                const tag = tags.find((t) => t.slug === slug);
                return tag ? (
                  <button
                    key={slug}
                    onClick={() => toggleTag(slug)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {tag.name}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })}
              {scoutLevels && selectedScoutIds.map((id) => {
                const level = scoutLevels.find((s) => s.id === id);
                return level ? (
                  <button
                    key={id}
                    onClick={() => toggleScoutLevel(id)}
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3))]/20 px-2.5 py-1 text-xs font-medium hover:bg-[hsl(var(--chart-3))]/20 transition-colors"
                  >
                    {level.name}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })}
            </div>
          </div>
        )}

        <FilterGroup title="Typ" icon="restaurant" color="var(--chart-2)">
          {RECIPE_TYPE_OPTIONS.filter((opt) => opt.value !== 'recipe_part' && opt.value !== 'ingredient').map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedRecipeType.includes(opt.value)}
              onChange={() => toggleMulti('recipe_type', selectedRecipeType, opt.value)}
              icon={opt.icon}
              label={opt.label}
            />
          ))}
          <TagMultiSelect selectedSlugs={selectedTagSlugs} onToggle={toggleTag} />
        </FilterGroup>

        <FilterGroup title="Anzeigen" icon="visibility" color="var(--primary)">
          {RECIPE_ORIGIN_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedOrigin.includes(opt.value)}
              onChange={() => toggleMulti('origin', selectedOrigin, opt.value)}
              icon={opt.icon}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        {scoutLevels && (
          <FilterGroup title="Stufe" icon="groups" color="var(--chart-3)">
            {scoutLevels.map((level) => (
              <FilterCheckbox
                key={level.id}
                checked={selectedScoutIds.includes(level.id)}
                onChange={() => toggleScoutLevel(level.id)}
                icon={level.icon}
                label={level.name}
              />
            ))}
          </FilterGroup>
        )}

        <FilterGroup title="Schwierigkeit" icon="signal_cellular_alt" color="var(--chart-2)">
          {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedDifficulty.includes(opt.value)}
              onChange={() => toggleMulti('difficulty', selectedDifficulty, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Dauer" icon="schedule" color="var(--chart-1)">
          {RECIPE_EXECUTION_TIME_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedExecutionTime.includes(opt.value)}
              onChange={() => toggleMulti('execution_time', selectedExecutionTime, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Zubereitungsart" icon="cooking" color="var(--chart-2)">
          {RECIPE_PREPARATION_METHOD_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedPrepMethod.includes(opt.value)}
              onChange={() => toggleMulti('preparation_method', selectedPrepMethod, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Kosten" icon="payments" color="var(--chart-4)">
          {COST_RANGE_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedCostRanges.includes(opt.value)}
              onChange={() => handleCostChange(opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>
      </div>
    </aside>
  );
}

function FilterGroup({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
        <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
        <span style={{ color }}>{title}</span>
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  checked,
  onChange,
  icon,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  icon?: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-muted-foreground accent-primary"
      />
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      {label}
    </label>
  );
}
