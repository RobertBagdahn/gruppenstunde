import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import type { Portion } from '@/schemas/supply';
import { StandardPortionBadge } from './StandardPortionBadge';

interface SortablePortionItemProps {
  portion: Portion;
  children: React.ReactNode;
  isDragging?: boolean;
  canEdit?: boolean;
}

/**
 * A sortable portion list item with drag handle.
 * The 'g' portion is excluded from sorting (always last).
 * Drag is disabled when canEdit is false.
 */
export function SortablePortionItem({ portion, children, isDragging, canEdit = false }: SortablePortionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: portion.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isStandard = portion.rank === 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
        isStandard ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-border hover:bg-muted/50'
      }`}
    >
      {portion.name !== 'g' && canEdit && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1">{children}</div>

      <StandardPortionBadge isStandard={isStandard} />
    </div>
  );
}
