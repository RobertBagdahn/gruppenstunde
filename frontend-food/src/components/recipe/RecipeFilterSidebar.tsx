import { useState } from 'react';
import { useTags } from '@/api/tags';
import {
  RECIPE_TYPE_OPTIONS,
  RECIPE_DIFFICULTY_OPTIONS,
  RECIPE_EXECUTION_TIME_OPTIONS,
  RECIPE_ORIGIN_OPTIONS,
  RECIPE_PREPARATION_METHOD_OPTIONS,
  type RecipeFilter,
} from '@/schemas/recipe';
import TagMultiSelect from './TagMultiSelect';
import { Icon } from '@/components/ui/icon';
import { RECIPE_COST_RANGES } from '@/lib/recipeCostRanges';
import { HelpHint } from '@/components/ui/help-hint';
import { SOURCE_BADGE_HELP } from '@/lib/sourceBadgeHelp';

function toggleArrayValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value];
}

interface RecipeFilterSidebarProps {
  filters: Partial<RecipeFilter>;
  onFilterChange: (key: string, value: unknown) => void;
  onReset: () => void;
}

export default function RecipeFilterSidebar({ filters, onFilterChange, onReset }: RecipeFilterSidebarProps) {
  const { data: tags } = useTags();
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedTagSlugs = (filters.tag_slugs as string[]) ?? [];
  const selectedOrigin = (filters.origin as string[]) ?? ['verified'];
  const selectedRecipeType = (filters.recipe_type as string[]) ?? [];
  const selectedDifficulty = (filters.difficulty as string[]) ?? [];
  const selectedExecutionTime = (filters.execution_time as string[]) ?? [];
  const selectedPrepMethod = (filters.preparation_method as string[]) ?? [];
  const selectedCostRanges = (filters.cost as string[]) ?? [];

  function toggleMulti(key: string, current: string[], value: string) {
    const next = toggleArrayValue(current, value);
    onFilterChange(key, next.length ? next : undefined);
  }

  // The default view shows verified recipes only. Picking another source from that untouched
  // default switches to it instead of adding it, so "Community" really shows community recipes.
  function toggleOrigin(value: string) {
    const isDefaultView = selectedOrigin.length === 1 && selectedOrigin[0] === 'verified';
    if (isDefaultView && value !== 'verified') {
      onFilterChange('origin', [value]);
      return;
    }
    toggleMulti('origin', selectedOrigin, value);
  }

  const hasActiveFilters =
    selectedTagSlugs.length > 0 ||
    selectedRecipeType.length > 0 ||
    selectedDifficulty.length > 0 ||
    selectedExecutionTime.length > 0 ||
    selectedPrepMethod.length > 0 ||
    selectedCostRanges.length > 0 ||
    selectedOrigin.length !== 1 || selectedOrigin[0] !== 'verified';

  const activeFilterCount =
    selectedTagSlugs.length +
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

  return (
    <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20 md:max-h-[calc(100vh-5rem)] md:overflow-y-auto">
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden w-full flex items-center justify-between gap-2 bg-card rounded-xl border p-4 mb-2 font-semibold text-body"
      >
        <span className="flex items-center gap-2">
          <Icon name="tune" size={20} className="text-primary" />
          Filter {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-white text-caption px-1.5">
              {activeFilterCount}
            </span>
          )}
        </span>
        <Icon name="expand_more" size={20} className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
      </button>

      <div className={`space-y-4 ${mobileOpen ? 'block' : 'hidden md:block'}`}>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-body font-semibold transition-colors"
        >
          <Icon name="restart_alt" size={16} />
          Zurücksetzen
        </button>

        {hasActiveFilters && (
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-caption font-semibold uppercase text-muted-foreground">
                <Icon name="filter_list" size={16} />
                Aktive Filter
              </span>
              <button onClick={onReset} className="flex items-center gap-1 text-caption text-destructive hover:underline">
                <Icon name="close" size={16} />
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
                    className="inline-flex items-center gap-1 rounded-full bg-warning-soft text-warning border border-warning-border px-2.5 py-1 text-caption font-medium hover:bg-warning-soft transition-colors"
                  >
                    {opt.label}
                    <Icon name="close" size={16} />
                  </button>
                ) : null;
              })}
              {selectedOrigin.map((val) => {
                const opt = RECIPE_ORIGIN_OPTIONS.find((o) => o.value === val);
                return opt ? (
                  <button
                    key={val}
                    onClick={() => toggleOrigin(val)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-caption font-medium hover:bg-primary/20 transition-colors"
                  >
                    {opt.label}
                    <Icon name="close" size={16} />
                  </button>
                ) : null;
              })}
              {tags && selectedTagSlugs.map((slug) => {
                const tag = tags.find((t) => t.slug === slug);
                return tag ? (
                  <button
                    key={slug}
                    onClick={() => toggleTag(slug)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-caption font-medium hover:bg-primary/20 transition-colors"
                  >
                    {tag.name}
                    <Icon name="close" size={16} />
                  </button>
                ) : null;
              })}
            </div>
          </div>
        )}

        <FilterGroup title="Typ" icon="restaurant" color="hsl(var(--primary))">
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

        <FilterGroup
          title="Anzeigen"
          icon="visibility"
          color="var(--primary)"
          hint={
            <>
              <span className="block">{SOURCE_BADGE_HELP.verified}</span>
              <span className="mt-1 block">{SOURCE_BADGE_HELP.community}</span>
              <span className="mt-1 block">Meine Rezepte: alle Rezepte, die du selbst erstellt hast (auch Entwürfe).</span>
            </>
          }
        >
          {RECIPE_ORIGIN_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedOrigin.includes(opt.value)}
              onChange={() => toggleOrigin(opt.value)}
              icon={opt.icon}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Schwierigkeit" icon="signal_cellular_alt" color="hsl(var(--primary))">
          {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedDifficulty.includes(opt.value)}
              onChange={() => toggleMulti('difficulty', selectedDifficulty, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Dauer" icon="schedule" color="hsl(var(--primary))">
          {RECIPE_EXECUTION_TIME_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedExecutionTime.includes(opt.value)}
              onChange={() => toggleMulti('execution_time', selectedExecutionTime, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Zubereitungsart" icon="cooking" color="hsl(var(--primary))">
          {RECIPE_PREPARATION_METHOD_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedPrepMethod.includes(opt.value)}
              onChange={() => toggleMulti('preparation_method', selectedPrepMethod, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Kosten" icon="payments" color="hsl(var(--primary))">
          {RECIPE_COST_RANGES.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedCostRanges.includes(opt.value)}
              onChange={() => toggleMulti('cost', selectedCostRanges, opt.value)}
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
  hint,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-body font-semibold mb-3">
        <Icon name={icon} size={20} style={{ color }} />
        <span style={{ color }}>{title}</span>
        {hint && <HelpHint label={`Was bedeutet ${title}?`}>{hint}</HelpHint>}
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
    <label className="flex items-center gap-2 py-1.5 cursor-pointer text-body hover:text-primary transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded-lg border-muted-foreground accent-primary"
      />
      {icon && <Icon name={icon} size={16} />}
      {label}
    </label>
  );
}
