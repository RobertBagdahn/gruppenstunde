/**
 * BlogCard — Dedicated card for blog content with reading time display.
 * Shows reading time, summary, tags, and type badge.
 */
import { Link } from 'react-router-dom';
import type { BlogListItem } from '@/schemas/blog';
import type { Tag } from '@/schemas/content';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  'bg-primary/15 text-primary border border-primary/20',
  'bg-[hsl(174,60%,41%)]/15 text-[hsl(174,60%,41%)] border border-[hsl(174,60%,41%)]/20',
  'bg-accent/15 text-accent border border-accent/20',
  'bg-violet-500/15 text-violet-600 border border-violet-500/20',
  'bg-rose-500/15 text-rose-600 border border-rose-500/20',
];

interface BlogCardProps {
  blog: BlogListItem;
  /** Content type label (e.g. "Tutorial", "Ratgeber") */
  typeLabel?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function BlogCard({
  blog,
  typeLabel,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: BlogCardProps) {
  const hasActions = (canEdit && onEdit) || (canDelete && onDelete);

  return (
    <Link
      to={`/blogs/${blog.slug}`}
      className="group block rounded-2xl bg-card overflow-hidden shadow-soft card-hover border border-border/50 hover:border-primary/40 hover:shadow-colorful"
    >
      {/* Image with gradient overlay */}
      <div className="relative overflow-hidden aspect-square">
        <img
          src={blog.image_url || '/images/inspi_flying.png'}
          alt={blog.title}
          loading="lazy"
          className={cn(
            "w-full h-full transition-transform duration-500 group-hover:scale-110",
            blog.image_url ? "object-cover" : "object-contain p-4 bg-muted/30"
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
          {blog.like_score}
        </div>
        {/* Type badge */}
        {typeLabel && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 text-[11px] font-extrabold text-indigo-600 shadow-md">
            <span className="material-symbols-outlined text-[12px]">article</span>
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
          {blog.title}
        </h3>

        {blog.summary && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{blog.summary}</p>
        )}

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {blog.tags.slice(0, 3).map((tag: Tag, index: number) => (
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
            {blog.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30 px-2 py-0.5 text-[10px] font-bold">
                +{blog.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta info - Reading time */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/50 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1 bg-indigo-500/10 rounded-full px-2 py-0.5">
            <span
              className="material-symbols-outlined text-[13px] text-indigo-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
            {blog.reading_time_minutes} Min. Lesezeit
          </span>
        </div>
      </div>
    </Link>
  );
}
