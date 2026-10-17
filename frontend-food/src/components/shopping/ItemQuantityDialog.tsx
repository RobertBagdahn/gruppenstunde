import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorDisplay from "@/components/ErrorDisplay";
import { useShoppingListItem } from "@/api/shoppingLists";
import {
  QuantityUnitInput,
  type QuantityUnitItem,
} from "@/components/quantity/QuantityUnit";
import type { ShoppingListItem } from "@/schemas/shoppingList";

/** The stored gram amount expressed in the item's start unit, or null when no usable unit is known. */
export function toQuantityUnitItem(
  item: ShoppingListItem,
): QuantityUnitItem | null {
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

interface ItemQuantityDialogProps {
  itemName: string;
  unitItem: QuantityUnitItem;
  /** Saves the new amount in grams. */
  onSave: (quantityG: number) => void;
  onClose: () => void;
}

/** Change an entry's amount, e.g. when only a part of it was available. The amount field is focused on open. */
export function ItemQuantityDialog({
  itemName,
  unitItem,
  onSave,
  onClose,
}: ItemQuantityDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(event) => {
          // Focus the amount field and select its content so typing replaces it.
          event.preventDefault();
          const input =
            event.currentTarget instanceof HTMLElement
              ? event.currentTarget.querySelector("input")
              : null;
          input?.focus();
          input?.select();
        }}
      >
        <DialogHeader>
          <DialogTitle>Menge ändern: {itemName}</DialogTitle>
          <DialogDescription>
            Nur eine Teilmenge bekommen? Trage hier ein, wie viel du
            tatsächlich hast.
          </DialogDescription>
        </DialogHeader>
        <QuantityUnitInput
          item={unitItem}
          onCommit={({ grams }) => {
            if (grams != null && grams > 0)
              onSave(Math.round(grams * 100) / 100);
            onClose();
          }}
        />
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={onClose}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BoardQuantityDialogProps {
  listId: number;
  itemId: number;
  onSave: (quantityG: number) => void;
  onClose: () => void;
}

/** The compact board carries no unit data, so the full entry is loaded when the dialog opens. */
export function BoardQuantityDialog({
  listId,
  itemId,
  onSave,
  onClose,
}: BoardQuantityDialogProps) {
  const { data: item, isLoading, error, refetch } = useShoppingListItem(listId, itemId);
  const unitItem = item ? toQuantityUnitItem(item) : null;

  if (item && unitItem) {
    return (
      <ItemQuantityDialog
        itemName={item.name}
        unitItem={unitItem}
        onSave={onSave}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Menge ändern</DialogTitle>
          <DialogDescription className="sr-only">
            Menge dieses Eintrags ändern
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-10 w-full" aria-label="Menge wird geladen" />}
        {error && !isLoading && (
          <ErrorDisplay error={error} onRetry={() => void refetch()} />
        )}
        {item && !unitItem && (
          <p className="text-body text-muted-foreground">
            Für diesen Eintrag lässt sich die Menge nicht ändern.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
