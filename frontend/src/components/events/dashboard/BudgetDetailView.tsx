/**
 * BudgetDetailView — Full budget management with CRUD for budget items.
 * Shows income, expenses, balance, and a list of items by category.
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useBudgetSummary,
  useCreateBudgetItem,
  useDeleteBudgetItem,
} from '@/api/eventDashboard';
import type { BudgetItem } from '@/schemas/event';
import ConfirmDialog from '@/components/ConfirmDialog';

const CATEGORY_LABELS: Record<string, string> = {
  material: 'Material',
  food: 'Verpflegung',
  transport: 'Transport',
  venue: 'Unterkunft',
  other: 'Sonstiges',
};

interface Props {
  slug: string;
}

export default function BudgetDetailView({ slug }: Props) {
  const { data: summary, isLoading } = useBudgetSummary(slug);
  const createItem = useCreateBudgetItem(slug);
  const deleteItem = useDeleteBudgetItem(slug);

  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [isExpense, setIsExpense] = useState(true);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, BudgetItem[]> = {};
    (summary?.items ?? []).forEach((item) => {
      const key = item.category || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [summary]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    createItem.mutate(
      { description: description.trim(), amount, category, is_expense: isExpense },
      {
        onSuccess: () => {
          toast.success('Posten hinzugefügt');
          setDescription('');
          setAmount('');
          setCategory('other');
          setIsExpense(true);
          setShowForm(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteItem.mutate(id, {
      onSuccess: () => {
        toast.success('Posten gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-xl animate-spin mr-2">progress_activity</span>
        Wird geladen...
      </div>
    );
  }

  const income = parseFloat(summary?.total_income ?? '0');
  const expectedIncome = parseFloat(summary?.expected_income ?? '0');
  const expenses = parseFloat(summary?.total_expenses ?? '0');
  const balance = parseFloat(summary?.balance ?? '0');

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Einnahmen" value={income} color="emerald" />
        <SummaryCard label="Erwartete Einnahmen" value={expectedIncome} color="blue" />
        <SummaryCard label="Ausgaben" value={expenses} color="red" />
        <SummaryCard label="Saldo" value={balance} color={balance >= 0 ? 'emerald' : 'red'} prefix={balance >= 0 ? '+' : ''} />
      </div>

      {/* Add Button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Neuen Posten hinzufügen
        </button>
      ) : (
        <form onSubmit={handleCreate} className="border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Beschreibung *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
                placeholder="z.B. Zeltvermietung"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Betrag (&euro;) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={isExpense}
                onChange={() => setIsExpense(true)}
                className="accent-red-600"
              />
              Ausgabe
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={!isExpense}
                onChange={() => setIsExpense(false)}
                className="accent-emerald-600"
              />
              Einnahme
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createItem.isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white disabled:opacity-50"
            >
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Items by Category */}
      {Object.entries(groupedItems).map(([cat, items]) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            {CATEGORY_LABELS[cat] ?? cat}
          </h4>
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[16px] ${item.is_expense ? 'text-red-500' : 'text-emerald-500'}`}>
                    {item.is_expense ? 'remove_circle' : 'add_circle'}
                  </span>
                  <span>{item.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${item.is_expense ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.is_expense ? '-' : '+'}{parseFloat(item.amount).toFixed(2)}&euro;
                  </span>
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {(summary?.items ?? []).length === 0 && !showForm && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">account_balance</span>
          Noch keine Budgetposten
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Posten löschen?"
        description="Der Budgetposten wird unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteItem.isPending}
      />
    </div>
  );
}

function SummaryCard({ label, value, color, prefix = '' }: { label: string; value: number; color: string; prefix?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <p className={`text-lg font-bold ${colorMap[color] ?? ''}`}>
        {prefix}{value.toFixed(2)}&euro;
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
