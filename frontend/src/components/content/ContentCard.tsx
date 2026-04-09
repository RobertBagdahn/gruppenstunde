/**
 * ContentCard — Generic content card used across all content types.
 * Displays image, title, summary, tags, difficulty, execution time, and type badge.
 * Optionally shows edit/delete action icons for authorized users.
 */
import { Link } from 'react-router-dom';
import type { ContentListItem, Tag } from '@/schemas/content';
import { DIFFICULTY_OPTIONS, EXECUTION_TIME_OPTIONS } from '@/schemas/content';

interface ContentCardProps {
  /** The content item to display */
  content: ContentListItem;
  /** URL path to link to (e.g. /sessions/my-slug) */
  href: string;
  /** Content type label (e.g. "Gruppenstunde", "Rezept") */
  typeLabel?: string;
  /** Material Symbols icon for the type badge */
  typeIcon?: string;
  /** Tailwind text color for the type badge */
  typeBadgeColor?: string;
  /** Whether the user can edit this item */
  canEdit?: boolean;
  /** Whether the user can delete this item */
  canDelete?: boolean;
  /** Callback when the edit icon is clicked */
  onEdit?: () => void;
  /** Callback when the delete icon is clicked */
  onDelete?: () => void;
}

const TAG_COLORS = [
  'bg-primary/15 text-primary border border-primary/20',
  'bg-[hsl(174,60%,41%)]/15 text-[hsl(174,60%,41%)] border border-[hsl(174,60%,41%)]/20',
  'bg-accent/15 text-accent border border-accent/20',
  'bg-violet-500/15 text-violet-600 border border-violet-500/20',
  'bg-rose-500/15 text-rose-600 border border-rose-500/20',
];

export default function ContentCard({
  content,
  href,
  typeLabel,
  typeIcon,
  typeBadgeColor = 'text-violet-600',
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ContentCardProps) {
  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === content.difficulty)?.label ?? content.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === content.execution_time)?.label ??
    content.execution_time;

  const hasActions = (canEdit && onEdit) || (canDelete && onDelete);

  return (
    <Link
      to={href}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-square">
        <img
          src={content.image_url || '/images/inspi_flying.png'}
          alt={content.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Like badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-rose-500 shadow-md">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          {content.like_score}
        </div>
        {/* Type badge */}
        {typeLabel && (
          <div
            className={`absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold shadow-md ${typeBadgeColor}`}
          >
            {typeIcon && (
              <span className="material-symbols-outlined text-[14px]">{typeIcon}</span>
            )}
            {typeLabel}
          </div>
        )}
        {/* Admin action icons */}
        {hasActions && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors"
                title="Bearbeiten"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-destructive shadow-md hover:bg-white transition-colors"
                title="Loeschen"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-extrabold text-base group-hover:text-primary transition-colors line-clamp-2">
          {content.title}
        </h3>

        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{content.summary}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {content.tags.slice(0, 3).map((tag: Tag, index: number) => (
            <span
              key={tag.id}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${TAG_COLORS[index % TAG_COLORS.length]}`}
            >
              {tag.icon && (
                <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>
              )}
              {tag.name}
            </span>
          ))}
          {content.tags.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2.5 py-0.5 text-xs font-bold">
              +{content.tags.length - 3}
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-[hsl(174,60%,41%)]/10 rounded-full px-2.5 py-1">
            <span
              className="material-symbols-outlined text-[16px] text-[hsl(174,60%,41%)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1.5 bg-accent/10 rounded-full px-2.5 py-1">
            <span
              className="material-symbols-outlined text-[16px] text-accent"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              signal_cellular_alt
            </span>
            {difficultyLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}
