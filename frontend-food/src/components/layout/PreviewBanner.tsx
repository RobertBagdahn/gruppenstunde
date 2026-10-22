import { Eye } from 'lucide-react';
import { IS_PREVIEW } from '@/lib/preview';

/** Shown in preview builds only: the app runs on production data and cannot change it. */
export default function PreviewBanner() {
  if (!IS_PREVIEW) return null;
  return (
    <div
      data-print-hide
      role="status"
      className="flex items-center justify-center gap-2 border-b border-info-border bg-info-soft px-4 py-2 text-body font-semibold text-info"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      Vorschau – nur ansehen
    </div>
  );
}
