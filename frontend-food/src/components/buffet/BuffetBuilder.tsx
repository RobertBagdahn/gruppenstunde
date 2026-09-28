import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutGrid, Save, Search, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBuffetTemplates, useBuffetCatalog, useBuffetState, useBuffetPreview, useSaveBuffet } from '@/api/buffet';
import type { BuffetCatalogItem, BuffetCatalogRole } from '@/schemas/buffet';
import { formatNumber } from '@/lib/format';

interface BuffetBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanId: number;
  mealId: number;
  mealType: string;
  normPortions?: number;
  onSaved?: () => void;
}

/** Selection key: `${kind}:${id}`, e.g. "ingredient:5" or "recipe:12". */
type SelectionKey = string;

function itemKey(item: BuffetCatalogItem): SelectionKey {
  return `${item.kind}:${item.id}`;
}

interface RoleFormState {
  expanded: boolean;
  selected: Set<SelectionKey>;
  amount: number;
}

const SEARCH_THRESHOLD = 8;

export function BuffetBuilder({
  open,
  onOpenChange,
  mealPlanId,
  mealId,
  mealType,
  normPortions = 1,
  onSaved,
}: BuffetBuilderProps) {
  const { data: allTemplates, isLoading: templatesLoading } = useBuffetTemplates(undefined, { enabled: open });
  const { data: savedState } = useBuffetState(mealPlanId, mealId, { enabled: open });

  const templatesForMealType = useMemo(
    () => (allTemplates ?? []).filter((t) => t.meal_types.includes(mealType)),
    [allTemplates, mealType],
  );

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [roleStates, setRoleStates] = useState<Record<string, RoleFormState>>({});
  const [roleSearch, setRoleSearch] = useState<Record<string, string>>({});
  const restoredRef = useRef(false);
  const seededTemplateRef = useRef<number | null>(null);

  // Reset per-dialog-open so a fresh restore/default selection happens each time.
  useEffect(() => {
    if (open) {
      restoredRef.current = false;
      seededTemplateRef.current = null;
    } else {
      setTemplateId(null);
      setRoleStates({});
      setRoleSearch({});
    }
  }, [open]);

  // Pick the template: restore the saved one if present, else the first for this meal type.
  useEffect(() => {
    if (!open || restoredRef.current || templateId !== null) return;
    if (savedState === undefined || allTemplates === undefined) return;
    restoredRef.current = true;
    if (savedState.template_id && allTemplates.some((t) => t.id === savedState.template_id)) {
      setTemplateId(savedState.template_id);
    } else if (templatesForMealType.length > 0) {
      setTemplateId(templatesForMealType[0].id);
    }
  }, [open, savedState, allTemplates, templatesForMealType, templateId]);

  const template = useMemo(
    () => (allTemplates ?? []).find((t) => t.id === templateId) ?? null,
    [allTemplates, templateId],
  );
  const { data: catalog, isLoading: catalogLoading } = useBuffetCatalog(template?.slug ?? null, { enabled: open });

  // Seed role state from the catalog (default selections, amounts, expanded) once per template,
  // restoring the saved selection/amounts when they match this template.
  useEffect(() => {
    if (!catalog || !template || seededTemplateRef.current === template.id) return;
    seededTemplateRef.current = template.id;
    const restoreThisTemplate = savedState?.template_id === template.id;
    const next: Record<string, RoleFormState> = {};
    for (const role of catalog.roles) {
      const selected = new Set<SelectionKey>();
      if (restoreThisTemplate) {
        for (const sel of savedState?.selections ?? []) {
          if (sel.role_slug !== role.role.slug) continue;
          if (sel.ingredient_id != null) selected.add(`ingredient:${sel.ingredient_id}`);
          else if (sel.recipe_id != null) selected.add(`recipe:${sel.recipe_id}`);
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
  }, [catalog, template, savedState]);

  const { preview, result: previewResult, isPending: previewPending } = useBuffetPreview(mealPlanId, mealId);
  const saveBuffet = useSaveBuffet(mealPlanId, mealId);

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

  // Live preview on every selection/amount change.
  useEffect(() => {
    if (!template || Object.keys(roleStates).length === 0) return;
    const { selections, roleAmounts } = buildSelections();
    preview({ templateId: template.id, selections, roleAmounts });
    // buildSelections reads roleStates/template; re-run whenever either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleStates, template, preview]);

  const toggleItem = (roleSlug: string, item: BuffetCatalogItem) => {
    setRoleStates((current) => {
      const state = current[roleSlug];
      if (!state) return current;
      const next = new Set(state.selected);
      const key = itemKey(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...current, [roleSlug]: { ...state, selected: next } };
    });
  };

  const setAmount = (roleSlug: string, amount: number) => {
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

  const isLoading = templatesLoading || catalogLoading;
  const kcalPercent = previewResult
    ? Math.round((previewResult.energy_kcal_per_person / Math.max(previewResult.target_kcal_per_person, 1)) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-display font-bold text-foreground">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <span>Buffet zusammenstellen</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {normPortions} {normPortions === 1 ? 'Person' : 'Personen'}
              </span>
            </DialogTitle>
            {templatesForMealType.length > 0 && (
              <Select
                value={templateId != null ? String(templateId) : ''}
                onValueChange={(value) => {
                  setTemplateId(Number(value));
                  seededTemplateRef.current = null;
                }}
              >
                <SelectTrigger className="w-full sm:w-56 h-9 text-sm" data-testid="buffet-template-select">
                  <SelectValue placeholder="Vorlage wählen" />
                </SelectTrigger>
                <SelectContent>
                  {templatesForMealType.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </DialogHeader>

        {isLoading || !catalog || !template ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Lade Buffet-Katalog...</div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {catalog.roles.map((role) => (
              <RoleSection
                key={role.role.slug}
                role={role}
                state={roleStates[role.role.slug]}
                search={roleSearch[role.role.slug] ?? ''}
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
          {previewResult && previewResult.warnings.length > 0 && (
            <div className="space-y-1">
              {previewResult.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1.5"
                >
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              {previewResult ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      kcalPercent != null && kcalPercent < 80 ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-amber-500">
                      local_fire_department
                    </span>
                    {Math.round(previewResult.energy_kcal_per_person)} / {Math.round(previewResult.target_kcal_per_person)} kcal / Person
                    {kcalPercent != null && ` (${kcalPercent}%)`}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">
                    {formatNumber(previewResult.cost_per_person, { maxDecimals: 2 })} €/P. ({formatNumber(previewResult.cost_total, { maxDecimals: 2 })} €)
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{previewPending ? 'Berechnet Vorschau...' : ''}</span>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveBuffet.isPending || isLoading || !template}
                data-testid="buffet-save"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveBuffet.isPending ? 'Speichert...' : 'Buffet übernehmen'}</span>
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
  search,
  onSearchChange,
  onToggleItem,
  onAmountChange,
  onToggleExpanded,
}: {
  role: BuffetCatalogRole;
  state: RoleFormState | undefined;
  search: string;
  onSearchChange: (value: string) => void;
  onToggleItem: (item: BuffetCatalogItem) => void;
  onAmountChange: (amount: number) => void;
  onToggleExpanded: () => void;
}) {
  const expanded = state?.expanded ?? role.enabled_by_default;
  const selectedCount = state?.selected.size ?? 0;
  const filteredItems = search.trim()
    ? role.items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    : role.items;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid={`buffet-role-${role.role.slug}`}>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h4 className="font-display font-bold text-sm text-foreground">{role.role.name}</h4>
          {selectedCount > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {selectedCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {role.amount_per_person != null && (
            <label className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min={0.1}
                step={role.unit === 'ml' ? 10 : 5}
                value={state?.amount ?? role.amount_per_person}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                className="w-16 px-1.5 py-1 rounded border border-border bg-background text-xs text-right"
                aria-label={`Menge pro Person für ${role.role.name}`}
              />
              {role.unit}/P.
            </label>
          )}
          <span className="material-symbols-outlined text-[18px] text-muted-foreground">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {role.items.length > SEARCH_THRESHOLD && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs"
              />
            </div>
          )}
          {filteredItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Keine Einträge gefunden.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredItems.map((item) => {
                const active = state?.selected.has(itemKey(item)) ?? false;
                return (
                  <button
                    key={itemKey(item)}
                    type="button"
                    onClick={() => onToggleItem(item)}
                    className={`px-2.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1 transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate max-w-[16rem]">{item.name}</span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
