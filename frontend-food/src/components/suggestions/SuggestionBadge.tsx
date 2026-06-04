import { CheckCircle2 } from 'lucide-react';

interface SuggestionBadgeProps {
  summaryStatus: 'green' | 'yellow' | 'red';
  nonGreenCount: number;
}

const statusColors = {
  green: 'text-primary',
  yellow: 'text-[hsl(var(--chart-2))]',
  red: 'text-destructive',
};

export default function SuggestionBadge({ summaryStatus, nonGreenCount }: SuggestionBadgeProps) {
  if (summaryStatus === 'green') {
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${statusColors[summaryStatus]}`}>
      <span className="inline-block w-2.5 h-2.5 rounded-full bg-current" />
      <span className="text-sm font-semibold">{nonGreenCount}</span>
    </span>
  );
}
