/**
 * "N Werte fehlen" under a list of key figures (food-progressive-disclosure).
 * Empty rows are hidden; this hint replaces them. Editors get a link.
 */
import { Link } from 'react-router-dom';

interface MissingValuesHintProps {
  count: number;
  /** Edit page; shown as link only when the user may edit. */
  editHref?: string;
  canEdit?: boolean;
}

export default function MissingValuesHint({ count, editHref, canEdit = false }: MissingValuesHintProps) {
  if (count <= 0) return null;
  const label = count === 1 ? '1 Wert fehlt' : `${count} Werte fehlen`;
  if (canEdit && editHref) {
    return (
      <Link to={editHref} className="mt-3 inline-block text-caption font-medium text-primary hover:underline">
        {label} – ergänzen
      </Link>
    );
  }
  return <p className="mt-3 text-caption text-muted-foreground">{label}</p>;
}
