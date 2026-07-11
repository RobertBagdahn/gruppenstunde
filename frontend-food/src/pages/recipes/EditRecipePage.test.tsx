// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

vi.mock('@/api/breakfast', () => ({
  useBreakfastDays: vi.fn(() => ({ data: [] })),
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

    render(
      <BrowserRouter>
        <EditRecipePage />
      </BrowserRouter>
    );

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

    render(
      <BrowserRouter>
        <EditRecipePage />
      </BrowserRouter>
    );

    // Verify admin section is NOT present
    expect(screen.queryByText('Admin-Kontrollen')).not.toBeInTheDocument();

    // Verify admin fields are NOT visible
    expect(screen.queryByLabelText(/Rezept-Status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Quell-URL/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Autoren/i)).not.toBeInTheDocument();
  });
});
