import { useState } from 'react';
import { useCreateFromRecipe, useShoppingLists } from '@/api/shoppingLists';
import { useRecipes } from '@/api/recipes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { notify } from '@/lib/notify';
import { toLocalDateTime } from '@/lib/tripTime';
import { cn } from '@/lib/utils';
import type { ShoppingListDetail } from '@/schemas/shoppingList';
import type { Store } from '@/schemas/shoppingStore';
import { RecipePurchaseInputSchema } from '@/schemas/shoppingTrip';
import StoreCombobox from './trips/StoreCombobox';

export interface PurchaseRecipe {
  id: number;
  title: string;
  hasConsumables?: boolean;
}

interface RecipePurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixed recipe (recipe page); without it the dialog asks for one first. */
  recipe?: PurchaseRecipe;
  defaultPortions?: number;
  /** Offer "Zu bestehender Liste" next to a new purchase. */
  allowExisting?: boolean;
  onDone: (list: ShoppingListDetail) => void;
}

export default function RecipePurchaseDialog(props: RecipePurchaseDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-md">{props.open && <PurchaseForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function PurchaseForm({ onOpenChange, recipe: fixedRecipe, defaultPortions = 1, allowExisting = true, onDone }: RecipePurchaseDialogProps) {
  const [chosen, setChosen] = useState<PurchaseRecipe | null>(null);
  const recipe = fixedRecipe ?? chosen;
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [portions, setPortions] = useState(defaultPortions);
  const [consumables, setConsumables] = useState(true);
  const [store, setStore] = useState<Pick<Store, 'id' | 'name'> | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [listId, setListId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const create = useCreateFromRecipe();
  const lists = useShoppingLists(1, 50, { withoutEvent: true }, { enabled: allowExisting && mode === 'existing' });
  const recipes = useRecipes({ q: search.trim() || undefined, page: 1 }, { enabled: !fixedRecipe && search.trim().length >= 2 });
  const editable = (lists.data?.items ?? []).filter((list) => list.can_edit);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!recipe) {
      setProblem('Bitte wähle ein Rezept aus.');
      return;
    }
    const parsed = RecipePurchaseInputSchema.safeParse(
      mode === 'new'
        ? {
            portions,
            include_consumables: consumables,
            store_id: store?.id,
            scheduled_at: toLocalDateTime(date, time) || undefined,
          }
        : { portions, include_consumables: consumables, shopping_list_id: listId ?? undefined },
    );
    if (!parsed.success) {
      setProblem(parsed.error.issues[0].message);
      return;
    }
    setProblem(null);
    create.mutate(
      { recipeId: recipe.id, ...parsed.data },
      {
        onSuccess: (list) => {
          notify.success(mode === 'new' ? 'Einkaufsliste erstellt' : 'Rezept zur Liste hinzugefügt');
          onOpenChange(false);
          onDone(list);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Einkaufen{recipe ? `: ${recipe.title}` : ''}</DialogTitle>
        <DialogDescription>Lege einen neuen Einkauf an oder füge das Rezept einer Liste hinzu.</DialogDescription>
      </DialogHeader>

      {!fixedRecipe && (
        <div className="space-y-1.5">
          <Label htmlFor="purchase-recipe">Rezept</Label>
          {recipe ? (
            <p className="flex items-center justify-between gap-2 text-body">
              <span className="min-w-0 truncate font-semibold">{recipe.title}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setChosen(null)}>
                Ändern
              </Button>
            </p>
          ) : (
            <>
              <Input id="purchase-recipe" placeholder="Rezept suchen" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className="max-h-48 overflow-auto" aria-label="Rezepte">
                {(recipes.data?.items ?? []).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChosen({ id: item.id, title: item.title });
                        setPortions(Math.max(1, Math.round(item.portions ?? 1)));
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-body hover:bg-muted"
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {allowExisting && (
        <div role="radiogroup" aria-label="Ziel" className="grid grid-cols-2 gap-2">
          {(
            [
              ['new', 'Neuer Einkauf'],
              ['existing', 'Zu bestehender Liste'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-body font-semibold',
                mode === value ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-card text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="purchase-portions">Portionen</Label>
        <Input
          id="purchase-portions"
          type="number"
          min={1}
          max={999}
          value={portions}
          onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="max-w-32"
        />
      </div>

      {mode === 'new' ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="purchase-store">Laden</Label>
            <StoreCombobox id="purchase-store" value={store} onChange={setStore} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="purchase-date">Datum</Label>
              <Input id="purchase-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase-time">Uhrzeit</Label>
              <Input id="purchase-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="purchase-list">Liste</Label>
          <select
            id="purchase-list"
            value={listId ?? ''}
            onChange={(e) => setListId(e.target.value ? Number(e.target.value) : null)}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-body"
          >
            <option value="">Liste wählen</option>
            {editable.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(fixedRecipe?.hasConsumables ?? true) && (
        <label className="flex cursor-pointer items-center gap-2 text-body">
          <input type="checkbox" className="h-4 w-4" checked={consumables} onChange={(e) => setConsumables(e.target.checked)} />
          Verbrauchsmaterial mit aufnehmen
        </label>
      )}

      {(problem || create.isError) && (
        <p role="alert" className="text-body text-danger">
          {problem ?? getApiErrorMessage(create.error)}
        </p>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Wird angelegt…' : mode === 'new' ? 'Einkauf anlegen' : 'Hinzufügen'}
        </Button>
      </DialogFooter>
    </form>
  );
}
