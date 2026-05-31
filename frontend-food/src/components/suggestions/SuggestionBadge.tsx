import { SUGGESTION_STATUS_COLORS } from '@/schemas/suggestions';

interface SuggestionBadgeProps {
  summaryStatus: 'green' | 'yellow' | 'red';
  nonGreenCount: number;
}

export default function SuggestionBadge({ summaryStatus, nonGreenCount }: SuggestionBadgeProps) {
  if (summaryStatus === 'green') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <span className="material-symbols-outlined text-base">check_circle</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${SUGGESTION_STATUS_COLORS[summaryStatus]}`}>
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-current" />
      <span className="text-sm font-medium">{nonGreenCount}</span>
    </span>
  );
}
