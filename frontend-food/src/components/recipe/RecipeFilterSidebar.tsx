import { useState } from 'react';
import { useTags, useScoutLevels } from '@/api/tags';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_ORIGIN_OPTIONS,
  type RecipeFilter,
} from '@/schemas/recipe';
import TagMultiSelect from './TagMultiSelect';

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

  const hasActiveFilters =
    selectedTagSlugs.length > 0 ||
    selectedScoutIds.length > 0 ||
    filters.recipe_type ||
    filters.difficulty ||
    filters.costs_min !== undefined ||
    filters.costs_max !== undefined ||
    filters.execution_time ||
    (filters.origin && filters.origin !== 'all');

  const activeFilterCount =
    selectedTagSlugs.length +
    selectedScoutIds.length +
    (filters.recipe_type ? 1 : 0) +
    (filters.difficulty ? 1 : 0) +
    (filters.costs_min !== undefined || filters.costs_max !== undefined ? 1 : 0) +
    (filters.execution_time ? 1 : 0) +
    (filters.origin && filters.origin !== 'all' ? 1 : 0);

  return (
    <aside className="w-full md:w-64 shrink-0">
      {/* Mobile toggle button */}
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
        {/* Active filter chips */}
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
              {filters.recipe_type && (() => {
                const opt = RECIPE_TYPE_OPTIONS.find((o) => o.value === filters.recipe_type);
                return opt ? (
                  <button
                    onClick={() => onFilterChange('recipe_type', undefined)}
                    className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2))]/20 px-2.5 py-1 text-xs font-medium hover:bg-[hsl(var(--chart-2))]/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })()}
              {filters.origin && filters.origin !== 'all' && (() => {
                const opt = RECIPE_ORIGIN_OPTIONS.find((o) => o.value === filters.origin);
                return opt ? (
                  <button
                    onClick={() => onFilterChange('origin', undefined)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {opt.label}
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                ) : null;
              })()}
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

        {/* Recipe Type */}
        <div className="bg-card rounded-xl border-l-4 border-l-[hsl(var(--chart-2))] border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="material-symbols-outlined text-[hsl(var(--chart-2))] text-[18px]">restaurant</span>
              <span className="text-[hsl(var(--chart-2))]">Rezeptart</span>
            </h3>
            <TagMultiSelect selectedSlugs={selectedTagSlugs} onToggle={toggleTag} />
          </div>
          {RECIPE_TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="radio"
                name="recipe_type"
                checked={filters.recipe_type === opt.value}
                onChange={() => onFilterChange('recipe_type', filters.recipe_type === opt.value ? undefined : opt.value)}
                className="border-muted-foreground accent-primary"
              />
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              {opt.label}
            </label>
          ))}
        </div>

        {/* Origin / Herkunft */}
        <div className="bg-card rounded-xl border-l-4 border-l-primary border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            <span className="text-primary">Herkunft</span>
          </h3>
          {RECIPE_ORIGIN_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="radio"
                name="origin"
                checked={(filters.origin ?? 'all') === opt.value}
                onChange={() => onFilterChange('origin', opt.value === 'all' ? undefined : opt.value)}
                className="border-muted-foreground accent-primary"
              />
              <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
              {opt.label}
            </label>
          ))}
        </div>

        {/* Scout Levels */}
        {scoutLevels && (
          <div className="bg-card rounded-xl border-l-4 border-l-[hsl(var(--chart-3))] border p-4 shadow-sm">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
              <span className="material-symbols-outlined text-[hsl(var(--chart-3))] text-[18px]">groups</span>
              <span className="text-[hsl(var(--chart-3))]">Stufe</span>
            </h3>
            {scoutLevels.map((level) => (
              <label key={level.id} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedScoutIds.includes(level.id)}
                  onChange={() => toggleScoutLevel(level.id)}
                  className="rounded border-muted-foreground accent-primary"
                />
                {level.icon && <span className="material-symbols-outlined text-[16px]">{level.icon}</span>}
                {level.name}
              </label>
            ))}
          </div>
        )}

        {/* Difficulty */}
        <div className="bg-card rounded-xl border-l-4 border-l-[hsl(var(--chart-2))] border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-[hsl(var(--chart-2))] text-[18px]">signal_cellular_alt</span>
            <span className="text-[hsl(var(--chart-2))]">Schwierigkeit</span>
          </h3>
          {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="radio"
                name="difficulty"
                checked={filters.difficulty === opt.value}
                onChange={() => onFilterChange('difficulty', filters.difficulty === opt.value ? undefined : opt.value)}
                className="border-muted-foreground accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Costs */}
        <div className="bg-card rounded-xl border-l-4 border-l-[hsl(var(--chart-4))] border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-[hsl(var(--chart-4))] text-[18px]">payments</span>
            <span className="text-[hsl(var(--chart-4))]">Kosten (€)</span>
          </h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Min</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.costs_min ?? ''}
                onChange={(e) => onFilterChange('costs_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="z.B. 0"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Max</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={filters.costs_max ?? ''}
                onChange={(e) => onFilterChange('costs_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="z.B. 5"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-card rounded-xl border-l-4 border-l-[hsl(var(--chart-1))] border p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-[hsl(var(--chart-1))] text-[18px]">schedule</span>
            <span className="text-[hsl(var(--chart-1))]">Dauer</span>
          </h3>
          {RECIPE_EXECUTION_TIME_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm hover:text-primary transition-colors">
              <input
                type="radio"
                name="duration"
                checked={filters.execution_time === opt.value}
                onChange={() => onFilterChange('execution_time', filters.execution_time === opt.value ? undefined : opt.value)}
                className="border-muted-foreground accent-primary"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
