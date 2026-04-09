/**
 * AuthorInfo — Displays author information with optional link to profile.
 * Used on content detail pages to show who created or co-authored the content.
 */
import { Link } from 'react-router-dom';

/** Loose author type that accepts both Zod output (strict) and input (optional defaults) */
interface Author {
  id?: number | null;
  display_name: string;
  scout_name?: string;
  profile_picture_url?: string | null;
  is_registered?: boolean;
}

interface AuthorInfoProps {
  authors: Author[];
  /** Optional created_at date string for "published on" display */
  createdAt?: string;
  /** Optional class name */
  className?: string;
}

export default function AuthorInfo({ authors, createdAt, className = '' }: AuthorInfoProps) {
  if (authors.length === 0 && !createdAt) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm text-muted-foreground ${className}`}>
      {authors.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span>
            {authors.map((author, i) => (
              <span key={author.id ?? i}>
                {i > 0 && ', '}
                {author.is_registered && author.id ? (
                  <Link
                    to={`/user/${author.id}`}
                    className="text-primary hover:underline"
                  >
                    {author.display_name}
                    {author.scout_name ? ` (${author.scout_name})` : ''}
                  </Link>
                ) : (
                  <span>
                    {author.display_name}
                    {author.scout_name ? ` (${author.scout_name})` : ''}
                  </span>
                )}
              </span>
            ))}
          </span>
        </div>
      )}

      {createdAt && (
        <div className="flex items-center gap-1.5">
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
    </div>
  );
}
