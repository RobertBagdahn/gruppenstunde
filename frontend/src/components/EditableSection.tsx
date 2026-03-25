import { useState, type ReactNode } from 'react';

interface EditableSectionProps {
  canEdit: boolean;
  /** The children shown in read-only / display mode */
  children: ReactNode;
  /** Render prop for edit mode — receives onClose callback */
  renderEdit: (onClose: () => void) => ReactNode;
  /** Optional extra class on the wrapper */
  className?: string;
}

/**
 * Wraps a read-only section and adds a small edit-pencil button in the top-right corner.
 * When clicked, the section switches to edit mode using the `renderEdit` render-prop.
 */
export default function EditableSection({
  canEdit,
  children,
  renderEdit,
  className = '',
}: EditableSectionProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <div className={className}>{renderEdit(() => setEditing(false))}</div>;
  }

  return (
    <div className={`group relative ${className}`}>
      {children}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary"
          title="Bearbeiten"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}
    </div>
  );
}
