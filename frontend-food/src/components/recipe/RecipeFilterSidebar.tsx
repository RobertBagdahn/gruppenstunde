import { useTags } from '@/api/tags';
import { useMaterials } from '@/api/materials';
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
import { FilterCheckbox, FilterGroup, FilterSidebar, MoreFilters, ActiveChip } from '@/components/shared/FilterParts';
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
  const { data: devices } = useMaterials({ is_consumable: false, page_size: 100 });

  const selectedTagSlugs = (filters.tag_slugs as string[]) ?? [];
  const selectedOrigin = (filters.origin as string[]) ?? ['verified'];
  const selectedRecipeType = (filters.recipe_type as string[]) ?? [];
  const selectedDifficulty = (filters.difficulty as string[]) ?? [];
  const selectedExecutionTime = (filters.execution_time as string[]) ?? [];
  const selectedPrepMethod = (filters.preparation_method as string[]) ?? [];
  const selectedCostRanges = (filters.cost as string[]) ?? [];
  const withMaterial = filters.material ?? '';
  const withoutMaterial = filters.exclude_material ?? '';

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
    withMaterial !== '' ||
    withoutMaterial !== '' ||
    selectedOrigin.length !== 1 || selectedOrigin[0] !== 'verified';

  const activeFilterCount =
    selectedTagSlugs.length +
    selectedRecipeType.length +
    selectedDifficulty.length +
    selectedExecutionTime.length +
    selectedPrepMethod.length +
    selectedCostRanges.length +
    (withMaterial ? 1 : 0) +
    (withoutMaterial ? 1 : 0) +
    (selectedOrigin.length !== 1 || selectedOrigin[0] !== 'verified' ? selectedOrigin.length : 0);

  function toggleTag(slug: string) {
    const next = selectedTagSlugs.includes(slug)
      ? selectedTagSlugs.filter((x) => x !== slug)
      : [...selectedTagSlugs, slug];
    onFilterChange('tag_slugs', next.length ? next : undefined);
  }

  const hiddenActiveCount =
    selectedDifficulty.length +
    selectedPrepMethod.length +
    selectedCostRanges.length +
    (withMaterial ? 1 : 0) +
    (withoutMaterial ? 1 : 0);

  const deviceName = (slug: string) => devices?.items.find((d) => d.slug === slug)?.name ?? slug;

  return (
    <FilterSidebar activeCount={activeFilterCount}>
      {hasActiveFilters && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Aktive Filter</span>
            <button onClick={onReset} className="flex items-center gap-1 text-caption font-medium text-primary hover:underline">
              <Icon name="close" size={16} />
              Alle löschen
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedRecipeType.map((val) => {
              const opt = RECIPE_TYPE_OPTIONS.find((o) => o.value === val);
              return opt ? (
                <ActiveChip key={val} label={opt.label} onRemove={() => toggleMulti('recipe_type', selectedRecipeType, val)} />
              ) : null;
            })}
            {selectedOrigin.map((val) => {
              const opt = RECIPE_ORIGIN_OPTIONS.find((o) => o.value === val);
              return opt ? <ActiveChip key={val} label={opt.label} onRemove={() => toggleOrigin(val)} /> : null;
            })}
            {withMaterial && (
              <ActiveChip label={`Mit ${deviceName(withMaterial)}`} onRemove={() => onFilterChange('material', undefined)} />
            )}
            {withoutMaterial && (
              <ActiveChip
                label={`Ohne ${deviceName(withoutMaterial)}`}
                onRemove={() => onFilterChange('exclude_material', undefined)}
              />
            )}
            {tags && selectedTagSlugs.map((slug) => {
              const tag = tags.find((t) => t.slug === slug);
              return tag ? <ActiveChip key={slug} label={tag.name} onRemove={() => toggleTag(slug)} /> : null;
            })}
          </div>
        </div>
      )}

      <FilterGroup title="Typ" icon="restaurant">
        {RECIPE_TYPE_OPTIONS.filter((opt) => opt.value !== 'recipe_part').map((opt) => (
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

      <FilterGroup title="Dauer" icon="schedule">
        {RECIPE_EXECUTION_TIME_OPTIONS.map((opt) => (
          <FilterCheckbox
            key={opt.value}
            checked={selectedExecutionTime.includes(opt.value)}
            onChange={() => toggleMulti('execution_time', selectedExecutionTime, opt.value)}
            label={opt.label}
          />
        ))}
      </FilterGroup>

      <MoreFilters activeCount={hiddenActiveCount}>
        <FilterGroup title="Schwierigkeit" icon="signal_cellular_alt">
          {RECIPE_DIFFICULTY_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedDifficulty.includes(opt.value)}
              onChange={() => toggleMulti('difficulty', selectedDifficulty, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Zubereitungsart" icon="cooking">
          {RECIPE_PREPARATION_METHOD_OPTIONS.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedPrepMethod.includes(opt.value)}
              onChange={() => toggleMulti('preparation_method', selectedPrepMethod, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Gerät" icon="cooking">
          {[
            { key: 'material', label: 'Mit Gerät', value: withMaterial },
            { key: 'exclude_material', label: 'Ohne Gerät', value: withoutMaterial },
          ].map((row) => (
            <label key={row.key} className="block">
              <span className="mb-1 block text-caption text-muted-foreground">{row.label}</span>
              <select
                aria-label={row.label}
                value={row.value}
                onChange={(e) => onFilterChange(row.key, e.target.value || undefined)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-body"
              >
                <option value="">Egal</option>
                {(devices?.items ?? []).map((device) => (
                  <option key={device.id} value={device.slug}>
                    {device.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </FilterGroup>

        <FilterGroup title="Kosten" icon="payments">
          {RECIPE_COST_RANGES.map((opt) => (
            <FilterCheckbox
              key={opt.value}
              checked={selectedCostRanges.includes(opt.value)}
              onChange={() => toggleMulti('cost', selectedCostRanges, opt.value)}
              label={opt.label}
            />
          ))}
        </FilterGroup>
      </MoreFilters>
    </FilterSidebar>
  );
}
