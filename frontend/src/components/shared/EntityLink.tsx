/**
 * <EntityLink> — canonical in-app link to any domain entity.
 *
 * See `frontend/AGENTS.md` → "Entity-Links & NewTab-Policy" for the full
 * specification of the component API, URL resolution table, and the
 * "list → new tab / detail → same tab" rule.
 *
 * URL resolution is delegated to `getEntityUrl` in `@/lib/entityUrls`.
 * NewTab default comes from `<EntityLinkContext>` and can be overridden
 * via the `newTab` prop.
 */
import { forwardRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getEntityUrl, type EntityType } from '@/lib/entityUrls';
import { useEntityLinkScope } from './EntityLinkContext';

export type EntityLinkVariant = 'default' | 'muted' | 'chip';

export interface EntityLinkProps {
  type: EntityType;
  /** Numeric or string id. Either `id` or `slug` must be provided (depending on type). */
  id?: string | number;
  /** URL slug. Either `id` or `slug` must be provided (depending on type). */
  slug?: string;
  /** Visible link text. Ignored when `children` is provided. */
  name?: string;
  /** Override the default newTab behaviour coming from `<EntityLinkContext>`. */
  newTab?: boolean;
  /** Visual style variant. */
  variant?: EntityLinkVariant;
  /** Escape hatch for custom styling. */
  className?: string;
  /** Custom content (icons, badges…) — replaces `name`. */
  children?: ReactNode;
  /** Optional click handler (e.g. for analytics). */
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Optional aria-label override (defaults to `name`). */
  'aria-label'?: string;
}

const VARIANT_CLASSES: Record<EntityLinkVariant, string> = {
  default:
    'text-primary underline-offset-4 hover:underline focus-visible:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  muted:
    'text-muted-foreground hover:text-foreground hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  chip:
    'inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
};

export const EntityLink = forwardRef<HTMLAnchorElement, EntityLinkProps>(function EntityLink(
  {
    type,
    id,
    slug,
    name,
    newTab,
    variant = 'default',
    className,
    children,
    onClick,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const scope = useEntityLinkScope();
  const shouldOpenInNewTab = newTab ?? scope === 'list';
  const href = getEntityUrl(type, { id, slug });
  const content = children ?? name ?? '';
  const classes = cn(VARIANT_CLASSES[variant], className);

  // External-tab navigation must use a plain <a> so the browser spawns a real
  // new tab. Same-tab uses react-router's <Link> for SPA navigation.
  if (shouldOpenInNewTab) {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel ?? name}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      ref={ref}
      to={href}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel ?? name}
    >
      {content}
    </Link>
  );
});
