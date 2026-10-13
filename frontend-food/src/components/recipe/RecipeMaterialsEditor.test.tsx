// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeMaterialsEditor, { moveItemOrder } from './RecipeMaterialsEditor';
import type { RecipeMaterial } from '@/schemas/recipe';

vi.mock('@/api/recipeMaterials', () => ({
  useRecipeMaterials: vi.fn(),
  useCreateRecipeMaterial: vi.fn(),
  useUpdateRecipeMaterial: vi.fn(),
  useDeleteRecipeMaterial: vi.fn(),
  useReorderRecipeMaterials: vi.fn(),
}));

vi.mock('@/api/supplies', () => ({
  useMaterialSearch: vi.fn(),
}));

vi.mock('@/api/materials', () => ({
  useCreateMaterial: () => ({ mutate: vi.fn(), isPending: false }),
}));

import {
  useRecipeMaterials,
  useCreateRecipeMaterial,
  useUpdateRecipeMaterial,
  useDeleteRecipeMaterial,
  useReorderRecipeMaterials,
} from '@/api/recipeMaterials';
import { useMaterialSearch } from '@/api/supplies';

const materialsFixture: RecipeMaterial[] = [
  {
    id: 7,
    material_id: 12,
    material_name: 'Zahnstocher',
    material_slug: 'zahnstocher',
    material_category: 'kitchen',
    is_consumable: true,
    amount: 30,
    quantity_mode: 'total',
    price_per_piece: null,
    sort_order: 0,
  },
  {
    id: 8,
    material_id: 13,
    material_name: 'Backofen',
    material_slug: 'backofen',
    material_category: 'kitchen',
    is_consumable: false,
    amount: 1,
    quantity_mode: 'total',
    price_per_piece: null,
    sort_order: 1,
  },
];

function renderEditor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeMaterialsEditor recipeId={1} />
    </QueryClientProvider>,
  );
}

function mockMaterialHooks() {
  const createMutate = vi.fn();
  const updateMutate = vi.fn();
  const deleteMutate = vi.fn();
  const reorderMutate = vi.fn();
  (useCreateRecipeMaterial as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: createMutate,
    isPending: false,
  });
  (useUpdateRecipeMaterial as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: updateMutate,
    isPending: false,
  });
  (useDeleteRecipeMaterial as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: deleteMutate,
    isPending: false,
  });
  (useReorderRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    mutate: reorderMutate,
    isPending: false,
  });
  return { createMutate, updateMutate, deleteMutate, reorderMutate };
}

describe('moveItemOrder', () => {
  it('moves an item up and down within bounds', () => {
    expect(moveItemOrder([1, 2, 3], 1, 'up')).toEqual([2, 1, 3]);
    expect(moveItemOrder([1, 2, 3], 1, 'down')).toEqual([1, 3, 2]);
    expect(moveItemOrder([1, 2, 3], 0, 'up')).toEqual([1, 2, 3]);
    expect(moveItemOrder([1, 2, 3], 2, 'down')).toEqual([1, 2, 3]);
  });
});

describe('RecipeMaterialsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useMaterialSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined });
  });

  it('renders devices and consumables with amounts', () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: materialsFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { createMutate } = mockMaterialHooks();
    renderEditor();

    expect(screen.getByText('Zahnstocher')).toBeTruthy();
    expect(screen.getByText('Backofen')).toBeTruthy();
    expect(screen.getByDisplayValue('30')).toBeTruthy();
    expect(screen.getByText('Gerät')).toBeTruthy();
    expect(screen.getByText('Verbrauchsmaterial')).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('shows empty state when no materials exist', () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockMaterialHooks();
    renderEditor();

    expect(screen.getByText('Kein Material')).toBeTruthy();
  });

  it('persists amount edits on blur', async () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: materialsFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { updateMutate } = mockMaterialHooks();
    renderEditor();

    const input = screen.getByDisplayValue('30');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith(
        { itemId: 7, data: { amount: 50 } },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );
    });
  });

  it('deletes a material row', () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: materialsFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { deleteMutate } = mockMaterialHooks();
    renderEditor();

    fireEvent.click(screen.getByLabelText('Zahnstocher entfernen'));
    expect(deleteMutate).toHaveBeenCalledWith(7, expect.any(Object));
  });

  it('adds a selected material from search results', async () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { createMutate } = mockMaterialHooks();
    (useMaterialSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ id: 99, name: 'Alufolie', slug: 'alufolie', material_category: 'kitchen', is_consumable: true, can_edit: false, can_delete: false }],
    });
    renderEditor();

    fireEvent.change(screen.getByLabelText('Material suchen'), { target: { value: 'alufolie' } });
    await waitFor(() => {
      expect(screen.getByText('Alufolie')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Alufolie'));
    fireEvent.change(screen.getByLabelText('Menge des neuen Materials'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Berechnung des neuen Materials'), { target: { value: 'per_portion' } });
    fireEvent.click(screen.getByTestId('materials-add-button'));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        { material_id: 99, amount: 2, quantity_mode: 'per_portion' },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );
    });
  });

  it('switches the calculation mode of a consumable', () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: materialsFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { updateMutate } = mockMaterialHooks();
    renderEditor();

    fireEvent.change(screen.getByLabelText('Berechnung für Zahnstocher'), { target: { value: 'per_portion' } });
    expect(updateMutate).toHaveBeenCalledWith({ itemId: 7, data: { quantity_mode: 'per_portion' } }, expect.any(Object));
    // Devices have no calculation mode.
    expect(screen.queryByLabelText('Berechnung für Backofen')).toBeNull();
  });

  it('reorders via move buttons', () => {
    (useRecipeMaterials as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: materialsFixture,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const { reorderMutate } = mockMaterialHooks();
    renderEditor();

    const upButtons = screen.getAllByLabelText('Nach oben verschieben');
    fireEvent.click(upButtons[1]);
    expect(reorderMutate).toHaveBeenCalledWith([8, 7], expect.any(Object));
  });
});
