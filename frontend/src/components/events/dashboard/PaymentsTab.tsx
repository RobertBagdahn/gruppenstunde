/**
 * PaymentsTab — Payment list with summary cards, filters, and "Zahlung erfassen" form.
 *
 * Filters are URL-driven via query parameters:
 * ?method=bar|paypal|...&date-from=...&date-to=...
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { EventDetail, Participant } from '@/schemas/event';
import {
  useEventPayments,
  useCreatePayment,
  useDeletePayment,
  usePaymentMethodChoices,
} from '@/api/eventDashboard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useFilterParams, type FilterField } from './FilterBar';

interface Props {
  event: EventDetail;
}

const METHOD_ICONS: Record<string, string> = {
  bar: 'payments',
  paypal: 'account_balance_wallet',
  ueberweisung: 'account_balance',
  sonstige: 'more_horiz',
};

export default function PaymentsTab({ event }: Props) {
  const { data: payments, isLoading } = useEventPayments(event.slug);
  const { data: methodChoices } = usePaymentMethodChoices();
  const deletePayment = useDeletePayment(event.slug);

  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Get all participants for the dropdown
  const allParticipants: Participant[] =
    event.all_registrations?.flatMap((r) => r.participants) ?? [];

  // Build filter fields
  const filterFields: FilterField[] = useMemo(() => [
    {
      param: 'method',
      label: 'Zahlungsmethode',
      type: 'select' as const,
      options: (methodChoices ?? []).map((c) => ({
        value: c.value,
        label: c.label,
      })),
    },
    {
      param: 'date',
      label: 'Zeitraum',
      type: 'date-range' as const,
    },
  ], [methodChoices]);

  // Read filter values from URL
  const { getValue, getDateRange } = useFilterParams(filterFields);
  const filterMethod = getValue('method');
  const dateRange = getDateRange('date');

  // Client-side filtering
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter((p) => {
      if (filterMethod && p.method !== filterMethod) return false;
      if (dateRange.from) {
        const paymentDate = new Date(p.received_at).toISOString().slice(0, 10);
        if (paymentDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const paymentDate = new Date(p.received_at).toISOString().slice(0, 10);
        if (paymentDate > dateRange.to) return false;
      }
      return true;
    });
  }, [payments, filterMethod, dateRange]);

  // Summary calculations (on filtered payments)
  const totalReceived = filteredPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0,
  );
  const totalExpected = allParticipants.reduce((sum, p) => {
    const opt = event.booking_options.find((o) => o.id === p.booking_option_id);
    return sum + (opt ? parseFloat(opt.price) : 0);
  }, 0);
  const totalOutstanding = Math.max(0, totalExpected - totalReceived);
  const paidPercentage =
    totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 100;

  const handleDelete = (paymentId: number) => {
    deletePayment.mutate(paymentId, {
      onSuccess: () => {
        toast.success('Zahlung gelöscht');
        setConfirmDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon="savings"
          label="Gesamteinnahmen"
          value={`${totalReceived.toFixed(2)}\u00A0\u20AC`}
          color="emerald"
        />
        <SummaryCard
          icon="pending"
          label="Ausstehend"
          value={`${totalOutstanding.toFixed(2)}\u00A0\u20AC`}
          color="amber"
        />
        <SummaryCard
          icon="percent"
          label="Bezahlt-Quote"
          value={`${paidPercentage}%`}
          color="violet"
        />
      </div>

      {/* Filters (URL-driven) */}
      <PaymentFilters
        filterFields={filterFields}
      />

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">
          Zahlungen ({filteredPayments.length}{filteredPayments.length !== (payments ?? []).length ? ` von ${(payments ?? []).length}` : ''})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Zahlung erfassen
        </button>
      </div>

      {/* Create Payment Form */}
      {showForm && (
        <PaymentForm
          participants={allParticipants}
          methodChoices={methodChoices ?? []}
          slug={event.slug}
          onCreated={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Payment List */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      ) : (payments ?? []).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">
            account_balance_wallet
          </span>
          Noch keine Zahlungen erfasst
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block">
            filter_list_off
          </span>
          Keine Zahlungen für diesen Filter
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="border rounded-xl p-3 flex items-center gap-3"
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  'bg-emerald-50 text-emerald-700',
                )}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {METHOD_ICONS[payment.method] ?? 'payments'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {payment.participant_name}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {payment.method_display}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  <span>
                    {new Date(payment.received_at).toLocaleDateString('de-DE')}
                  </span>
                  {payment.location && <span>{payment.location}</span>}
                  {payment.created_by_email && (
                    <span>von {payment.created_by_email}</span>
                  )}
                </div>
                {payment.note && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                    {payment.note}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm text-emerald-700">
                  +{parseFloat(payment.amount).toFixed(2)}&nbsp;&euro;
                </p>
              </div>
              <button
                onClick={() => setConfirmDeleteId(payment.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Zahlung löschen"
              >
                <span className="material-symbols-outlined text-[18px]">
                  delete
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
        title="Zahlung löschen?"
        description="Die Zahlung wird unwiderruflich gelöscht und der Bezahlt-Status des Teilnehmers aktualisiert."
        confirmLabel="Löschen"
        loading={deletePayment.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: 'emerald' | 'amber' | 'violet';
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}
        >
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Form
// ---------------------------------------------------------------------------

function PaymentForm({
  participants,
  methodChoices,
  slug,
  onCreated,
  onCancel,
}: {
  participants: Participant[];
  methodChoices: { value: string; label: string }[];
  slug: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const createPayment = useCreatePayment(slug);
  const [participantId, setParticipantId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bar');
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  // Pre-fill amount when participant changes

  const handleParticipantChange = (id: string) => {
    setParticipantId(id);
    const p = participants.find((pp) => String(pp.id) === id);
    if (p && parseFloat(p.remaining_amount) > 0) {
      setAmount(parseFloat(p.remaining_amount).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantId || !amount) return;

    createPayment.mutate(
      {
        participant_id: Number(participantId),
        amount,
        method,
        received_at: new Date(receivedAt).toISOString(),
        location: location || undefined,
        note: note || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Zahlung erfasst');
          onCreated();
        },
        onError: (err) =>
          toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 space-y-4 bg-muted/30"
    >
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">
          add_card
        </span>
        Neue Zahlung erfassen
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Participant */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Teilnehmer *
          </label>
          <select
            value={participantId}
            onChange={(e) => handleParticipantChange(e.target.value)}
            required
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          >
            <option value="">Bitte wählen...</option>
            {participants.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.first_name} {p.last_name}
                {parseFloat(p.remaining_amount) > 0
                  ? ` (${parseFloat(p.remaining_amount).toFixed(2)}\u00A0\u20AC offen)`
                  : p.is_paid
                    ? ' (bezahlt)'
                    : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Betrag (&euro;) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="0.00"
          />
        </div>

        {/* Method */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Zahlungsmethode
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          >
            {methodChoices.length > 0
              ? methodChoices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))
              : (
                  <>
                    <option value="bar">Bar</option>
                    <option value="paypal">PayPal</option>
                    <option value="ueberweisung">Überweisung</option>
                    <option value="sonstige">Sonstige</option>
                  </>
                )}
          </select>
        </div>

        {/* Received At */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Erhalten am
          </label>
          <input
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
          />
        </div>

        {/* Location */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Ort
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="z.B. Zeltplatz Kasse"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Bemerkung
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={createPayment.isPending || !participantId || !amount}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          {createPayment.isPending ? 'Speichern...' : 'Zahlung speichern'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Payment Filters — uses useFilterParams hook (must be its own component)
// ---------------------------------------------------------------------------

function PaymentFilters({ filterFields }: { filterFields: FilterField[] }) {
  const { getValue, getDateRange, setValue, setDateRange, activeCount, clearAll } =
    useFilterParams(filterFields);

  const methodField = filterFields.find((f) => f.param === 'method');
  const dateField = filterFields.find((f) => f.param === 'date');

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {methodField && (
        <select
          value={getValue('method')}
          onChange={(e) => setValue('method', e.target.value)}
          className={cn(
            'text-sm border rounded-lg px-3 py-2 bg-background',
            getValue('method') && 'border-violet-300 bg-violet-50/50',
          )}
        >
          <option value="">Zahlungsmethode</option>
          {methodField.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {dateField && (
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground shrink-0">Zeitraum:</label>
          <input
            type="date"
            value={getDateRange('date').from}
            onChange={(e) => setDateRange('date', e.target.value, getDateRange('date').to)}
            className={cn(
              'text-sm border rounded-lg px-2 py-1.5 bg-background w-32',
              getDateRange('date').from && 'border-violet-300 bg-violet-50/50',
            )}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={getDateRange('date').to}
            onChange={(e) => setDateRange('date', getDateRange('date').from, e.target.value)}
            className={cn(
              'text-sm border rounded-lg px-2 py-1.5 bg-background w-32',
              getDateRange('date').to && 'border-violet-300 bg-violet-50/50',
            )}
          />
        </div>
      )}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[12px]">close</span>
          Zurücksetzen
        </button>
      )}
    </div>
  );
}
