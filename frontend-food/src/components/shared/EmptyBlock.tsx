import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/icon';

export interface StarterTemplate {
  id: number | string;
  title: string;
  detail: string;
  /** Link target, or `onSelect` for an action that opens a flow. */
  to?: string;
  onSelect?: () => void;
}

interface EmptyBlockProps {
  title: string;
  description: string;
  /** The one primary action (food-page-states: höchstens eine Hauptaktion). */
  action?: { label: string; to: string };
  /** Existing reference plans as templates; the whole block is left out without them. */
  templates?: StarterTemplate[];
  templatesTitle?: string;
}

/**
 * Empty state of a list or area (food-page-states): heading, one sentence, one primary action,
 * and optional templates taken from the existing reference data.
 */
export default function EmptyBlock({ title, description, action, templates, templatesTitle = 'Oder mit Vorlage starten' }: EmptyBlockProps) {
  return (
    <section className="rounded-xl bg-card p-6 text-center shadow-card md:p-10">
      <h2 className="font-display text-heading font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground md:text-emphasis">{description}</p>
      {action && (
        <Link
          to={action.to}
          className="press mt-5 inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-5 text-body font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
        >
          <Icon name="add" size={20} aria-hidden="true" />
          {action.label}
        </Link>
      )}
      {templates && templates.length > 0 && (
        <div className="mt-8 text-left">
          <h3 className="mb-3 text-center text-body font-semibold text-muted-foreground">{templatesTitle}</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <li key={template.id}>
                {template.onSelect ? (
                  <button
                    type="button"
                    onClick={template.onSelect}
                    className="card-hover block w-full rounded-xl border border-line bg-background p-4 text-left transition-colors hover:border-primary-soft-border"
                  >
                    <span className="block font-display text-emphasis font-bold text-foreground">{template.title}</span>
                    <span className="mt-1 block text-body text-muted-foreground">{template.detail}</span>
                  </button>
                ) : (
                  <Link
                    to={template.to ?? '/meal-plans/new'}
                    className="card-hover block rounded-xl border border-line bg-background p-4 transition-colors hover:border-primary-soft-border"
                  >
                    <span className="block font-display text-emphasis font-bold text-foreground">{template.title}</span>
                    <span className="mt-1 block text-body text-muted-foreground">{template.detail}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
