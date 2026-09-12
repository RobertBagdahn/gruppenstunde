import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NutritionPlausibilityList from './NutritionPlausibilityList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockItems = [
  {
    id: 1,
    name: 'Kirschpralinen',
    slug: 'kirschpralinen',
    energy_kcal: null,
    protein_g: 2.0,
    fat_g: 10.0,
    carbohydrate_g: 0.0,
    sugar_g: 50.0,
    fat_sat_g: null,
    macro_sum: 12.0,
    issue: 'Zucker (50g) > Kohlenhydrate (0g)',
    anomaly_type: 'sugar_gt_carbs',
    severity: 'error',
    missing_fields: ['carbohydrate_g'],
  },
  {
    id: 2,
    name: 'Energy Boost',
    slug: 'energy-boost',
    energy_kcal: 250.0,
    protein_g: 0.0,
    fat_g: 0.0,
    carbohydrate_g: 0.0,
    sugar_g: 0.0,
    fat_sat_g: 0.0,
    macro_sum: 0.0,
    issue: '250 kcal erfasst, aber alle Makros sind 0g',
    anomaly_type: 'missing_macros',
    severity: 'error',
    missing_fields: ['protein_g', 'fat_g', 'carbohydrate_g'],
  },
];

const mockFillSingle = vi.fn().mockResolvedValue({
  id: 1,
  name: 'Kirschpralinen',
  slug: 'kirschpralinen',
  filled_fields: [{ field: 'carbohydrate_g', label: 'Kohlenhydrate (g)', value: 55.0 }],
  quality_score: 85,
});

const mockFillBatch = vi.fn().mockResolvedValue({
  results: [],
  total_filled: 2,
});

vi.mock('@/api/dataQuality', () => ({
  useNutritionPlausibility: () => ({
    data: {
      items: mockItems,
      total: 2,
      page: 1,
      page_size: 20,
      total_pages: 1,
    },
    isLoading: false,
    error: null,
  }),
  useAiFillMissingIngredient: () => ({
    mutateAsync: mockFillSingle,
    isPending: false,
  }),
  useAiFillMissingBatch: () => ({
    mutateAsync: mockFillBatch,
    isPending: false,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('NutritionPlausibilityList', () => {
  it('renders plausibility anomalies without crashing on null values', () => {
    renderWithClient(<NutritionPlausibilityList />);

    expect(screen.getByText('Kirschpralinen')).toBeInTheDocument();
    expect(screen.getByText('Zucker (50g) > Kohlenhydrate (0g)')).toBeInTheDocument();
    expect(screen.getByText('Energy Boost')).toBeInTheDocument();
    expect(screen.getByText('250 kcal erfasst, aber alle Makros sind 0g')).toBeInTheDocument();
  });

  it('triggers single AI fill missing when wand is clicked', async () => {
    renderWithClient(<NutritionPlausibilityList />);

    const wandButtons = screen.getAllByTitle('Fehlende Stammdaten mit KI ergänzen (bestehende Daten bleiben unverändert)');
    expect(wandButtons.length).toBe(2);

    fireEvent.click(wandButtons[0]);

    await waitFor(() => {
      expect(mockFillSingle).toHaveBeenCalledWith(1);
    });
  });

  it('triggers batch AI fill missing', async () => {
    renderWithClient(<NutritionPlausibilityList />);

    const batchButton = screen.getByRole('button', { name: /mit KI auffüllen/i });
    fireEvent.click(batchButton);

    await waitFor(() => {
      expect(mockFillBatch).toHaveBeenCalledWith({ ingredient_ids: [1, 2] });
    });
  });
});
