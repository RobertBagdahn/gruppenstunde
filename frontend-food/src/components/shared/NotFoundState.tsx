import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface NotFoundStateProps {
  title: string;
  description: string;
  /** Search suggestions, e.g. "Meintest du …" with matches of the existing search. */
  suggestions?: ReactNode;
  /** Link to the list the visitor was looking for. */
  listLink?: { label: string; to: string };
}

/** A resource that does not exist (food-page-states): mascot, explanation, suggestions, a way back. */
export default function NotFoundState({ title, description, suggestions, listLink }: NotFoundStateProps) {
  return (
    <section className="mx-auto max-w-2xl rounded-xl bg-card p-6 text-center shadow-card md:p-10">
      <img src="/images/inspi_confused.png" alt="" width={120} height={120} className="mx-auto mb-4 h-28 w-28 object-contain" />
      <h1 className="font-display text-heading font-bold text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground md:text-emphasis">{description}</p>
      {suggestions && <div className="mt-6 text-left">{suggestions}</div>}
      {listLink && (
        <Link
          to={listLink.to}
          className="press mt-6 inline-flex h-11 items-center rounded-lg bg-primary-soft px-5 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border"
        >
          {listLink.label}
        </Link>
      )}
    </section>
  );
}
