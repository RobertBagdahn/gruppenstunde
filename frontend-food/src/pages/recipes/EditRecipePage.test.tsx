// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditRecipePage from './EditRecipePage';

// Mock the API hooks
vi.mock('@/api/recipes', () => ({
  useRecipeBySlug: vi.fn(),
  useUpdateRecipe: vi.fn(),
}));

vi.mock('@/api/tags', () => ({
  useTags: vi.fn(() => ({ data: [] })),
  useScoutLevels: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/api/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/components/MarkdownEditor', () => ({
  default: ({ value, onChange }: any) => (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { useRecipeBySlug, useUpdateRecipe } from '@/api/recipes';
import { useCurrentUser } from '@/api/auth';

const mockRecipe = {
  id: 1,
  slug: 'test-recipe',
  title: 'Test Recipe',
  recipe_type: 'main',
  summary: 'Test summary',
  description: 'Test description',
  difficulty: 'easy',
  execution_time: '30min',
  preparation_time: '15min',
  status: 'draft',
  source_url: 'https://example.com',
  can_edit: true,
  tags: [],
  scout_levels: [],
  authors: [],
};

const staffUser = {
  id: 1,
  username: 'staff',
  is_staff: true,
  is_authenticated: true,
};

const regularUser = {
  id: 2,
  username: 'user',
  is_staff: false,
  is_authenticated: true,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EditRecipePage />
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe('EditRecipePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Admin Controls section for staff users', () => {
    (useRecipeBySlug as any).mockReturnValue({
      data: mockRecipe,
      isLoading: false,
      error: null,
    });
    (useUpdateRecipe as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (useCurrentUser as any).mockReturnValue({
      data: staffUser,
    });

    renderPage();

    // Verify admin controls section is present
    const adminSection = screen.getByText('Admin-Kontrollen');
    expect(adminSection).toBeInTheDocument();

    // Verify admin fields are visible
    expect(screen.getByLabelText(/Rezept-Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quell-URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Autoren/i)).toBeInTheDocument();
  });

  it('should NOT show Admin Controls section for non-staff users', () => {
    (useRecipeBySlug as any).mockReturnValue({
      data: mockRecipe,
      isLoading: false,
      error: null,
    });
    (useUpdateRecipe as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (useCurrentUser as any).mockReturnValue({
      data: regularUser,
    });

    renderPage();

    // Verify admin section is NOT present
    expect(screen.queryByText('Admin-Kontrollen')).not.toBeInTheDocument();

    // Verify admin fields are NOT visible
    expect(screen.queryByLabelText(/Rezept-Status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Quell-URL/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Autoren/i)).not.toBeInTheDocument();
  });

  it('should block editing when the API denies edit permission', () => {
    (useRecipeBySlug as any).mockReturnValue({
      data: { ...mockRecipe, can_edit: false },
      isLoading: false,
      error: null,
    });
    (useUpdateRecipe as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
    (useCurrentUser as any).mockReturnValue({ data: regularUser });

    renderPage();

    expect(screen.getByText(/keine Berechtigung/i)).toBeInTheDocument();
  });

  it('shows an inline error at the title field and does not save when the title is empty', () => {
    const mutate = vi.fn();
    (useRecipeBySlug as any).mockReturnValue({ data: mockRecipe, isLoading: false, error: null });
    (useUpdateRecipe as any).mockReturnValue({ mutate, isPending: false });
    (useCurrentUser as any).mockReturnValue({ data: regularUser });

    renderPage();
    const titleInput = screen.getByPlaceholderText(/Lagerfeuer-Stockbrot/) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /Änderungen speichern/ }));

    expect(screen.getByRole('alert').textContent).toBe('Titel ist erforderlich.');
    expect(document.activeElement).toBe(titleInput);
    expect(titleInput.getAttribute('aria-invalid')).toBe('true');
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.change(titleInput, { target: { value: 'Neuer Titel' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
