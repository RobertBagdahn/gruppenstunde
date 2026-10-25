// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import RecipeFoldersPage from './RecipeFoldersPage';

const mockState = vi.hoisted(() => ({
  folders: undefined as unknown,
  isLoading: false,
}));

vi.mock('@/api/recipeFolders', () => ({
  useRecipeFolders: () => ({ data: mockState.folders, isLoading: mockState.isLoading }),
  useCreateRecipeFolder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRecipeFolder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRecipeFolder: () => ({ mutate: vi.fn(), isPending: false }),
}));

function folder(id: number, name: string, parent_id: number | null = null, recipe_count = 0) {
  return { id, name, parent_id, recipe_count };
}

function renderPage() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
      <RecipeFoldersPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  mockState.folders = undefined;
  mockState.isLoading = false;
});

describe('RecipeFoldersPage (food-canvas-layout)', () => {
  it('shows one H1, the folder count and a back link to my recipes', () => {
    mockState.folders = [folder(1, 'Frühstück', null, 3)];
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ordner verwalten');
    expect(screen.getByText('1 Ordner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meine Rezepte' })).toHaveAttribute('href', '/recipes/my-recipes');
  });

  it('renders the empty state when there are no folders', () => {
    mockState.folders = [];
    renderPage();
    expect(screen.getByRole('heading', { name: 'Noch keine Ordner' })).toBeInTheDocument();
  });

  it('lists subfolders under their parent with a delete action', () => {
    mockState.folders = [folder(1, 'Frühstück', null, 3), folder(2, 'Brot', 1, 2)];
    renderPage();
    // "Frühstück" also appears as an option of the parent select, so the folder row is asserted via the list.
    expect(screen.getByRole('list')).toHaveTextContent('Brot');
    expect(screen.getAllByText('Frühstück').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Brot löschen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frühstück umbenennen' })).toBeInTheDocument();
  });
});
