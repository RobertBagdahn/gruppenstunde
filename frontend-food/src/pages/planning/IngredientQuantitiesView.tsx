/**
 * Plan-wide ingredient quantities (meal-plan-ingredient-quantities spec).
 *
 * Lists every ingredient of the plan with its total and the contribution of
 * each meal/recipe. Editors adjust single lines or a whole ingredient; all
 * changes are stored as plan overrides — the recipe itself never changes.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Info, RotateCcw, Scale, Search, SlidersHorizontal } from 'lucide-react';
import {
  useAdjustIngredientQuantity,
  useIngredientQuantities,
  useSetMealItemOverrideLine,
  useUpdateMealItem,
} from '@/api/mealPlans';
import type {
  IngredientQuantity,
  IngredientQuantityAdjustIn,
  IngredientQuantityLine,
} from '@/schemas/mealPlan';
import QuerySection from '@/components/shared/QuerySection';
import EmptyState from '@/components/shared/EmptyState';
import { CardTable } from '@/components/shared/CardTable';
import { DecimalInput } from '@/components/ui/DecimalInput';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { formatNumber, formatWeight } from '@/lib/format';
import { notify, UNDO_DURATION_MS } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput';

const GRAM_UNIT = 'g';
const KILOGRAM_UNIT = 'kg';

interface IngredientQuantitiesViewProps {
  mealPlanId: number;
  canEdit: boolean;
}

/** Lines whose quantity a plan-wide adjustment may change. */
export function isAdjustableLine(line: IngredientQuantityLine): boolean {
  return line.kind === 'recipe' && line.editable && !line.excluded && line.net_quantity_g > 0;
}

/** Net grams that a plan-wide adjustment cannot change. */
export function fixedShareG(item: IngredientQuantity): number {
  const adjustable = item.lines.filter(isAdjustableLine).reduce((sum, line) => sum + line.net_quantity_g, 0);
  return Math.max(0, item.net_quantity_g - adjustable);
}

/** Names starting with an amount ("100g Zitrone", "1/2 Stück") read wrong after a count. */
const AMOUNT_NAMED_PORTION = /^\d/;

function defaultUnit(item: IngredientQuantity) {
  const countable = item.unit_options.filter((option) => !AMOUNT_NAMED_PORTION.test(option.name));
  return countable.find((option) => option.is_default) ?? countable[0] ?? null;
}

/** "2,3 kg · ≈ 15 Stück" for a net gram amount. */
export function formatNetAmount(item: IngredientQuantity, netG: number): string {
  if (!item.has_trusted_weight && item.piece_equivalent) {
    return `≈ ${formatNumber(item.piece_equivalent.count)} ${item.piece_equivalent.portion_name}`;
  }
  const weight = formatWeight(netG);
  const unit = defaultUnit(item);
  if (!unit || netG <= 0) return weight;
  return `${weight} · ≈ ${formatNumber(netG / unit.weight_g)} ${unit.name}`;
}

function formatPerPerson(line: IngredientQuantityLine): string {
  return `${formatNumber(line.quantity_per_person, { maxDecimals: 3 })} ${line.unit_label}`.trim();
}

export default function IngredientQuantitiesView({ mealPlanId, canEdit }: IngredientQuantitiesViewProps) {
  const query = useIngredientQuantities(mealPlanId);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const onlyAdjusted = searchParams.get('adjusted') === '1';
  const [adjusting, setAdjusting] = useState<IngredientQuantity | null>(null);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const filter = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (items: IngredientQuantity[]) =>
      items.filter(
        (item) =>
          (!needle || item.ingredient_name.toLowerCase().includes(needle)) && (!onlyAdjusted || item.is_adjusted),
      );
  }, [search, onlyAdjusted]);

  return (
    <div className="space-y-4">
      <p className="text-body text-muted-foreground">
        Alle Zutaten des Plans mit ihrem Anteil je Mahlzeit. Änderungen gelten nur für diesen Plan – die Rezepte
        bleiben unverändert. Einkaufsliste, Kosten und Zeitplan rechnen automatisch mit.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Zutat suchen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => updateParam('q', event.target.value || null)}
            placeholder="Zutat suchen"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-body"
          />
        </label>
        <button
          type="button"
          onClick={() => updateParam('adjusted', onlyAdjusted ? null : '1')}
          aria-pressed={onlyAdjusted}
          className={cn(
            'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-body font-medium transition-colors',
            onlyAdjusted ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Nur angepasste
        </button>
      </div>

      <QuerySection
        query={query}
        skeleton={<SkeletonTableRows rows={6} columns={2} label="Mengen werden geladen" />}
        errorTitle="Mengen konnten nicht geladen werden"
        isEmpty={(items) => items.length === 0}
        empty={
          <EmptyState
            icon="scale"
            title="Noch keine Zutaten"
            description="Sobald der Plan Rezepte oder Zutaten enthält, siehst du hier die Mengen."
          />
        }
      >
        {(items) => {
          const visible = filter(items);
          if (visible.length === 0) {
            return <p className="py-8 text-center text-body text-muted-foreground">Keine passenden Zutaten.</p>;
          }
          return (
            <CardTable>
              {visible.map((item) => (
                <IngredientRow
                  key={item.ingredient_id}
                  item={item}
                  mealPlanId={mealPlanId}
                  canEdit={canEdit}
                  onAdjust={() => setAdjusting(item)}
                />
              ))}
            </CardTable>
          );
        }}
      </QuerySection>

      {adjusting && (
        <AdjustDialog
          key={adjusting.ingredient_id}
          item={adjusting}
          mealPlanId={mealPlanId}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}

function IngredientRow({
  item,
  mealPlanId,
  canEdit,
  onAdjust,
}: {
  item: IngredientQuantity;
  mealPlanId: number;
  canEdit: boolean;
  onAdjust: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasReserve = item.total_quantity_g - item.net_quantity_g > 0.5;
  const canAdjust = canEdit && item.lines.some(isAdjustableLine);

  return (
    <div className="rounded-xl bg-card shadow-card" data-testid="ingredient-quantity-row">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <ChevronRight
            className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-emphasis font-semibold text-foreground">{item.ingredient_name}</span>
              {item.is_adjusted && (
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-caption font-medium text-info">angepasst</span>
              )}
            </span>
            <span className="block text-body text-muted-foreground">
              {formatNetAmount(item, item.net_quantity_g)}
              {hasReserve && (
                <span className="text-caption"> · mit Reserve {formatWeight(item.total_quantity_g)}</span>
              )}
            </span>
            <span className="block text-caption text-muted-foreground">
              {item.lines.length === 1 ? '1 Anteil' : `${item.lines.length} Anteile`}
            </span>
          </span>
        </button>
        {canAdjust && (
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary-soft px-3 text-body font-medium text-primary"
          >
            <Scale className="h-4 w-4" />
            Gesamtmenge anpassen
          </button>
        )}
      </div>
      {expanded && (
        <ul className="divide-y divide-border border-t border-border">
          {item.lines.map((line) => (
            <QuantityLineRow
              key={`${line.meal_item_id}-${line.recipe_item_id ?? 'direct'}`}
              line={line}
              mealPlanId={mealPlanId}
              canEdit={canEdit}
            />
          ))}
          {item.ingredient_slug && (
            <li className="px-4 py-2 text-caption">
              <Link to={`/ingredients/${item.ingredient_slug}`} className="text-primary hover:underline">
                Zur Zutat
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function QuantityLineRow({
  line,
  mealPlanId,
  canEdit,
}: {
  line: IngredientQuantityLine;
  mealPlanId: number;
  canEdit: boolean;
}) {
  const setLine = useSetMealItemOverrideLine(mealPlanId);
  const updateItem = useUpdateMealItem(mealPlanId);
  const editable = canEdit && line.editable;
  const isRecipe = line.kind === 'recipe' && line.recipe_item_id !== null;
  const changed = line.is_overridden || line.excluded;

  const saveRecipeLine = (quantityPerPerson: number | null, excluded: boolean) => {
    if (line.recipe_item_id === null) return;
    const isOriginal = quantityPerPerson === null || Math.abs(quantityPerPerson - line.original_quantity_per_person) < 1e-6;
    setLine.mutate(
      {
        itemId: line.meal_item_id,
        recipeItemId: line.recipe_item_id,
        body:
          isOriginal && !excluded
            ? null
            : { quantity_override: isOriginal ? null : quantityPerPerson, excluded },
      },
      { onError: (error) => notify.error('Menge konnte nicht gespeichert werden', { error }) },
    );
  };

  const commitQuantity = (value: number) => {
    if (value <= 0 || Math.abs(value - line.quantity_per_person) < 1e-6) return;
    if (isRecipe) {
      saveRecipeLine(value, line.excluded);
      return;
    }
    updateItem.mutate(
      { itemId: line.meal_item_id, quantity: value },
      { onError: (error) => notify.error('Menge konnte nicht gespeichert werden', { error }) },
    );
  };

  return (
    <li className={cn('flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between', line.excluded && 'opacity-60')}>
      <div className="min-w-0">
        <p className="text-body font-medium text-foreground">
          {line.recipe_title}
          {line.is_overridden && !line.excluded && <span className="ml-2 text-caption font-normal text-info">angepasst</span>}
          {line.excluded && <span className="ml-2 text-caption font-normal text-muted-foreground">weggelassen</span>}
        </p>
        <p className="text-caption text-muted-foreground">
          {line.meal_label} · {formatNumber(line.effective_portions)} Pers.
          {line.factor !== 1 && ` · Faktor ×${formatNumber(line.factor)}`}
        </p>
        {line.is_overridden && (
          <p className="text-caption text-muted-foreground">
            Rezept: {formatNumber(line.original_quantity_per_person, { maxDecimals: 3 })} {line.unit_label} pro Person
          </p>
        )}
        {canEdit && !line.editable && line.not_editable_reason && (
          <p className="mt-1 flex items-start gap-1 text-caption text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {line.not_editable_reason}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {editable && !line.excluded ? (
          <label className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <LineQuantityInput
              value={line.quantity_per_person}
              onCommit={commitQuantity}
              label={`Menge pro Person für ${line.recipe_title}`}
            />
            <span>{line.unit_label} / Pers.</span>
          </label>
        ) : (
          <span className="text-caption text-muted-foreground">{formatPerPerson(line)} / Pers.</span>
        )}
        <span className="min-w-16 text-right text-body font-medium text-foreground">{formatWeight(line.net_quantity_g)}</span>
        {editable && isRecipe && (
          <button
            type="button"
            onClick={() => saveRecipeLine(line.is_overridden ? line.quantity_per_person : null, !line.excluded)}
            className="rounded-lg bg-primary-soft px-2 py-1 text-caption font-medium text-primary"
          >
            {line.excluded ? 'Wieder aufnehmen' : 'Weglassen'}
          </button>
        )}
        {editable && isRecipe && changed && (
          <button
            type="button"
            onClick={() => saveRecipeLine(null, false)}
            aria-label={`${line.recipe_title} zurücksetzen`}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Zurücksetzen
          </button>
        )}
      </div>
    </li>
  );
}

/** Per-person quantity that saves on blur or Enter, not on every keystroke. */
function LineQuantityInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (value: number) => void;
  label: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? formatDecimalInput(value);
  const parsed = parseDecimalInput(shown);
  const valid = parsed !== null && parsed > 0;

  const commit = () => {
    if (text === null) return;
    if (valid && parsed !== null) onCommit(parsed);
    setText(null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') setText(null);
      }}
      aria-label={label}
      aria-invalid={!valid}
      data-testid="line-quantity-input"
      className="h-9 w-20 rounded-lg border border-input bg-background px-2 text-right text-body"
    />
  );
}

function AdjustDialog({
  item,
  mealPlanId,
  onClose,
}: {
  item: IngredientQuantity;
  mealPlanId: number;
  onClose: () => void;
}) {
  const adjust = useAdjustIngredientQuantity(mealPlanId);
  const fixedG = fixedShareG(item);
  const adjustableG = item.net_quantity_g - fixedG;
  const canTarget = item.has_trusted_weight && adjustableG > 0;
  const [mode, setMode] = useState<'target_total' | 'percent'>(canTarget ? 'target_total' : 'percent');
  const unitChoices = useMemo(
    () => [
      ...item.unit_options.map((option) => ({ name: option.name, weight_g: option.weight_g })),
      { name: GRAM_UNIT, weight_g: 1 },
      { name: KILOGRAM_UNIT, weight_g: 1000 },
    ],
    [item.unit_options],
  );
  const [unitName, setUnitName] = useState(unitChoices[0].name);
  const unit = unitChoices.find((choice) => choice.name === unitName) ?? unitChoices[0];
  const [amount, setAmount] = useState(() => Math.round((item.net_quantity_g / unit.weight_g) * 10) / 10);
  const [direction, setDirection] = useState<'less' | 'more'>('less');
  const [percent, setPercent] = useState(25);

  const targetG = amount * unit.weight_g;
  const signedPercent = direction === 'less' ? -percent : percent;
  const previewG = mode === 'target_total' ? targetG : fixedG + adjustableG * (1 + signedPercent / 100);
  const targetTooSmall = mode === 'target_total' && targetG <= fixedG;
  const invalid = targetTooSmall || (mode === 'target_total' ? amount <= 0 : percent <= 0);

  const run = (body: IngredientQuantityAdjustIn, successTitle: string) => {
    adjust.mutate(
      { ingredientId: item.ingredient_id, body },
      {
        onSuccess: (result) => {
          onClose();
          const previous = result.previous;
          notify.success(successTitle, {
            duration: UNDO_DURATION_MS,
            action:
              previous.length > 0
                ? {
                    label: 'Rückgängig',
                    onClick: () =>
                      adjust.mutate(
                        { ingredientId: item.ingredient_id, body: { mode: 'restore', restore: previous } },
                        { onError: (error) => notify.error('Menge konnte nicht zurückgesetzt werden', { error }) },
                      ),
                  }
                : undefined,
          });
        },
        onError: (error) => notify.error('Menge konnte nicht gespeichert werden', { error }),
      },
    );
  };

  const submit = () => {
    if (invalid) return;
    run(
      mode === 'target_total'
        ? { mode: 'target_total', target_total_g: targetG }
        : { mode: 'percent', percent: signedPercent },
      'Menge gespeichert',
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8">{item.ingredient_name}: Gesamtmenge anpassen</DialogTitle>
          <DialogDescription>
            Die Änderung wird anteilig auf alle Mahlzeiten verteilt. Das Rezept bleibt unverändert.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 grid-cols-2 gap-2" role="radiogroup" aria-label="Art der Anpassung">
            {(
              [
                ['target_total', 'Zielmenge'],
                ['percent', 'Prozent'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                disabled={value === 'target_total' && !canTarget}
                onClick={() => setMode(value)}
                className={cn(
                  'h-10 rounded-lg text-body font-medium transition-colors disabled:opacity-50',
                  mode === value ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'target_total' ? (
            <div className="space-y-1">
              <span className="text-body font-medium">Gesamt (ohne Reserve)</span>
              <div className="flex min-w-0 gap-2">
                <DecimalInput
                  value={amount}
                  min={0}
                  onChange={setAmount}
                  aria-label="Zielmenge"
                  className="h-10 w-24 shrink-0 rounded-lg border border-input bg-background px-3 text-body"
                  data-testid="target-amount"
                />
                <select
                  value={unitName}
                  onChange={(event) => {
                    const nextUnit = unitChoices.find((choice) => choice.name === event.target.value) ?? unitChoices[0];
                    setAmount(Math.round(((amount * unit.weight_g) / nextUnit.weight_g) * 10) / 10);
                    setUnitName(nextUnit.name);
                  }}
                  aria-label="Einheit"
                  className="h-10 min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-3 text-body"
                >
                  {unitChoices.map((choice) => (
                    <option key={choice.name} value={choice.name}>
                      {choice.name}
                      {choice.weight_g > 1 && choice.name !== KILOGRAM_UNIT ? ` (${formatWeight(choice.weight_g)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-body font-medium">Anpassbare Anteile ändern um</span>
              <div className="flex gap-2">
                <select
                  value={direction}
                  onChange={(event) => setDirection(event.target.value === 'more' ? 'more' : 'less')}
                  aria-label="Richtung"
                  className="h-10 rounded-lg border border-input bg-background px-3 text-body"
                >
                  <option value="less">weniger</option>
                  <option value="more">mehr</option>
                </select>
                <DecimalInput
                  value={percent}
                  min={1}
                  max={direction === 'less' ? 90 : 200}
                  onChange={setPercent}
                  aria-label="Prozent"
                  className="h-10 w-24 rounded-lg border border-input bg-background px-3 text-body"
                />
                <span className="self-center text-body">%</span>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-body">
            <p>
              Vorher: <strong>{formatNetAmount(item, item.net_quantity_g)}</strong>
            </p>
            <p>
              Nachher: <strong>{formatNetAmount(item, Math.max(0, previewG))}</strong>
            </p>
            {fixedG > 0.5 && (
              <p className="mt-1 text-caption text-muted-foreground">
                Davon bleiben {formatWeight(fixedG)} unverändert (direkte Zutaten, Vorlagen oder Varianten).
              </p>
            )}
            {targetTooSmall && (
              <p className="mt-1 text-caption text-danger">
                Die Zielmenge muss größer als der unveränderliche Anteil sein.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {item.is_adjusted ? (
            <button
              type="button"
              onClick={() => run({ mode: 'reset' }, 'Menge zurückgesetzt')}
              disabled={adjust.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-body font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              Auf Rezept zurücksetzen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 rounded-lg bg-primary-soft px-4 text-body font-medium text-primary sm:flex-none"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={invalid || adjust.isPending}
              className="h-10 flex-1 rounded-lg bg-primary px-4 text-body font-medium text-primary-foreground disabled:opacity-50 sm:flex-none"
            >
              Übernehmen
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
