/**
 * ShoppingListItemRow — Single item row with checkbox, quantity, and natural portions.
 * Touch-friendly: 44x44px minimum tap target for the checkbox.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/schemas/shoppingList";
import { Check, ChevronRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import {
  QuantityUnitInput,
  QuantityUnitLabel,
  type QuantityUnitItem,
} from "@/components/quantity/QuantityUnit";
import { formatEuro, formatWeight } from "@/lib/format";
import { HelpHint } from "@/components/ui/help-hint";
import {
  PACKAGE_RESERVE_HELP,
  formatItemPackageReserve,
  formatPackageNeed,
  formatPortionOption,
  formatShoppingQuantity,
  formatWhen,
} from "@/lib/shoppingItemDisplay";

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  canEdit: boolean;
  onCheck: (itemId: number, isChecked: boolean) => void;
  /** Deletes the item. Only offered for manual entries (without recipe/plan sources). */
  onDelete?: (item: ShoppingListItem) => void;
  /** Saves a new amount in grams (entered in any unit). Offered for ingredient entries with a known unit. */
  onUpdateQuantity?: (itemId: number, quantityG: number) => void;
  /** Name of the user who just checked this item (for real-time indicator) */
  recentChecker?: string | null;
  /** Set by the list header to open or close all recipe sources at once; a new object per click re-applies it. */
  sourcesSignal?: { open: boolean } | null;
  /** Takes over (true) or releases (false) the entry ("Ich hole das"). */
  onClaim?: (itemId: number, claimed: boolean) => void;
  /** Shopping mode: big tap targets, only what is needed in the store. */
  shopMode?: boolean;
}

/** The stored gram amount expressed in the item's start unit, or null when no usable unit is known. */
function toQuantityUnitItem(item: ShoppingListItem): QuantityUnitItem | null {
  const unit = item.start_unit;
  if (
    !item.ingredient_id ||
    !unit ||
    !unit.grams_per_unit ||
    unit.grams_per_unit <= 0 ||
    item.quantity_g <= 0
  ) {
    return null;
  }
  return {
    ingredient_id: item.ingredient_id,
    ingredient_slug: item.ingredient_slug ?? undefined,
    quantity: item.quantity_g / unit.grams_per_unit,
    quantity_g: item.quantity_g,
    unit_kind: unit.kind,
    unit_label: unit.label,
    is_weight_approx: unit.is_approx,
    portion_id: unit.portion_id,
    standard_measure_key: unit.standard_measure_key,
    measuring_unit_id: unit.measuring_unit_id,
  };
}

export default function ShoppingListItemRow({
  item,
  canEdit,
  onCheck,
  onDelete,
  onUpdateQuantity,
  recentChecker,
  sourcesSignal,
  onClaim,
  shopMode = false,
}: ShoppingListItemRowProps) {
  const [showChecker, setShowChecker] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [portionsExpanded, setPortionsExpanded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);

  const hasSources = item.sources && item.sources.length > 0;

  // Header "alle ein-/ausklappen": apply the requested state whenever a new signal arrives.
  useEffect(() => {
    if (sourcesSignal) setSourcesExpanded(sourcesSignal.open);
  }, [sourcesSignal]);
  const hasPortionOptions =
    item.portion_options && item.portion_options.length > 1;
  // Entries generated from recipes or plans are rebuilt from their source; only manual ones can be removed.
  const canDelete = canEdit && !!onDelete && !hasSources && item.can_delete;

  // Show the recent checker name briefly, then fade out
  useEffect(() => {
    if (recentChecker) {
      setShowChecker(true);
      const timer = setTimeout(() => setShowChecker(false), 3000);
      return () => clearTimeout(timer);
    }
    setShowChecker(false);
  }, [recentChecker]);

  // `quantity` is in the display unit (ml for beverages/liquids); fall back to grams.
  const quantityLabel = formatShoppingQuantity(
    item.quantity || item.quantity_g,
    item.unit,
    item.start_unit,
    item.package_options[0],
    item.quantity_g,
  );
  // Start unit with its grams, switchable for viewing and enterable in any unit.
  const unitItem = toQuantityUnitItem(item);
  const packageNeed = item.package_options[0]
    ? formatPackageNeed(item.package_options[0])
    : "";
  const reserveLabel = formatItemPackageReserve(item);

  return (
    <div className="font-sans" data-testid={`shopping-item-${item.id}`}>
      <div
        className={cn(
          "flex items-center gap-3 px-2 -mx-2 rounded-xl transition-colors",
          shopMode ? "py-3" : "py-2",
          item.is_checked && "opacity-60",
          canEdit && "hover:bg-muted/50",
        )}
      >
        {/* Checkbox — 44x44px touch target */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onCheck(item.id, !item.is_checked)}
          className={cn(
            "flex items-center justify-center shrink-0 rounded-xl border-2 transition-all shadow-soft",
            shopMode ? "w-14 h-14" : "w-11 h-11",
            item.is_checked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary bg-card",
            !canEdit && "cursor-default opacity-50",
          )}
          aria-label={
            item.is_checked
              ? "Als unerledigt markieren"
              : "Als erledigt markieren"
          }
        >
          {item.is_checked && <Check className="w-5 h-5 stroke-[3px]" />}
        </button>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => hasSources && setSourcesExpanded(!sourcesExpanded)}
        >
          <div className="flex items-center gap-2">
            {hasSources && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  sourcesExpanded && "rotate-90",
                )}
              />
            )}
            {item.ingredient_slug ? (
              <Link
                to={`/ingredients/${item.ingredient_slug}`}
                className={cn(
                  "font-semibold hover:text-primary transition-colors text-foreground",
                  shopMode ? "text-emphasis" : "text-body",
                  item.is_checked && "line-through text-muted-foreground",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {item.name}
              </Link>
            ) : (
              <span
                className={cn(
                  "font-semibold text-foreground",
                  shopMode ? "text-emphasis" : "text-body",
                  item.is_checked && "line-through text-muted-foreground",
                )}
              >
                {item.name}
              </span>
            )}
            {unitItem &&
              canEdit &&
              onUpdateQuantity &&
              !editingQuantity &&
              !item.is_checked && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingQuantity(true);
                  }}
                  aria-label={`Menge von „${item.name}“ ändern`}
                  title="Menge ändern"
                  className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
          </div>
          {!editingQuantity && (unitItem || quantityLabel) && (
            <div className="mt-1 flex">
              {unitItem && !editingQuantity ? (
                <span
                  className="inline-flex flex-wrap items-center gap-x-1.5 text-caption font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40"
                  onClick={(event) => event.stopPropagation()}
                >
                  <QuantityUnitLabel item={unitItem} />
                  {packageNeed && <span>· {packageNeed}</span>}
                </span>
              ) : (
                !editingQuantity &&
                quantityLabel && (
                  <span className="text-caption font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/40">
                    {quantityLabel}
                  </span>
                )
              )}
            </div>
          )}
          {editingQuantity && unitItem && (
            <div
              className="mt-1 flex flex-wrap items-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <QuantityUnitInput
                item={unitItem}
                onCommit={({ grams }) => {
                  if (grams != null && grams > 0)
                    onUpdateQuantity?.(item.id, Math.round(grams * 100) / 100);
                  setEditingQuantity(false);
                }}
              />
              <button
                type="button"
                onClick={() => setEditingQuantity(false)}
                className="text-caption font-semibold text-muted-foreground hover:underline"
              >
                Abbrechen
              </button>
            </div>
          )}
          {reserveLabel && (
            <p className="text-caption text-muted-foreground mt-0.5 flex items-center gap-1">
              {reserveLabel}
              <HelpHint label="Was bedeutet Reserve?">
                {PACKAGE_RESERVE_HELP}
              </HelpHint>
            </p>
          )}
          {/* Portion options toggle & price */}
          <div className="flex items-center gap-2 mt-0.5">
            {hasPortionOptions && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPortionsExpanded(!portionsExpanded);
                }}
                aria-expanded={portionsExpanded}
                className="inline-flex items-center gap-1 text-caption transition-colors text-muted-foreground/70 hover:text-muted-foreground cursor-pointer"
              >
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    portionsExpanded && "rotate-180",
                  )}
                />
                Portionsgrößen
              </button>
            )}
            {item.estimated_price_eur !== null &&
              item.estimated_price_eur !== undefined && (
                <span className="text-caption font-semibold text-foreground">
                  {formatEuro(item.estimated_price_eur)}
                </span>
              )}
            {item.estimated_price_eur === null && item.ingredient_id && (
              <span className="text-caption text-danger">kein Preis</span>
            )}
          </div>
          {item.note && (
            <p className="text-caption text-muted-foreground italic mt-0.5">
              {item.note}
            </p>
          )}
          {/* Expanded portion options */}
          {portionsExpanded && hasPortionOptions && (
            <div className="mt-1.5 space-y-0.5">
              {item.portion_options.map((opt, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 text-caption pl-4",
                    opt.is_default
                      ? "text-muted-foreground font-semibold"
                      : "text-muted-foreground/60",
                  )}
                >
                  <span className="text-muted-foreground/40">&#8226;</span>
                  <span>{formatPortionOption(opt)}</span>
                  {opt.is_default && (
                    <span className="text-caption text-muted-foreground/40 font-normal">
                      (Standard)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Who takes care of it */}
          {onClaim && canEdit && !item.is_checked && (
            <p
              className="mt-0.5 text-caption"
              data-testid={`shopping-item-${item.id}-claim`}
            >
              {item.claimed_by_me ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClaim(item.id, false);
                  }}
                  className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary hover:bg-primary-soft-border/70"
                >
                  Du holst das · Freigeben
                </button>
              ) : item.claimed_by_display_name ? (
                <span className="font-semibold text-primary">
                  {item.claimed_by_display_name} holt das
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClaim(item.id, true);
                  }}
                  className="rounded-lg px-2 py-0.5 font-semibold text-primary hover:bg-primary-soft"
                >
                  Ich hole das
                </button>
              )}
            </p>
          )}
          {/* Who added the entry and when; who checked it and when */}
          {!shopMode &&
            (item.added_by_display_name ||
              (item.is_checked && item.checked_by_display_name)) && (
              <p
                className="mt-0.5 text-caption text-muted-foreground"
                data-testid={`shopping-item-${item.id}-attribution`}
              >
                {item.added_by_display_name && (
                  <span>
                    Hinzugefügt von {item.added_by_display_name}
                    {formatWhen(item.created_at) &&
                      ` · ${formatWhen(item.created_at)}`}
                  </span>
                )}
                {item.added_by_display_name &&
                  item.is_checked &&
                  item.checked_by_display_name && (
                    <span aria-hidden="true"> · </span>
                  )}
                {item.is_checked && item.checked_by_display_name && (
                  <span>
                    Abgehakt von {item.checked_by_display_name}
                    {formatWhen(item.checked_at) &&
                      ` · ${formatWhen(item.checked_at)}`}
                  </span>
                )}
              </p>
            )}
          {/* Real-time checker indicator */}
          {showChecker && recentChecker && (
            <p className="text-caption text-primary font-semibold mt-0.5 animate-fade-inUp">
              {recentChecker} hat abgehakt
            </p>
          )}
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete?.(item)}
            aria-label={`Eintrag „${item.name}“ löschen`}
            title="Eintrag löschen"
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded sources */}
      {sourcesExpanded && hasSources && (
        <div className="pl-16 pr-2 pb-2.5 space-y-1.5">
          {item.sources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-caption text-muted-foreground"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-muted-foreground/60">&#8226;</span>
                {source.recipe_slug ? (
                  <Link
                    to={`/recipes/${source.recipe_slug}`}
                    className="hover:text-primary hover:underline transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {source.recipe_name}
                  </Link>
                ) : (
                  <span>{source.recipe_name}</span>
                )}
                {source.meal_label && (
                  <span className="text-muted-foreground/60 font-normal">
                    ({source.meal_label})
                  </span>
                )}
              </div>
              <span className="font-semibold">
                {formatWeight(source.quantity_g)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
