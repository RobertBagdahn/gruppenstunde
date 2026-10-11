/**
 * Tests for <BudgetCard>: amounts must use German currency formatting
 * ("1.234,50 €") instead of `toFixed(2)` ("1234.50€").
 */
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useBudgetSummary } from '@/api/eventDashboard';
import BudgetCard from './BudgetCard';

vi.mock('@/api/eventDashboard', () => ({ useBudgetSummary: vi.fn() }));

type BudgetSummaryQuery = ReturnType<typeof useBudgetSummary>;

function renderWithSummary(totalIncome: string, totalExpenses: string, balance: string): string {
  vi.mocked(useBudgetSummary).mockReturnValue({
    data: {
      total_income: totalIncome,
      expected_income: totalIncome,
      total_expenses: totalExpenses,
      balance,
      items: [],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as Partial<BudgetSummaryQuery> as BudgetSummaryQuery);
  // Intl separates amount and symbol with a non-breaking space.
  return renderToStaticMarkup(<BudgetCard slug="test-event" />).replace(/\u00A0/g, ' ');
}

describe('BudgetCard', () => {
  it('formats zero amounts as German euro currency', () => {
    const html = renderWithSummary('0.00', '0.00', '0.00');
    expect(html).toContain('0,00 €');
    expect(html).not.toContain('0.00');
  });

  it('formats income, expenses and balance with thousands separator and decimal comma', () => {
    const html = renderWithSummary('1234.50', '200.00', '1034.50');
    expect(html).toContain('1.234,50 €');
    expect(html).toContain('200,00 €');
    expect(html).toContain('+1.034,50 €');
  });
});
