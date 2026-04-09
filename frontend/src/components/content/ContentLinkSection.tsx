/**
 * ContentLinkSection — Displays related content grouped by type.
 *
 * Shows sections like "Passende Spiele", "Passende Rezepte" etc.
 * Each section shows up to 6 linked content items as compact cards.
 * Sections with no items are hidden.
 */
import { Link } from 'react-router-dom';
import { useContentLinks } from '@/api/contentLinks';
import { CONTENT_TYPE_LABELS, type ContentLink } from '@/schemas/contentLink';

interface ContentLinkSectionProps {
  /** Model name of the current content (e.g., "groupsession", "recipe") */
  contentType: string;
  /** ID of the current content item */
  objectId: number;
}

/** Group links by the "other" content type (relative to current content). */
function groupLinksByRelatedType(
  links: ContentLink[],
  currentType: string,
  currentId: number,
): Record<string, ContentLink[]> {
  const grouped: Record<string, ContentLink[]> = {};

  for (const link of links) {
    // Determine which end is the "related" content
    let relatedType: string;
    if (link.source_content_type === currentType && link.source_object_id === currentId) {
      relatedType = link.target_content_type;
    } else {
      relatedType = link.source_content_type;
    }

    if (!grouped[relatedType]) {
      grouped[relatedType] = [];
    }
    if (grouped[relatedType].length < 6) {
      grouped[relatedType].push(link);
    }
  }

  return grouped;
}

/** Get title, slug, and image for the "related" side of a link. */
function getRelatedInfo(link: ContentLink, currentType: string, currentId: number) {
  if (link.source_content_type === currentType && link.source_object_id === currentId) {
    return {
      title: link.target_title,
      slug: link.target_slug,
      imageUrl: link.target_image_url,
      type: link.target_content_type,
    };
  }
  return {
    title: link.source_title,
    slug: link.source_slug,
    imageUrl: link.source_image_url,
    type: link.source_content_type,
  };
}

function RelatedCard({ link, currentType, currentId }: {
  link: ContentLink;
  currentType: string;
  currentId: number;
}) {
  const info = getRelatedInfo(link, currentType, currentId);
  const typeConfig = CONTENT_TYPE_LABELS[info.type];
  const url = typeConfig ? `${typeConfig.urlPrefix}${info.slug}` : `/${info.type}/${info.slug}`;

  return (
    <Link
      to={url}
      className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-soft transition-all"
    >
      {/* Thumbnail */}
      {info.imageUrl ? (
        <img
          src={info.imageUrl}
          alt={info.title}
          loading="lazy"
          className="w-14 aspect-square rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
        />
      ) : (
        <div className="w-14 aspect-square rounded-lg bg-muted flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[24px] text-muted-foreground/50">
            {typeConfig?.icon ?? 'article'}
          </span>
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {info.title}
        </h4>
      </div>

      {/* Arrow */}
      <span className="material-symbols-outlined text-muted-foreground text-[18px] shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
        chevron_right
      </span>
    </Link>
  );
}

export function ContentLinkSection({ contentType, objectId }: ContentLinkSectionProps) {
  const { data: links, isLoading } = useContentLinks(contentType, objectId, 'both');

  if (isLoading || !links || links.length === 0) {
    return null;
  }

  const grouped = groupLinksByRelatedType(links, contentType, objectId);
  const typeKeys = Object.keys(grouped).filter((key) => grouped[key].length > 0);

  if (typeKeys.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {typeKeys.map((typeKey) => {
        const typeConfig = CONTENT_TYPE_LABELS[typeKey];
        const sectionTitle = typeConfig?.pluralLabel ?? `Verwandte ${typeKey}`;
        const sectionIcon = typeConfig?.icon ?? 'link';
        const items = grouped[typeKey];

        return (
          <div key={typeKey}>
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
              <span className="material-symbols-outlined text-primary">{sectionIcon}</span>
              {sectionTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((link) => (
                <RelatedCard
                  key={link.id}
                  link={link}
                  currentType={contentType}
                  currentId={objectId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
