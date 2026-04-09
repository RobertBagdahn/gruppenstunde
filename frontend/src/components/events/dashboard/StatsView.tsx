/**
 * StatsView — Event statistics dashboard with capacity, payment, demographics,
 * nutrition, and registration timeline visualizations.
 * Can be embedded in OverviewTab or used standalone.
 */
import type { Stats } from '@/schemas/event';
import { useEventStats } from '@/api/eventDashboard';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
  /** Compact mode hides some sections for embedding in OverviewTab */
  compact?: boolean;
}

export default function StatsView({ slug, compact = false }: Props) {
  const { data: stats, isLoading, error } = useEventStats(slug);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <span className="material-symbols-outlined text-3xl mb-2 block">error</span>
        Statistiken konnten nicht geladen werden
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Capacity Section */}
      <CapacitySection stats={stats} />

      {/* Payment Section */}
      <PaymentSection stats={stats} />

      {/* Demographics */}
      {!compact && <DemographicsSection stats={stats} />}

      {/* Nutrition */}
      {!compact && stats.nutrition.nutritional_summary.length > 0 && (
        <NutritionSection stats={stats} />
      )}

      {/* Registration Timeline */}
      {!compact && stats.registration_timeline.length > 0 && (
        <RegistrationTimelineSection stats={stats} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capacity Section
// ---------------------------------------------------------------------------

function CapacitySection({ stats }: { stats: Stats }) {
  const { capacity } = stats;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">groups</span>
        Kapazitaet
      </h3>

      {/* Overall bar */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium">Gesamt</span>
          <span className="text-sm text-muted-foreground">
            {capacity.total_registered}
            {capacity.total_capacity > 0 ? ` / ${capacity.total_capacity}` : ''} Teilnehmer
          </span>
        </div>
        <ProgressBar
          percentage={capacity.total_fill_percentage}
          color="violet"
        />
      </div>

      {/* Per booking option */}
      {capacity.booking_options.length > 0 && (
        <div className="space-y-3">
          {capacity.booking_options.map((opt) => (
            <div key={opt.name}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium">{opt.name}</span>
                <span className="text-xs text-muted-foreground">
                  {opt.current_count}
                  {opt.max_participants > 0 ? ` / ${opt.max_participants}` : ''}{' '}
                  ({Math.round(opt.fill_percentage)}%)
                </span>
              </div>
              <ProgressBar
                percentage={opt.fill_percentage}
                color={opt.fill_percentage >= 90 ? 'red' : opt.fill_percentage >= 70 ? 'amber' : 'emerald'}
                small
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment Section
// ---------------------------------------------------------------------------

function PaymentSection({ stats }: { stats: Stats }) {
  const { payment } = stats;

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">account_balance</span>
        Zahlungen
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <MiniStat label="Erwartet" value={`${parseFloat(payment.total_expected).toFixed(2)} €`} />
        <MiniStat label="Erhalten" value={`${parseFloat(payment.total_received).toFixed(2)} €`} color="emerald" />
        <MiniStat label="Ausstehend" value={`${parseFloat(payment.total_outstanding).toFixed(2)} €`} color="amber" />
        <MiniStat label="Bezahlt-Quote" value={`${Math.round(payment.paid_percentage)}%`} color="violet" />
      </div>

      {/* Paid/Unpaid visual */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          <ProgressBar percentage={payment.paid_percentage} color="emerald" />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {payment.paid_count} bezahlt, {payment.unpaid_count} offen
        </span>
      </div>

      {/* By method */}
      {payment.payment_by_method.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Nach Zahlungsmethode
          </p>
          {payment.payment_by_method.map((m) => (
            <div key={m.method} className="flex justify-between text-sm">
              <span>{m.method}</span>
              <span className="text-muted-foreground">
                {m.count}x &middot; {parseFloat(m.total_amount).toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demographics Section
// ---------------------------------------------------------------------------

function DemographicsSection({ stats }: { stats: Stats }) {
  const { demographics } = stats;
  const hasGender = demographics.gender_distribution.length > 0;
  const hasAge = demographics.age_distribution.length > 0;

  if (!hasGender && !hasAge) return null;

  const GENDER_LABELS: Record<string, string> = {
    male: 'Maennlich',
    female: 'Weiblich',
    diverse: 'Divers',
    no_answer: 'Keine Angabe',
  };

  const GENDER_COLORS: Record<string, string> = {
    male: 'bg-blue-400',
    female: 'bg-pink-400',
    diverse: 'bg-purple-400',
    no_answer: 'bg-gray-400',
  };

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">diversity_3</span>
        Demografie
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        {hasGender && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Geschlecht</p>
            {/* Stacked bar */}
            <div className="flex h-4 rounded-full overflow-hidden mb-2">
              {demographics.gender_distribution.map((g) => (
                <div
                  key={g.gender}
                  className={cn(GENDER_COLORS[g.gender] || 'bg-gray-400')}
                  style={{ width: `${g.percentage}%` }}
                  title={`${GENDER_LABELS[g.gender] || g.gender}: ${g.count} (${Math.round(g.percentage)}%)`}
                />
              ))}
            </div>
            <div className="space-y-1">
              {demographics.gender_distribution.map((g) => (
                <div key={g.gender} className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full', GENDER_COLORS[g.gender] || 'bg-gray-400')} />
                    {GENDER_LABELS[g.gender] || g.gender}
                  </span>
                  <span className="text-muted-foreground">
                    {g.count} ({Math.round(g.percentage)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Age Distribution */}
        {hasAge && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Altersgruppen</p>
            <div className="space-y-2">
              {demographics.age_distribution.map((a) => (
                <div key={a.age_group}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <span>{a.age_group}</span>
                    <span className="text-muted-foreground">
                      {a.count} ({Math.round(a.percentage)}%)
                    </span>
                  </div>
                  <ProgressBar percentage={a.percentage} color="violet" small />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nutrition Section
// ---------------------------------------------------------------------------

function NutritionSection({ stats }: { stats: Stats }) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">restaurant</span>
        Ernaehrung
      </h3>
      <div className="flex flex-wrap gap-2">
        {stats.nutrition.nutritional_summary.map((n) => (
          <span
            key={n.tag_name}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-lg bg-amber-50 text-amber-700 border border-amber-200"
          >
            {n.tag_name}
            <span className="text-xs font-semibold bg-amber-100 px-1 rounded">
              {n.count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration Timeline Section (simple text-based, no chart lib)
// ---------------------------------------------------------------------------

function RegistrationTimelineSection({ stats }: { stats: Stats }) {
  const points = stats.registration_timeline;
  if (points.length === 0) return null;

  const maxCount = Math.max(...points.map((p) => p.cumulative_count), 1);

  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">show_chart</span>
        Anmeldeverlauf
      </h3>
      {/* Simple bar chart */}
      <div className="space-y-1">
        {points.map((p) => {
          const pct = (p.cumulative_count / maxCount) * 100;
          return (
            <div key={p.date} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {new Date(p.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </span>
              <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-xs font-medium w-8 text-right">{p.cumulative_count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function ProgressBar({
  percentage,
  color,
  small,
}: {
  percentage: number;
  color: 'violet' | 'emerald' | 'amber' | 'red';
  small?: boolean;
}) {
  const colorMap = {
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className={cn('w-full bg-muted/40 rounded-full overflow-hidden', small ? 'h-1.5' : 'h-2.5')}>
      <div
        className={cn('h-full rounded-full transition-all', colorMap[color])}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'emerald' | 'amber' | 'violet';
}) {
  const colorClass = color
    ? { emerald: 'text-emerald-700', amber: 'text-amber-700', violet: 'text-violet-700' }[color]
    : '';

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold', colorClass)}>{value}</p>
    </div>
  );
}
