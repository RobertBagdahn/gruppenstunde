import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface StandardPortionBadgeProps {
  isStandard: boolean;
}

/**
 * Badge indicating that a portion is the standard/default (rank=1) portion.
 */
export function StandardPortionBadge({ isStandard }: StandardPortionBadgeProps) {
  if (!isStandard) {
    return null;
  }

  return (
    <Badge variant="default" className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600">
      <Star className="h-3 w-3" />
      Standard
    </Badge>
  );
}
