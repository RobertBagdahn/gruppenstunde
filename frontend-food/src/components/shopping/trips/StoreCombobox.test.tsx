// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import StoreCombobox from './StoreCombobox';

const createMutate = vi.fn();
let createState: { isPending: boolean; isError: boolean; error: unknown } = { isPending: false, isError: false, error: null };
const stores = [
  { id: 1, name: 'Metro', created_at: '' },
  { id: 2, name: 'Metzger Müller', created_at: '' },
];

vi.mock('@/api/shoppingStores', () => ({
  useStores: ({ search }: { search: string }) => ({
    isPending: false,
    data: { items: stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())), total: 2, page: 1, page_size: 8, total_pages: 1 },
  }),
  useCreateStore: () => ({ mutate: createMutate, ...createState }),
}));

describe('StoreCombobox', () => {
  beforeEach(() => {
    createMutate.mockReset();
    createState = { isPending: false, isError: false, error: null };
  });

  it('selects an existing store', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StoreCombobox value={null} onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('button', { name: /Metzger Müller/ }));

    expect(onChange).toHaveBeenCalledWith(stores[1]);
  });

  it('offers to create an unknown name and selects the created store', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StoreCombobox value={null} onChange={onChange} />);

    await user.type(screen.getByRole('combobox'), 'DM');
    await user.click(await screen.findByRole('button', { name: '„DM“ anlegen' }));

    expect(createMutate).toHaveBeenCalledWith({ name: 'DM' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    const created = { id: 9, name: 'DM', created_at: '' };
    createMutate.mock.calls[0][1].onSuccess(created);
    expect(onChange).toHaveBeenCalledWith(created);
  });

  it('does not offer to create a name that already exists', async () => {
    const user = userEvent.setup();
    render(<StoreCombobox value={null} onChange={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'metro');

    expect(await screen.findByRole('button', { name: /Metro/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anlegen/ })).not.toBeInTheDocument();
  });

  it('shows the German error when creating fails', async () => {
    createState = { isPending: false, isError: true, error: new ApiError(422, 'Unprocessable', { detail: 'Bitte gib einen Namen für den Laden ein.' }) };
    const user = userEvent.setup();
    render(<StoreCombobox value={null} onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte gib einen Namen für den Laden ein.');
  });
});
