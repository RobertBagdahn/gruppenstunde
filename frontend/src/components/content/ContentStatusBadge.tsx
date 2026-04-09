/**
 * ContentStatusBadge — Status badge with semantic colors.
 */
import { CONTENT_STATUS_OPTIONS } from '@/schemas/content';

interface ContentStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  archived: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_ICONS: Record<string, string> = {
  draft: 'edit_note',
  submitted: 'pending',
  approved: 'check_circle',
  rejected: 'cancel',
  archived: 'archive',
};

export default function ContentStatusBadge({ status, className = '' }: ContentStatusBadgeProps) {
  const label =
    CONTENT_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  const icon = STATUS_ICONS[status] ?? 'info';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style} ${className}`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </span>
  );
}
