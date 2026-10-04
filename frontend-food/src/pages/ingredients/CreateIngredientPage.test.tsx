// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import CreateIngredientPage from './CreateIngredientPage';

const createMutate = vi.fn();

vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: { id: 1 }, isLoading: false }) }));
vi.mock('@/api/supplies', () => {
  const idle = { mutate: vi.fn(), isPending: false };
  return {
    useCreateIngredient: () => ({ mutate: createMutate, isPending: false }),
    useUpdateIngredient: () => idle,
    useRetailSections: () => ({ data: [] }),
    useAiCreateIngredient: () => idle,
    useIngredientAiPreview: () => idle,
    useIngredientImportUrl: () => idle,
    useGenericTerms: () => ({ data: [] }),
  };
});
vi.mock('@/hooks/useRequireLogin', () => ({ useRequireLogin: () => ({ guard: (action: () => void) => action() }) }));
vi.mock('@/hooks/useAiAccess', () => ({ useAiAccess: () => ({ disabled: false, hint: '' }) }));

function renderPage(initialEntry = '/ingredients/new?prefillName=Salz') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CreateIngredientPage />
    </MemoryRouter>,
  );
}

describe('CreateIngredientPage name handling', () => {
  beforeEach(() => {
    createMutate.mockReset();
    window.localStorage.clear();
  });

  it('shows an inline error and keeps the user on the name step when the name is empty', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Name der Zutat') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau' }));

    expect(screen.getByRole('alert').textContent).toContain('Bitte gib einen Namen ein.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('names the existing ingredient with a link when the name is taken (409)', () => {
    createMutate.mockImplementation((_payload, options: { onError: (error: Error) => void }) => {
      options.onError(
        new ApiError(409, 'Conflict', {
          detail: 'Die Zutat „Salz“ gibt es schon.',
          code: 'ingredient_exists',
          existing: { id: 7, slug: 'salz', name: 'Salz' },
        }),
      );
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Vorschau' }));
    fireEvent.click(screen.getByRole('button', { name: /Speichern/ }));

    expect(screen.getByRole('alert').textContent).toContain('Die Zutat „Salz“ gibt es schon.');
    expect(screen.getByRole('link', { name: /Zur vorhandenen Zutat „Salz“/ }).getAttribute('href')).toBe(
      '/ingredients/salz',
    );
  });
});
