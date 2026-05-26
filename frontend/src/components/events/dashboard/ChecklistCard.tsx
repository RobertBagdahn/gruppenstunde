/**
 * ChecklistCard — Publish readiness checklist with progress bar.
 * Shows green/red items with links to the relevant settings.
 * Used in the combined OverviewTab for managers.
 */
import { useEventChecklist } from '@/api/eventDashboard';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
}

export default function ChecklistCard({ slug }: Props) {
  const { data: checklist, isLoading } = useEventChecklist(slug);
  const [, setSearchParams] = useSearchParams();

  if (isLoading) {
    return (
      <div className="rounded-xl border p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-2 bg-muted rounded w-full mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  if (!checklist || checklist.items.length === 0) return null;

  const metCount = checklist.items.filter((i) => i.is_met).length;
  const totalCount = checklist.items.length;
  const progressPct = Math.round((metCount / totalCount) * 100);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">checklist</span>
          Veröffentlichungs-Checkliste
        </h3>
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            checklist.all_met
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700',
          )}
        >
          {metCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            checklist.all_met
              ? 'bg-green-500'
              : progressPct >= 50
                ? 'bg-amber-500'
                : 'bg-red-500',
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {checklist.items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className={cn(
                'material-symbols-outlined text-[16px]',
                item.is_met ? 'text-green-600' : 'text-red-500',
              )}
            >
              {item.is_met ? 'check_circle' : 'cancel'}
            </span>
            {item.is_met ? (
              <span className="text-sm text-muted-foreground">{item.label}</span>
            ) : (
              <button
                onClick={() => {
                  // item.link is typically a tab key like "settings"
                  if (item.link) {
                    setSearchParams({ tab: item.link }, { replace: true });
                  }
                }}
                className="text-sm text-blue-600 hover:underline text-left"
              >
                {item.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {checklist.all_met && (
        <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          Bereit zur Veröffentlichung!
        </p>
      )}
    </div>
  );
}
