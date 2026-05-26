/**
 * ContentCard — Generic content card used across all content types.
 * Displays image, title, summary, tags, difficulty, execution time, type badge,
 * and scout level badges. Compact layout optimized for 5-column grids.
 * Optionally shows edit/delete action icons for authorized users.
 */
import { Link } from 'react-router-dom';
import type { ContentListItem, Tag, ScoutLevel } from '@/schemas/content';
import { DIFFICULTY_OPTIONS, EXECUTION_TIME_OPTIONS } from '@/schemas/content';
import { cn } from '@/lib/utils';

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

const SCOUT_LEVEL_COLORS: Record<string, string> = {
  'Wölflinge': 'bg-orange-50 text-orange-700 border border-orange-300',
  'Jungpfadfinder': 'bg-blue-50 text-blue-700 border border-blue-300',
  'Pfadfinder': 'bg-green-50 text-green-700 border border-green-300',
  'Rover': 'bg-red-50 text-red-700 border border-red-300',
};

function getScoutLevelColor(name: string): string {
  return SCOUT_LEVEL_COLORS[name] ?? 'bg-gray-50 text-gray-700 border border-gray-300';
}

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
          className={cn(
            "w-full h-full transition-transform duration-500 group-hover:scale-110",
            content.image_url ? "object-cover" : "object-contain p-4 bg-muted/30"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Like badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[11px] font-extrabold text-rose-500 shadow-md">
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
          {content.like_score}
        </div>
        {/* Type badge */}
        {typeLabel && (
          <div
            className={`absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[11px] font-extrabold shadow-md ${typeBadgeColor}`}
          >
            {typeIcon && (
              <span className="material-symbols-outlined text-[12px]">{typeIcon}</span>
            )}
            {typeLabel}
          </div>
        )}
        {/* Admin action icons */}
        {hasActions && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm text-foreground shadow-md hover:bg-white transition-colors"
                title="Bearbeiten"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm text-destructive shadow-md hover:bg-white transition-colors"
                title="Löschen"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-extrabold text-sm group-hover:text-primary transition-colors truncate">
          {content.title}
        </h3>

        {content.summary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{content.summary}</p>
        )}

        {/* Scout Level Badges */}
        {content.scout_levels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.scout_levels.slice(0, 2).map((level: ScoutLevel) => (
              <span
                key={level.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getScoutLevelColor(level.name)}`}
              >
                {level.icon && <span className="material-symbols-outlined text-[11px] mr-0.5">{level.icon}</span>}
                {level.name}
              </span>
            ))}
            {content.scout_levels.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 text-[10px] font-bold">
                +{content.scout_levels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.tags.slice(0, 3).map((tag: Tag, index: number) => (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_COLORS[index % TAG_COLORS.length]}`}
              >
                {tag.icon && (
                  <span className="material-symbols-outlined text-[11px] mr-0.5">{tag.icon}</span>
                )}
                {tag.name}
              </span>
            ))}
            {content.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2 py-0.5 text-[10px] font-bold">
                +{content.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1 bg-[hsl(174,60%,41%)]/10 rounded-full px-2 py-0.5">
            <span
              className="material-symbols-outlined text-[13px] text-[hsl(174,60%,41%)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
            {timeLabel}
          </span>
          <span className="flex items-center gap-1 bg-accent/10 rounded-full px-2 py-0.5">
            <span
              className="material-symbols-outlined text-[13px] text-accent"
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
