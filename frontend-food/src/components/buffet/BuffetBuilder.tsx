import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutGrid, Save, Search, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBuffetTemplates,
  useBuffetCatalog,
  useBuffetCatalogSearch,
  useBuffetState,
  useBuffetPreview,
  useSaveBuffet,
} from '@/api/buffet';
import type { BuffetCatalogItem, BuffetCatalogRole } from '@/schemas/buffet';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

interface BuffetBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanId: number;
  mealId: number;
  mealType: string;
  normPortions?: number;
  onSaved?: () => void;
}

type SelectionKey = string;

interface RoleFormState {
  expanded: boolean;
  selected: Set<SelectionKey>;
  amount: number;
}

interface BuffetSearchFilters {
  kind: 'all' | 'ingredient' | 'recipe';
  recipeType: string;
  includeNonStandalone: boolean;
  excludeAlcohol: boolean;
}

const DEFAULT_SEARCH_FILTERS: BuffetSearchFilters = {
  kind: 'all',
  recipeType: '',
  includeNonStandalone: false,
  excludeAlcohol: false,
};
const RECIPE_TYPE_FILTERS = RECIPE_TYPE_OPTIONS.filter((option) => option.value !== 'ingredient');

function itemKey(item: Pick<BuffetCatalogItem, 'kind' | 'id'>): SelectionKey {
  return `${item.kind}:${item.id}`;
}

export function BuffetBuilder({
  open,
  onOpenChange,
  mealPlanId,
  mealId,
  mealType,
  normPortions = 1,
  onSaved,
}: BuffetBuilderProps) {
  const {
    data: allTemplates,
    isLoading: templatesLoading,
    isError: templatesError,
    refetch: refetchTemplates,
  } = useBuffetTemplates(undefined, { enabled: open });
  const {
    data: savedState,
    isLoading: stateLoading,
    isError: stateError,
    refetch: refetchState,
  } = useBuffetState(mealPlanId, mealId, { enabled: open });

  const templatesForMealType = useMemo(() => {
    const matching = (allTemplates ?? []).filter((candidate) => candidate.meal_types.includes(mealType));
    return matching.sort((a, b) => {
      const priority = (slug: string) => {
        if (mealType === 'breakfast' && slug === 'breakfast') return -1;
        if (slug === 'free') return 1;
        return 0;
      };
      return priority(a.slug) - priority(b.slug) || a.sort_order - b.sort_order || a.name.localeCompare(b.name);
    });
  }, [allTemplates, mealType]);
  const otherTemplates = useMemo(
    () => (allTemplates ?? []).filter((candidate) => !candidate.meal_types.includes(mealType)),
    [allTemplates, mealType],
  );

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [roleStates, setRoleStates] = useState<Record<string, RoleFormState>>({});
  const [roleSearch, setRoleSearch] = useState<Record<string, string>>({});
  const [customItemsByRole, setCustomItemsByRole] = useState<Record<string, BuffetCatalogItem[]>>({});
  const [searchFilters, setSearchFilters] = useState<BuffetSearchFilters>(DEFAULT_SEARCH_FILTERS);
  const restoredRef = useRef(false);
  const seededTemplateRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      restoredRef.current = false;
      seededTemplateRef.current = null;
    } else {
      setTemplateId(null);
      setRoleStates({});
      setRoleSearch({});
      setCustomItemsByRole({});
      setSearchFilters(DEFAULT_SEARCH_FILTERS);
    }
  }, [open]);

  // Restore the saved template first. A first-time breakfast always opens its dedicated preset.
  useEffect(() => {
    if (!open || restoredRef.current || templateId !== null) return;
    if (savedState === undefined || allTemplates === undefined) return;
    restoredRef.current = true;
    if (savedState.template_id && allTemplates.some((candidate) => candidate.id === savedState.template_id)) {
      setTemplateId(savedState.template_id);
      return;
    }
    if (mealType === 'breakfast') {
      const breakfastTemplate = templatesForMealType.find((candidate) => candidate.slug === 'breakfast');
      if (breakfastTemplate) {
        setTemplateId(breakfastTemplate.id);
        return;
      }
    }
    if (templatesForMealType.length > 0) {
      setTemplateId(templatesForMealType[0].id);
      return;
    }
    const freeTemplate = allTemplates.find((candidate) => candidate.slug === 'free');
    if (freeTemplate) setTemplateId(freeTemplate.id);
  }, [open, savedState, allTemplates, templatesForMealType, templateId, mealType]);

  const template = useMemo(
    () => (allTemplates ?? []).find((candidate) => candidate.id === templateId) ?? null,
    [allTemplates, templateId],
  );
  const {
    data: catalog,
    isLoading: catalogLoading,
    isError: catalogError,
    refetch: refetchCatalog,
  } = useBuffetCatalog(template?.slug ?? null, { enabled: open });
  const {
    preview,
    result: previewResult,
    isPending: previewPending,
    error: previewError,
    reset: resetPreview,
  } = useBuffetPreview(mealPlanId, mealId);
  const saveBuffet = useSaveBuffet(mealPlanId, mealId);

  useEffect(() => {
    resetPreview();
  }, [templateId, resetPreview]);

  // Restore free selections from saved item details even when they are absent from role favorites.
  useEffect(() => {
    if (!catalog || !template || seededTemplateRef.current === template.id) return;
    seededTemplateRef.current = template.id;
    const restoreThisTemplate = savedState?.template_id === template.id;
    const next: Record<string, RoleFormState> = {};
    const nextCustomItems: Record<string, BuffetCatalogItem[]> = {};
    for (const role of catalog.roles) {
      const selected = new Set<SelectionKey>();
      if (restoreThisTemplate) {
        for (const selection of savedState?.selections ?? []) {
          if (selection.role_slug !== role.role.slug) continue;
          const id = selection.kind === 'ingredient' ? selection.ingredient_id : selection.recipe_id;
          if (id == null) continue;
          const key = `${selection.kind}:${id}`;
          selected.add(key);
          if (!role.items.some((item) => itemKey(item) === key)) {
            const customItem: BuffetCatalogItem = {
              kind: selection.kind,
              id,
              name: selection.name,
              energy_kcal_per_100g: selection.energy_kcal_per_100g,
              price_per_kg: selection.price_per_kg,
              weight_per_serving_g: selection.weight_per_serving_g,
              default_selected: false,
            };
            nextCustomItems[role.role.slug] = [...(nextCustomItems[role.role.slug] ?? []), customItem];
          }
        }
      } else if (role.enabled_by_default) {
        for (const item of role.items) {
          if (item.default_selected) selected.add(itemKey(item));
        }
      }
      const amount =
        (restoreThisTemplate ? savedState?.role_amounts?.[role.role.slug] : undefined) ?? role.amount_per_person ?? 0;
      next[role.role.slug] = {
        expanded: restoreThisTemplate ? selected.size > 0 : role.enabled_by_default,
        selected,
        amount,
      };
    }
    setRoleStates(next);
    setCustomItemsByRole(nextCustomItems);
  }, [catalog, template, savedState]);

  const buildSelections = () => {
    const selections: { role_slug: string; ingredient_id?: number | null; recipe_id?: number | null }[] = [];
    const roleAmounts: Record<string, number> = {};
    for (const [roleSlug, state] of Object.entries(roleStates)) {
      if (state.selected.size === 0) continue;
      roleAmounts[roleSlug] = state.amount;
      for (const key of state.selected) {
        const [kind, idStr] = key.split(':');
        const id = Number(idStr);
        selections.push({
          role_slug: roleSlug,
          ingredient_id: kind === 'ingredient' ? id : null,
          recipe_id: kind === 'recipe' ? id : null,
        });
      }
    }
    return { selections, roleAmounts };
  };

  const retryPreview = () => {
    if (!template) return;
    const { selections, roleAmounts } = buildSelections();
    preview({ templateId: template.id, selections, roleAmounts });
  };

  useEffect(() => {
    if (!template || seededTemplateRef.current !== template.id || Object.keys(roleStates).length === 0) return;
    const { selections, roleAmounts } = buildSelections();
    preview({ templateId: template.id, selections, roleAmounts });
    // buildSelections reads roleStates/template; re-run whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleStates, template, preview]);

  const toggleItem = (roleSlug: string, item: BuffetCatalogItem) => {
    const key = itemKey(item);
    const isFavorite = catalog?.roles
      .find((role) => role.role.slug === roleSlug)
      ?.items.some((candidate) => itemKey(candidate) === key) ?? false;
    const wasSelected = roleStates[roleSlug]?.selected.has(key) ?? false;

    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      const next = new Set(state.selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...current, [roleSlug]: { ...state, selected: next } };
    });

    if (!isFavorite) {
      setCustomItemsByRole((current) => {
        const roleItems = current[roleSlug] ?? [];
        const nextItems = wasSelected
          ? roleItems.filter((candidate) => itemKey(candidate) !== key)
          : roleItems.some((candidate) => itemKey(candidate) === key)
            ? roleItems
            : [...roleItems, { ...item, default_selected: false }];
        return { ...current, [roleSlug]: nextItems };
      });
    }
  };

  const setAmount = (roleSlug: string, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      return { ...current, [roleSlug]: { ...state, amount } };
    });
  };

  const toggleExpanded = (roleSlug: string) => {
    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      return { ...current, [roleSlug]: { ...state, expanded: !state.expanded } };
    });
  };

  const handleSave = () => {
    if (!template) return;
    const { selections, roleAmounts } = buildSelections();
    saveBuffet.mutate(
      { templateId: template.id, selections, roleAmounts },
      {
        onSuccess: () => {
          toast.success('Buffet gespeichert', { description: `${template.name} für ${normPortions} Personen` });
          onSaved?.();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error('Fehler beim Speichern', { description: err.message });
        },
      },
    );
  };

  const templateSelectionPending =
    open &&
    templateId === null &&
    savedState !== undefined &&
    allTemplates !== undefined &&
    (templatesForMealType.length > 0 || allTemplates.some((candidate) => candidate.slug === 'free'));
  const isLoading = templatesLoading || stateLoading || catalogLoading || templateSelectionPending;
  const kcalPercent =
    previewResult?.energy_kcal_per_person != null
      ? Math.round((previewResult.energy_kcal_per_person / Math.max(previewResult.target_kcal_per_person, 1)) * 100)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-section sm:text-section font-display font-bold text-foreground">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <span>Buffet zusammenstellen</span>
              <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {normPortions} {normPortions === 1 ? 'Person' : 'Personen'}
              </span>
            </DialogTitle>
            {!!allTemplates?.length && (
              <Select
                value={templateId != null ? String(templateId) : ''}
                onValueChange={(value) => {
                  setTemplateId(Number(value));
                  seededTemplateRef.current = null;
                }}
              >
                <SelectTrigger className="w-full sm:w-64 h-9 text-body" data-testid="buffet-template-select">
                  <SelectValue placeholder="Vorlage wählen" />
                </SelectTrigger>
                <SelectContent>
                  {templatesForMealType.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{mealType === 'breakfast' ? 'Frühstücksmodus' : 'Passende Vorlagen'}</SelectLabel>
                      {templatesForMealType.map((candidate) => (
                        <SelectItem key={candidate.id} value={String(candidate.id)}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {otherTemplates.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Alle Vorlagen</SelectLabel>
                      {otherTemplates.map((candidate) => (
                        <SelectItem key={candidate.id} value={String(candidate.id)}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        {templatesError || stateError ? (
          <div className="m-4 rounded-xl border border-danger-border bg-danger-soft p-4 text-body text-danger" role="alert">
            <p>{templatesError ? 'Die Buffet-Vorlagen konnten nicht geladen werden.' : 'Das gespeicherte Buffet konnte nicht geladen werden.'}</p>
            <button
              type="button"
              onClick={() => {
                if (templatesError) void refetchTemplates();
                if (stateError) void refetchState();
              }}
              className="mt-3 rounded-lg border border-danger-border px-3 py-1.5 text-caption font-semibold hover:bg-danger-soft"
            >
              Erneut versuchen
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-caption text-muted-foreground" role="status">Lade Buffet-Katalog…</div>
        ) : !template ? (
          <div className="m-4 rounded-xl border border-border bg-muted/20 p-6 text-center" role="status">
            <p className="text-body font-semibold text-foreground">Für diesen Mahlzeitentyp gibt es noch keine Buffet-Vorlage.</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Wähle eine andere Vorlage aus oder versuche es später erneut.
            </p>
          </div>
        ) : catalogError || !catalog ? (
          <div className="m-4 rounded-xl border border-danger-border bg-danger-soft p-4 text-body text-danger" role="alert">
            <p>Der Buffet-Katalog konnte nicht geladen werden.</p>
            <button
              type="button"
              onClick={() => void refetchCatalog()}
              className="mt-3 rounded-lg border border-danger-border px-3 py-1.5 text-caption font-semibold hover:bg-danger-soft"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/10 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-caption font-semibold text-foreground">Item-Art</span>
                <Select
                  value={searchFilters.kind}
                  onValueChange={(value) => setSearchFilters((current) => ({
                    ...current,
                    kind: value as BuffetSearchFilters['kind'],
                    recipeType: value === 'ingredient' ? '' : current.recipeType,
                  }))}
                >
                  <SelectTrigger aria-label="Item-Art filtern"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Items</SelectItem>
                    <SelectItem value="ingredient">Zutaten</SelectItem>
                    <SelectItem value="recipe">Rezepte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {searchFilters.kind !== 'ingredient' && (
                <div className="space-y-1.5">
                  <span className="text-caption font-semibold text-foreground">Rezepttyp</span>
                  <Select
                    value={searchFilters.recipeType || 'all'}
                    onValueChange={(value) => setSearchFilters((current) => ({
                      ...current,
                      recipeType: value === 'all' ? '' : value,
                    }))}
                  >
                    <SelectTrigger aria-label="Rezepttyp filtern"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Rezepttypen</SelectItem>
                      {RECIPE_TYPE_FILTERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <label className="flex items-center gap-2 text-caption text-foreground">
                <Checkbox
                  checked={searchFilters.includeNonStandalone}
                  onCheckedChange={(checked) => setSearchFilters((current) => ({ ...current, includeNonStandalone: checked === true }))}
                />
                Auch Backzutaten & Gewürze
              </label>
              <label className="flex items-center gap-2 text-caption text-foreground">
                <Checkbox
                  checked={searchFilters.excludeAlcohol}
                  onCheckedChange={(checked) => setSearchFilters((current) => ({ ...current, excludeAlcohol: checked === true }))}
                />
                Alkoholische Treffer ausblenden
              </label>
            </div>
            {catalog.roles.map((role) => (
              <RoleSection
                key={role.role.slug}
                role={role}
                state={roleStates[role.role.slug]}
                customItems={customItemsByRole[role.role.slug] ?? []}
                search={roleSearch[role.role.slug] ?? ''}
                mealType={mealType}
                filters={searchFilters}
                onSearchChange={(value) => setRoleSearch((current) => ({ ...current, [role.role.slug]: value }))}
                onToggleItem={(item) => toggleItem(role.role.slug, item)}
                onAmountChange={(amount) => setAmount(role.role.slug, amount)}
                onToggleExpanded={() => toggleExpanded(role.role.slug)}
              />
            ))}
          </div>
        )}

        {/* Live preview */}
        <div className="p-4 border-t border-border bg-muted/20 space-y-3">
          {previewError && template && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-caption text-danger" role="alert">
              <span>Die Vorschau konnte nicht geladen werden.</span>
              <button type="button" onClick={retryPreview} className="font-semibold underline underline-offset-2">
                Erneut versuchen
              </button>
            </div>
          )}
          {previewResult && previewResult.warnings.length > 0 && (
            <div className="space-y-1">
              {previewResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-1.5 text-caption text-warning bg-warning-soft border border-warning-border rounded-lg px-2.5 py-1.5"
                >
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-caption">
              {previewResult ? (
                <>
                  <span className={`inline-flex items-center gap-1 font-semibold ${kcalPercent != null && kcalPercent < 80 ? 'text-danger' : 'text-foreground'}`}>
                    <Icon name="local_fire_department" size={16} className="text-warning" />
                    {previewResult.energy_kcal_per_person != null ? Math.round(previewResult.energy_kcal_per_person) : '—'} / {Math.round(previewResult.target_kcal_per_person)} kcal / Person
                    {kcalPercent != null && ` (${kcalPercent}%)`}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    {previewResult.cost_per_person != null && previewResult.cost_total != null
                      ? `${formatNumber(previewResult.cost_per_person, { maxDecimals: 2 })} €/P. (${formatNumber(previewResult.cost_total, { maxDecimals: 2 })} €)`
                      : 'Kostenangabe unvollständig'}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{previewPending ? 'Berechne Vorschau…' : ''}</span>
              )}
            </div>
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border px-4 py-2 text-caption font-semibold hover:bg-muted"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveBuffet.isPending || isLoading || !template || !catalog || Boolean(templatesError || stateError || catalogError)}
                data-testid="buffet-save"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-caption font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saveBuffet.isPending ? 'Speichert…' : 'Buffet übernehmen'}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RoleSection({
  role,
  state,
  customItems,
  search,
  filters,
  mealType,
  onSearchChange,
  onToggleItem,
  onAmountChange,
  onToggleExpanded,
}: {
  role: BuffetCatalogRole;
  state: RoleFormState | undefined;
  customItems: BuffetCatalogItem[];
  search: string;
  filters: BuffetSearchFilters;
  mealType: string;
  onSearchChange: (value: string) => void;
  onToggleItem: (item: BuffetCatalogItem) => void;
  onAmountChange: (amount: number) => void;
  onToggleExpanded: () => void;
}) {
  const expanded = state?.expanded ?? role.enabled_by_default;
  const selected = state?.selected ?? new Set<SelectionKey>();
  const favoriteKeys = new Set(role.items.map(itemKey));
  const selectedCustomItems = customItems.filter((item) => selected.has(itemKey(item)) && !favoriteKeys.has(itemKey(item)));
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const searchQuery = useBuffetCatalogSearch(
    {
      q: debouncedSearch,
      role: role.role.slug,
      mealType,
      kind: filters.kind,
      recipeType: filters.recipeType || undefined,
      includeNonStandalone: filters.includeNonStandalone,
      excludeAlcohol: filters.excludeAlcohol,
    },
    { enabled: expanded && debouncedSearch.length >= 2 },
  );
  const searchPending = expanded && search.trim().length >= 2 && (search.trim() !== debouncedSearch || searchQuery.isFetching);
  const searchResults = (searchQuery.data ?? []).filter((item) => !favoriteKeys.has(`${item.kind}:${item.id}`));

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card" data-testid={`buffet-role-${role.role.slug}`}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <h4 className="truncate font-display text-body font-bold text-foreground">{role.role.name}</h4>
          {selected.size > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold text-primary">{selected.size}</span>}
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
        {role.amount_per_person != null && (
          <label className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
            <input
              type="number"
              min={0.1}
              step={role.unit === 'ml' ? 10 : 5}
              value={state?.amount ?? role.amount_per_person}
              onChange={(event) => onAmountChange(Number(event.target.value))}
              className="w-16 rounded-lg border border-border bg-background px-1.5 py-1 text-right text-caption"
              aria-label={`Menge pro Person für ${role.role.name}`}
            />
            {role.unit}/P.
          </label>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Weitere hinzufügen…"
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-body"
              aria-label={`Weitere Zutaten oder Rezepte für ${role.role.name} hinzufügen`}
            />
          </div>

          {role.items.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label={`Favoriten für ${role.role.name}`}>
              {role.items.map((item) => (
                <ItemChip key={itemKey(item)} item={item} selected={selected.has(itemKey(item))} favorite onToggle={onToggleItem} />
              ))}
            </div>
          )}
          {selectedCustomItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-caption font-semibold text-muted-foreground">Eigene Auswahl</p>
              <div className="flex flex-wrap gap-2">
                {selectedCustomItems.map((item) => (
                  <ItemChip key={itemKey(item)} item={item} selected favorite={false} onToggle={onToggleItem} />
                ))}
              </div>
            </div>
          )}

          {search.trim().length < 2 ? (
            <p className="text-caption text-muted-foreground">Mindestens zwei Zeichen eingeben, um alle sichtbaren Zutaten und Rezepte zu durchsuchen.</p>
          ) : searchPending ? (
            <p className="text-caption text-muted-foreground" role="status">Suche im Katalog…</p>
          ) : searchQuery.error ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-border bg-danger-soft p-3 text-caption text-danger" role="alert">
              <span>Die Suche ist fehlgeschlagen.</span>
              <button type="button" onClick={() => void searchQuery.refetch()} className="font-semibold underline underline-offset-2">Erneut versuchen</button>
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-caption text-muted-foreground" role="status">Nichts gefunden. Erweitere die Suche über die Filter.</p>
          ) : (
            <ul className="space-y-2" aria-label={`Suchergebnisse für ${role.role.name}`}>
              {searchResults.map((result) => {
                const item: BuffetCatalogItem = {
                  kind: result.kind,
                  id: result.id,
                  name: result.name,
                  energy_kcal_per_100g: result.energy_kcal_per_100g,
                  price_per_kg: result.price_per_kg,
                  weight_per_serving_g: result.weight_per_serving_g,
                  default_selected: false,
                };
                const isSelected = selected.has(itemKey(item));
                return (
                  <li key={itemKey(item)}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onToggleItem(item)}
                      className={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
                          {result.kind === 'ingredient' ? 'Zutat' : 'Rezept'}
                        </span>
                        <span className="truncate text-body font-semibold text-foreground">{result.name}</span>
                        {!result.is_favorite && <span className="shrink-0 rounded-full bg-info-soft px-2 py-0.5 text-caption text-info">Eigene Auswahl</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-caption text-muted-foreground">
                        <span>{result.energy_kcal_per_100g == null ? 'kcal –' : `${formatNumber(result.energy_kcal_per_100g, { maxDecimals: 0 })} kcal/100 g`}</span>
                        <span>{result.price_per_kg == null ? 'Preis –' : `${formatNumber(result.price_per_kg, { maxDecimals: 2 })} €/kg`}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function ItemChip({
  item,
  selected,
  favorite,
  onToggle,
}: {
  item: BuffetCatalogItem;
  selected: boolean;
  favorite: boolean;
  onToggle: (item: BuffetCatalogItem) => void;
}) {
  return (
    <button
      key={itemKey(item)}
      type="button"
      onClick={() => onToggle(item)}
      aria-pressed={selected}
      className={`flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1.5 text-caption font-semibold transition-colors ${
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      }`}
    >
      <span className="truncate">{item.name}</span>
      {!favorite && <span className="rounded-full bg-info-soft px-1.5 py-0.5 text-caption text-info">Eigene</span>}
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}
