/**
 * ContentAuthorSection — Reusable author section for content detail pages.
 * Displays author avatars, names, and profile links in a consistent card format.
 * Positioned before comments on all content detail pages.
 */
import { EntityLink } from '@/components/shared/EntityLink';

/** Loose author type compatible with both Zod output and input */
interface Author {
  id?: number | null;
  display_name: string;
  scout_name?: string;
  profile_picture_url?: string | null;
  is_registered?: boolean;
}

interface ContentAuthorSectionProps {
  authors: Author[];
  createdAt?: string;
  className?: string;
}

export default function ContentAuthorSection({
  authors,
  createdAt,
  className = '',
}: ContentAuthorSectionProps) {
  if (authors.length === 0 && !createdAt) return null;

  return (
    <section className={`bg-card rounded-xl border p-5 ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        <span className="material-symbols-outlined text-[18px]">person</span>
        {authors.length === 1 ? 'Autor' : 'Autoren'}
      </h2>
      <div className="flex flex-wrap gap-3">
        {authors.map((author, idx) => {
          const inner = (
            <div className="flex items-center gap-3">
              {author.profile_picture_url ? (
                <img
                  src={author.profile_picture_url}
                  alt={author.display_name}
                  className="w-10 h-10 rounded-full object-cover border"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 border flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    person
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm font-medium">
                  {author.display_name}
                  {author.scout_name && author.scout_name !== author.display_name ? ` (${author.scout_name})` : ''}
                </span>
              </div>
            </div>
          );

          if (author.is_registered && author.id) {
            return (
              <EntityLink
                key={author.id}
                type="user"
                id={author.id}
                name={author.display_name}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                {inner}
              </EntityLink>
            );
          }
          return (
            <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2">
              {inner}
            </div>
          );
        })}
      </div>

      {createdAt && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleDateString('de-DE', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </div>
      )}
    </section>
  );
}
