import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Salad, type LucideIcon } from 'lucide-react';
import { useTagDetail } from '@/api/admin';
import DetailHeader from '@/components/shared/DetailHeader';
import { PageSkeleton } from '@/components/ui/skeleton';

interface TagLinkItem {
  key: number | string;
  href: string;
  label: string;
}

interface TagLinkSectionProps {
  heading: string;
  icon: LucideIcon;
  items: TagLinkItem[];
  emptyText: string;
}

/** Card with a list of links (recipes or ingredients) that open in a new tab. */
function TagLinkSection({ heading, icon: Icon, items, emptyText }: TagLinkSectionProps) {
  return (
    <section className="space-y-3 rounded-xl bg-card p-5 shadow-card md:p-6">
      <header className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-dark"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-display text-section font-bold">{heading}</h2>
      </header>
      {items.length > 0 ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center text-body font-medium text-primary-dark hover:underline [overflow-wrap:anywhere]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}

export default function TagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTagDetail(id);

  if (isLoading) {
    return <PageSkeleton label="Tag wird geladen" />;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="rounded-xl bg-card p-6 text-center text-body text-muted-foreground shadow-card">
          Tag nicht gefunden.
        </p>
      </div>
    );
  }

  const { tag, recipes, ingredients } = data;
  const facts: { label: string; value: ReactNode }[] = [
    { label: 'Slug:', value: tag.slug },
    { label: 'Gruppe:', value: tag.group },
    { label: 'Icon:', value: tag.icon || '—' },
    { label: 'Sortierung:', value: tag.sort_order },
    { label: 'Parent:', value: tag.parent_name || '—' },
    { label: 'Genehmigt:', value: tag.is_approved ? 'Ja' : 'Nein' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6 md:py-8 lg:px-8">
      <DetailHeader title={tag.name} back={{ to: '/admin/tags', label: 'Zurück zu Tags' }} />

      <section className="space-y-4 rounded-xl bg-card p-5 shadow-card md:p-6">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-body sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 space-y-0.5">
              <dt className="text-caption font-semibold uppercase tracking-wide text-primary-dark">{fact.label}</dt>
              <dd className="font-medium [overflow-wrap:anywhere]">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {tag.description && (
          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-primary-dark">Beschreibung:</p>
            <p className="text-body">{tag.description}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <TagLinkSection
          heading={`Rezepte (${recipes.length})`}
          icon={BookOpen}
          items={recipes.map((r) => ({ key: r.id, href: `/recipes/${r.slug}`, label: r.title }))}
          emptyText="Keine Einträge gefunden"
        />
        <TagLinkSection
          heading={`Zutaten (${ingredients.length})`}
          icon={Salad}
          items={ingredients.map((i) => ({ key: i.id, href: `/ingredients/${i.slug}`, label: i.name }))}
          emptyText="Keine Einträge gefunden"
        />
      </div>
    </div>
  );
}
