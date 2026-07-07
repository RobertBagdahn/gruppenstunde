// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import IngredientEditPage from './IngredientEditPage';

// Mock hooks
vi.mock('@/api/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/api/supplies', () => ({
  useIngredient: vi.fn(),
  useUpdateIngredient: vi.fn(),
  useRetailSections: vi.fn(() => ({ data: [] })),
  useNutritionalTags: vi.fn(() => ({ data: [] })),
}));

import { useCurrentUser } from '@/api/auth';
import { useIngredient, useUpdateIngredient } from '@/api/supplies';

const mockIngredient = {
  id: 1,
  slug: 'test-ingredient',
  name: 'Test Ingredient',
  status: 'draft',
  created_by_id: 2,
  description: '',
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

describe('IngredientEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show status as read-only text for non-staff users', () => {
    (useCurrentUser as any).mockReturnValue({
      data: regularUser,
      isLoading: false,
    });
    (useIngredient as any).mockReturnValue({
      data: mockIngredient,
      isLoading: false,
      error: null,
    });
    (useUpdateIngredient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(
      <BrowserRouter>
        <IngredientEditPage />
      </BrowserRouter>
    );

    // Find the status field
    const statusLabel = screen.getByText('Status');
    expect(statusLabel).toBeInTheDocument();

    // Verify it's not a select dropdown
    const selects = screen.queryAllByRole('combobox');
    const statusSelect = selects.find((s) => s.closest('label')?.textContent.includes('Status'));
    // There should be a status field but not a select (it should be read-only div)
    expect(statusSelect).toBeUndefined();

    // Verify read-only text is shown
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
  });

  it('should show status as dropdown for staff users', () => {
    (useCurrentUser as any).mockReturnValue({
      data: staffUser,
      isLoading: false,
    });
    (useIngredient as any).mockReturnValue({
      data: mockIngredient,
      isLoading: false,
      error: null,
    });
    (useUpdateIngredient as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(
      <BrowserRouter>
        <IngredientEditPage />
      </BrowserRouter>
    );

    // Verify status is a select dropdown
    const selects = screen.getAllByRole('combobox');
    const statusSelect = selects.find((s) => {
      const label = s.closest('div')?.textContent;
      return label?.includes('Status');
    });

    expect(statusSelect).toBeDefined();

    // Verify all status options are available
    expect(screen.getByText('Entwurf')).toBeInTheDocument();
    expect(screen.getByText('Verifiziert')).toBeInTheDocument();
    expect(screen.getByText('Benutzer erstellt')).toBeInTheDocument();
  });
});
