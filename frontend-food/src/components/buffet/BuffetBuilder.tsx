import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutGrid, Save, Search, TriangleAlert } from 'lucide-react';
import { notify } from '@/lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useBuffetTemplates,
  useBuffetCatalog,
  useBuffetCatalogSearch,
  useBuffetState,
  useBuffetPreview,
  useSaveBuffet,
} from '@/api/buffet';
import type { BuffetCatalogItem, BuffetCatalogRole, BuffetTemplate } from '@/schemas/buffet';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { formatNumber } from '@/lib/format';
import { rebalanceShares } from '@/lib/breakfastCalc';
import { Icon } from '@/components/ui/icon';
import { buffetRoleName } from '@/lib/buffetRoles';
import ShareSlider from '@/components/shared/ShareSlider';
import { WizardProgress } from '@/components/shared/WizardProgress';

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

interface ItemShareState {
  sharePercent: number;
  locked: boolean;
}

interface RoleFormState {
  expanded: boolean;
  selected: Set<SelectionKey>;
  shares: Record<SelectionKey, ItemShareState>;
  amount: number;
}

type BuffetBuilderStep = 'preset' | 'configure' | 'review';

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
const WIZARD_STEPS = [
  { id: 'preset', label: 'Variante' },
  { id: 'configure', label: 'Zusammenstellen' },
  { id: 'review', label: 'Prüfen' },
] as const;
const FEATURED_PRESET_SLUGS: Record<string, string[]> = {
  breakfast: ['breakfast'],
  drinks: ['house-trip-juices', 'camp-lemon-tea'],
};

function normalizeShares(
  keys: SelectionKey[],
  previous: Record<SelectionKey, ItemShareState>,
  addedKey?: SelectionKey,
): Record<SelectionKey, ItemShareState> {
  if (keys.length === 0) return {};
  if (keys.length === 1) return { [keys[0]]: { sharePercent: 100, locked: previous[keys[0]]?.locked ?? false } };

  const items = keys.map((key) => ({
    sharePercent: previous[key]?.sharePercent ?? 0,
    locked: previous[key]?.locked ?? false,
  }));
  const lockedTotal = items.filter((item) => item.locked).reduce((total, item) => total + item.sharePercent, 0);
  const available = Math.max(0, 100 - lockedTotal);
  let changedIndex: number;
  let changedValue: number;

  if (addedKey) {
    changedIndex = keys.indexOf(addedKey);
    if (changedIndex < 0) return {};
    const otherUnlockedCount = items.filter((item, index) => index !== changedIndex && !item.locked).length;
    changedValue = otherUnlockedCount === 0
      ? available
      : Math.min(Math.floor(100 / keys.length), available);
  } else {
    const unlockedIndices = items.map((_item, index) => index).filter((index) => !items[index].locked);
    if (unlockedIndices.length === 0) {
      return Object.fromEntries(keys.map((key, index) => [key, items[index]]));
    }
    changedIndex = unlockedIndices[0];
    const unlockedTotal = unlockedIndices.reduce((total, index) => total + items[index].sharePercent, 0);
    changedValue = unlockedIndices.length === 1
      ? available
      : unlockedTotal <= 0
        ? Math.floor(available / unlockedIndices.length)
        : items[changedIndex].sharePercent;
  }

  const rebalanced = rebalanceShares(items, changedIndex, changedValue);
  return Object.fromEntries(keys.map((key, index) => [key, rebalanced[index]]));
}

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
    return (allTemplates ?? [])
      .filter((candidate) => candidate.meal_types.includes(mealType) && candidate.slug !== 'free')
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  }, [allTemplates, mealType]);
  const featuredTemplates = useMemo(() => {
    const bySlug = new Map(templatesForMealType.map((candidate) => [candidate.slug, candidate]));
    const requested = (FEATURED_PRESET_SLUGS[mealType] ?? []).flatMap((slug) => {
      const candidate = bySlug.get(slug);
      return candidate ? [candidate] : [];
    });
    const fallback = templatesForMealType.filter((candidate) => !requested.some((item) => item.id === candidate.id));
    return [...requested, ...fallback].slice(0, 6);
  }, [templatesForMealType, mealType]);
  const otherTemplates = useMemo(() => {
    const featuredIds = new Set(featuredTemplates.map((candidate) => candidate.id));
    return (allTemplates ?? []).filter(
      (candidate) => candidate.slug !== 'free' && !featuredIds.has(candidate.id),
    );
  }, [allTemplates, featuredTemplates]);
  const freeTemplate = (allTemplates ?? []).find((candidate) => candidate.slug === 'free') ?? null;

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [wizardStep, setWizardStep] = useState<BuffetBuilderStep>('preset');
  const [manualItemsPolicy, setManualItemsPolicy] = useState<'preserve' | 'replace'>('preserve');
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
      setWizardStep('preset');
      setManualItemsPolicy('preserve');
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
      setWizardStep('configure');
      return;
    }
    setTemplateId(null);
    setWizardStep('preset');
  }, [open, savedState, allTemplates, templateId]);

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
      const savedShares: Record<SelectionKey, ItemShareState> = {};
      if (restoreThisTemplate) {
        for (const selection of savedState?.selections ?? []) {
          if (selection.role_slug !== role.role.slug) continue;
          const id = selection.kind === 'ingredient' ? selection.ingredient_id : selection.recipe_id;
          if (id == null) continue;
          const key = `${selection.kind}:${id}`;
          selected.add(key);
          savedShares[key] = { sharePercent: selection.share_percent, locked: false };
          if (!role.items.some((item) => itemKey(item) === key)) {
            const customItem: BuffetCatalogItem = {
              kind: selection.kind,
              id,
              name: selection.name,
              energy_kcal_per_100g: selection.energy_kcal_per_100g,
              price_per_kg: selection.price_per_kg,
              weight_per_serving_g: selection.weight_per_serving_g,
              is_favorite: false,
              is_template_default: false,
              role_slugs: [],
              default_selected: false,
            };
            nextCustomItems[role.role.slug] = [...(nextCustomItems[role.role.slug] ?? []), customItem];
          }
        }
      } else if (role.enabled_by_default) {
        const configuredDefaults = role.items.filter((item) => item.default_selected);
        const fallbackFavorite = role.items.find((item) => item.is_favorite);
        const initialItems = configuredDefaults.length > 0 ? configuredDefaults : fallbackFavorite ? [fallbackFavorite] : [];
        for (const item of initialItems) selected.add(itemKey(item));
      }
      const amount =
        (restoreThisTemplate ? savedState?.role_amounts?.[role.role.slug] : undefined) ?? role.amount_per_person ?? 0;
      next[role.role.slug] = {
        expanded: restoreThisTemplate ? selected.size > 0 : role.enabled_by_default,
        selected,
        shares: normalizeShares([...selected], savedShares),
        amount,
      };
    }
    setRoleStates(next);
    setCustomItemsByRole(nextCustomItems);
  }, [catalog, template, savedState]);

  const buildSelections = () => {
    const selections: { role_slug: string; ingredient_id?: number | null; recipe_id?: number | null; share_percent: number }[] = [];
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
          share_percent: state.shares[key]?.sharePercent ?? 100 / state.selected.size,
        });
      }
    }
    return { selections, roleAmounts };
  };

  const retryPreview = () => {
    if (!template) return;
    const { selections, roleAmounts } = buildSelections();
    preview({ templateId: template.id, selections, roleAmounts, manualItemsPolicy });
  };

  useEffect(() => {
    if (!template || seededTemplateRef.current !== template.id || Object.keys(roleStates).length === 0) return;
    const { selections, roleAmounts } = buildSelections();
    preview({ templateId: template.id, selections, roleAmounts, manualItemsPolicy });
    // buildSelections reads roleStates/template; re-run whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleStates, template, preview, manualItemsPolicy]);

  const toggleItem = (roleSlug: string, item: BuffetCatalogItem) => {
    const key = itemKey(item);
    const isCatalogItem = catalog?.roles
      .find((role) => role.role.slug === roleSlug)
      ?.items.some((candidate) => itemKey(candidate) === key) ?? false;
    const wasSelected = roleStates[roleSlug]?.selected.has(key) ?? false;

    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      const next = new Set(state.selected);
      const nextShares = { ...state.shares };
      if (next.has(key)) {
        next.delete(key);
        delete nextShares[key];
        return {
          ...current,
          [roleSlug]: { ...state, selected: next, shares: normalizeShares([...next], nextShares) },
        };
      }
      next.add(key);
      nextShares[key] = { sharePercent: 0, locked: false };
      return {
        ...current,
        [roleSlug]: { ...state, selected: next, shares: normalizeShares([...next], nextShares, key) },
      };
    });

    if (!isCatalogItem) {
      setCustomItemsByRole((current) => {
        const roleItems = current[roleSlug] ?? [];
        const nextItems = wasSelected
          ? roleItems.filter((candidate) => itemKey(candidate) !== key)
          : roleItems.some((candidate) => itemKey(candidate) === key)
            ? roleItems
            : [...roleItems, { ...item, default_selected: false, is_template_default: false }];
        return { ...current, [roleSlug]: nextItems };
      });
    }
  };

  const setItemShare = (roleSlug: string, key: SelectionKey, value: number) => {
    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      const keys = [...state.selected];
      const index = keys.indexOf(key);
      if (index < 0) return current;
      const shares = keys.map((itemKeyValue) => ({
        sharePercent: state.shares[itemKeyValue]?.sharePercent ?? 0,
        locked: state.shares[itemKeyValue]?.locked ?? false,
      }));
      const rebalanced = rebalanceShares(shares, index, value);
      const nextShares = Object.fromEntries(keys.map((itemKeyValue, itemIndex) => [itemKeyValue, {
        sharePercent: rebalanced[itemIndex].sharePercent,
        locked: rebalanced[itemIndex].locked,
      }]));
      return { ...current, [roleSlug]: { ...state, shares: nextShares } };
    });
  };

  const toggleItemShareLock = (roleSlug: string, key: SelectionKey) => {
    setRoleStates((current) => {
      const state = current[roleSlug];
      const share = state?.shares[key];
      if (!state || !share) return current;
      return {
        ...current,
        [roleSlug]: { ...state, shares: { ...state.shares, [key]: { ...share, locked: !share.locked } } },
      };
    });
  };

  const chooseTemplate = (candidate: BuffetTemplate) => {
    setTemplateId(candidate.id);
    setWizardStep('configure');
    setRoleStates({});
    setCustomItemsByRole({});
    seededTemplateRef.current = null;
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

  const handleBack = () => {
    if (wizardStep === 'review') setWizardStep('configure');
    else if (wizardStep === 'configure') {
      resetPreview();
      setWizardStep('preset');
    }
  };

  const handleSave = () => {
    if (!template) return;
    const { selections, roleAmounts } = buildSelections();
    saveBuffet.mutate(
      { templateId: template.id, selections, roleAmounts, manualItemsPolicy },
      {
        onSuccess: () => {
          notify.success('Buffet gespeichert', { description: `${template.name} für ${normPortions} Personen` });
          onSaved?.();
          onOpenChange(false);
        },
        onError: (err) => {
          notify.error('Buffet konnte nicht gespeichert werden', { error: err });
        },
      },
    );
  };

  const isLoading = templatesLoading || stateLoading || (templateId !== null && catalogLoading);
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
              <span>{wizardStep === 'preset' ? 'Buffet auswählen' : wizardStep === 'review' ? 'Buffet prüfen' : (template?.name ?? 'Buffet zusammenstellen')}</span>
              <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {normPortions} {normPortions === 1 ? 'Person' : 'Personen'}
              </span>
            </DialogTitle>

          </div>
          <div className="mt-3"><WizardProgress steps={WIZARD_STEPS} currentStep={wizardStep} /></div>
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
        ) : wizardStep === 'preset' ? (
          <PresetChooser
            mealType={mealType}
            featuredTemplates={featuredTemplates}
            otherTemplates={otherTemplates}
            freeTemplate={freeTemplate}
            onSelect={chooseTemplate}
          />
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
        ) : wizardStep === 'review' ? (
          <div className="space-y-4 p-4 sm:p-6">
            <section className="space-y-3 rounded-xl bg-card p-4 shadow-card">
              <h3 className="font-display text-section font-bold text-foreground">Buffet prüfen</h3>
              <p className="text-body text-muted-foreground">{template.name} · {normPortions} {normPortions === 1 ? 'Person' : 'Personen'}</p>
              {previewPending && <p className="text-caption text-muted-foreground" role="status">Vorschau wird berechnet…</p>}
              {previewError && <p className="text-caption text-danger" role="alert">Die Vorschau ist fehlgeschlagen. Bitte zurückgehen und erneut versuchen.</p>}
              {previewResult && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {previewResult.items.map((item) => (
                    <li key={`${item.role_slug}-${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-body">
                      <span>{item.name} <span className="text-caption text-muted-foreground">({buffetRoleName(item.role_slug)})</span></span>
                      <span className="text-caption text-muted-foreground">
                        {formatNumber(item.amount_per_person, { maxDecimals: 1 })} {item.unit}/P. · {Math.round(item.share_percent)} %
                      </span>
                    </li>
                  ))}
                  {previewResult.items.length === 0 && <li className="p-3 text-caption text-muted-foreground">Noch keine Items ausgewählt.</li>}
                </ul>
              )}
              {savedState && savedState.manual_item_count > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-body font-semibold text-foreground">Manuelle Mahlzeit-Einträge</legend>
                  {([
                    ['preserve', 'Manuelle Einträge beibehalten'],
                    ['replace', 'Manuelle Einträge durch das Buffet ersetzen'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-body">
                      <input
                        type="radio"
                        name="manual-items-policy"
                        value={value}
                        checked={manualItemsPolicy === value}
                        onChange={() => setManualItemsPolicy(value)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              )}
              {previewResult?.warnings.map((warning, index) => (
                <p key={`review-warning-${index}`} className="text-caption text-warning">{warning.message}</p>
              ))}
            </section>
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
                onShareChange={(key, value) => setItemShare(role.role.slug, key, value)}
                onShareLock={(key) => toggleItemShareLock(role.role.slug, key)}
                onToggleExpanded={() => toggleExpanded(role.role.slug)}
              />
            ))}
          </div>
        )}

        {wizardStep !== 'preset' && (
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
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border px-4 py-2 text-caption font-semibold hover:bg-muted"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-border px-4 py-2 text-caption font-semibold hover:bg-muted"
              >
                Zurück
              </button>
              {wizardStep === 'configure' && (
                <button
                  type="button"
                  onClick={() => setWizardStep('review')}
                  disabled={!template || !catalog || Boolean(templatesError || stateError || catalogError)}
                  className="rounded-lg bg-primary px-4 py-2 text-caption font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Prüfen
                </button>
              )}
              {wizardStep === 'review' && (
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
              )}
            </div>
          </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PresetChooser({
  mealType,
  featuredTemplates,
  otherTemplates,
  freeTemplate,
  onSelect,
}: {
  mealType: string;
  featuredTemplates: BuffetTemplate[];
  otherTemplates: BuffetTemplate[];
  freeTemplate: BuffetTemplate | null;
  onSelect: (template: BuffetTemplate) => void;
}) {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="space-y-1">
        <h3 className="font-display text-section font-bold text-foreground">Wähle ein fertiges Buffet</h3>
        <p className="text-body text-muted-foreground">Alle Mengen und Produkte lassen sich im nächsten Schritt anpassen.</p>
      </div>
      {featuredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="buffet-featured-presets">
          {featuredTemplates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelect(candidate)}
              className="space-y-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-body font-semibold text-foreground">
                <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
                {candidate.name}
              </span>
              {candidate.description && <span className="block text-caption text-muted-foreground">{candidate.description}</span>}
              <span className="flex flex-wrap gap-1.5">
                {candidate.roles.slice(0, 5).map((role) => (
                  <span key={role.role.slug} className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
                    {buffetRoleName(role.role.slug)}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/20 p-4 text-body text-muted-foreground" role="status">
          Für diesen Mahlzeitentyp gibt es noch keine hervorgehobene Vorlage.
        </p>
      )}
      {freeTemplate && (
        <button
          type="button"
          onClick={() => onSelect(freeTemplate)}
          data-testid="buffet-free-preset"
          className="w-full rounded-xl border-2 border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        >
          <span className="block text-body font-bold text-primary">Freies Buffet</span>
          <span className="mt-1 block text-caption text-muted-foreground">Alle Rollen sind verfügbar; stelle die Auswahl selbst zusammen.</span>
        </button>
      )}
      {!freeTemplate && (
        <p className="text-caption text-warning" role="alert">Die universelle Vorlage „Freies Buffet“ ist nicht verfügbar.</p>
      )}
      {otherTemplates.length > 0 && (
        <details className="rounded-xl bg-card p-4 shadow-card" data-testid="buffet-other-presets">
          <summary className="cursor-pointer text-body font-semibold text-foreground">Weitere Vorlagen</summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {otherTemplates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelect(candidate)}
                className="rounded-lg border border-border p-3 text-left text-body hover:border-primary hover:bg-primary/5"
              >
                <span className="block font-semibold text-foreground">{candidate.name}</span>
                <span className="text-caption text-muted-foreground">{candidate.meal_types.join(', ')}</span>
              </button>
            ))}
          </div>
        </details>
      )}
      <p className="text-caption text-muted-foreground">Mahlzeitentyp: {mealType}</p>
    </div>
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
  onShareChange,
  onShareLock,
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
  onShareChange: (key: SelectionKey, value: number) => void;
  onShareLock: (key: SelectionKey) => void;
  onToggleExpanded: () => void;
}) {
  const expanded = state?.expanded ?? role.enabled_by_default;
  const selected = state?.selected ?? new Set<SelectionKey>();
  const roleItemKeys = new Set(role.items.map(itemKey));
  const selectedCustomItems = customItems.filter((item) => selected.has(itemKey(item)) && !roleItemKeys.has(itemKey(item)));
  const favoriteItems = role.items.filter((item) => item.is_favorite);
  const templateDefaultItems = role.items.filter((item) => !item.is_favorite);
  const itemByKey = new Map([...role.items, ...customItems].map((item) => [itemKey(item), item]));
  const selectedItems = [...selected].flatMap((key) => {
    const item = itemByKey.get(key);
    return item ? [{ key, item }] : [];
  });
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
  const searchResults = (searchQuery.data ?? []).filter((item) => !roleItemKeys.has(`${item.kind}:${item.id}`));

  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-card" data-testid={`buffet-role-${role.role.slug}`}>
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
          {role.amount_per_person != null && (
            <label className="flex flex-col gap-1 text-caption text-muted-foreground">
              <span>Menge pro Person: {formatNumber(state?.amount ?? role.amount_per_person, { maxDecimals: 0 })} {role.unit}</span>
              <input
                type="range"
                min={role.unit === 'ml' ? 25 : 5}
                max={Math.max(role.amount_per_person * 3, role.unit === 'ml' ? 500 : 300)}
                step={role.unit === 'ml' ? 10 : 5}
                value={state?.amount ?? role.amount_per_person}
                onChange={(event) => onAmountChange(Number(event.target.value))}
                className="w-full accent-primary"
                aria-label={`Menge pro Person für ${role.role.name}`}
              />
            </label>
          )}
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

          {favoriteItems.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label={`Favoriten für ${role.role.name}`}>
              {favoriteItems.map((item) => (
                <ItemChip key={itemKey(item)} item={item} selected={selected.has(itemKey(item))} favorite onToggle={onToggleItem} />
              ))}
            </div>
          )}
          {templateDefaultItems.length > 0 && (
            <div className="space-y-1">
              <p className="text-caption font-semibold text-muted-foreground">Vorauswahl dieser Variante</p>
              <div className="flex flex-wrap gap-2">
                {templateDefaultItems.map((item) => (
                  <ItemChip key={itemKey(item)} item={item} selected={selected.has(itemKey(item))} favorite={false} onToggle={onToggleItem} />
                ))}
              </div>
            </div>
          )}
          {selectedItems.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-caption font-semibold text-foreground">Anteile innerhalb von {role.role.name}</p>
              {selectedItems.map(({ key, item }) => (
                <ShareSlider
                  key={key}
                  label={item.name}
                  value={state?.shares[key]?.sharePercent ?? 0}
                  locked={state?.shares[key]?.locked ?? false}
                  onChange={(value) => onShareChange(key, value)}
                  onToggleLock={() => onShareLock(key)}
                />
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
                  is_favorite: result.is_favorite,
                  is_template_default: false,
                  role_slugs: result.role_slugs,
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
      {!favorite && (
        <span className="rounded-full bg-info-soft px-1.5 py-0.5 text-caption text-info">
          {item.is_template_default ? 'Vorlage' : 'Eigene'}
        </span>
      )}
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}
