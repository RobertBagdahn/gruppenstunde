import { useState } from 'react';
import { Check, Plus, Store as StoreIcon } from 'lucide-react';
import { useCreateStore, useStores } from '@/api/shoppingStores';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Store } from '@/schemas/shoppingStore';

interface StoreComboboxProps {
  value: Pick<Store, 'id' | 'name'> | null;
  onChange: (store: Store) => void;
  /** Adds the stores the team already uses for this event. */
  eventSlug?: string;
  id?: string;
  invalid?: boolean;
}

/** Search field over the user's stores; an unknown name can be created straight from the input. */
export default function StoreCombobox({ value, onChange, eventSlug, id, invalid = false }: StoreComboboxProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const stores = useStores({ search: search.trim(), eventSlug, pageSize: 8 });
  const createStore = useCreateStore();

  const term = search.trim();
  const items = stores.data?.items ?? [];
  const exact = items.some((store) => store.name.toLowerCase() === term.toLowerCase());

  const select = (store: Store) => {
    onChange(store);
    setSearch('');
    setOpen(false);
  };

  const createFromInput = () => {
    createStore.mutate({ name: term }, { onSuccess: select });
  };

  return (
    <div className="relative">
      <div className="relative">
        <StoreIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-options` : undefined}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          className="pl-9"
          placeholder={value ? value.name : 'Laden suchen oder anlegen'}
          value={open ? search : (value?.name ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <ul
          id={id ? `${id}-options` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-card p-1 shadow-card"
        >
          {items.map((store) => (
            <li key={store.id} role="option" aria-selected={value?.id === store.id}>
              <button
                type="button"
                onClick={() => select(store)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body hover:bg-muted',
                  value?.id === store.id && 'font-semibold text-primary',
                )}
              >
                <Check className={cn('h-4 w-4 shrink-0', value?.id === store.id ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                <span className="min-w-0 truncate">{store.name}</span>
              </button>
            </li>
          ))}
          {term !== '' && !exact && (
            <li role="option" aria-selected="false">
              <button
                type="button"
                onClick={createFromInput}
                disabled={createStore.isPending}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body font-semibold text-primary hover:bg-muted disabled:opacity-50"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">„{term}“ anlegen</span>
              </button>
            </li>
          )}
          {items.length === 0 && term === '' && !stores.isPending && (
            <li className="px-3 py-2 text-caption text-muted-foreground">Noch keine Läden. Tippe einen Namen, um einen anzulegen.</li>
          )}
        </ul>
      )}
      {createStore.isError && (
        <p role="alert" className="mt-1 text-caption text-danger">
          {getApiErrorMessage(createStore.error)}
        </p>
      )}
    </div>
  );
}
