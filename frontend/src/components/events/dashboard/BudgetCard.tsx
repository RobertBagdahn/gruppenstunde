/**
 * BudgetCard — Budget summary card for OverviewTab.
 * Shows income vs expense bar and a link to the full budget view.
 */
import { useBudgetSummary } from '@/api/eventDashboard';

interface Props {
  slug: string;
  onGoToBudget?: () => void;
}

export default function BudgetCard({ slug, onGoToBudget }: Props) {
  const { data: summary, isLoading } = useBudgetSummary(slug);

  if (isLoading || !summary) return null;

  const income = parseFloat(summary.total_income);
  const expenses = parseFloat(summary.total_expenses);
  const balance = parseFloat(summary.balance);
  const maxVal = Math.max(income, expenses, 1);

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px]">account_balance</span>
        Budget
      </h3>

      <div className="space-y-2">
        {/* Income bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Einnahmen</span>
            <span className="font-medium text-emerald-600">{income.toFixed(2)}&euro;</span>
          </div>
          <div className="h-2 bg-muted rounded-full">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(income / maxVal) * 100}%` }}
            />
          </div>
        </div>

        {/* Expense bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Ausgaben</span>
            <span className="font-medium text-red-600">{expenses.toFixed(2)}&euro;</span>
          </div>
          <div className="h-2 bg-muted rounded-full">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${(expenses / maxVal) * 100}%` }}
            />
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs font-medium text-muted-foreground">Saldo</span>
          <span className={`text-sm font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}&euro;
          </span>
        </div>
      </div>

      {onGoToBudget && (
        <button
          onClick={onGoToBudget}
          className="mt-3 text-xs text-violet-600 hover:underline flex items-center gap-1"
        >
          Budget verwalten
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      )}
    </div>
  );
}
