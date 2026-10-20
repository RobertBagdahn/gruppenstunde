import type { ReactNode } from 'react';

export type RecommendationAction = {
  label: string;
  /** Keyboard shortcut shown next to the label, e.g. "↵". */
  shortcut?: string;
  onClick: () => void;
  primary?: boolean;
};

/** "Vorschlag von Rübert": the action as title, the reason beneath, actions with shortcuts (Design.md). */
export function RecommendationPanel({
  title,
  reason,
  alternative,
  actions,
  children,
}: {
  title: string;
  reason?: ReactNode;
  alternative?: ReactNode;
  actions: RecommendationAction[];
  children?: ReactNode;
}) {
  return (
    <section aria-label="Vorschlag von Rübert" className="flex flex-col gap-3 rounded-lg border border-accent-border bg-accent-soft p-4">
      <span className="text-label uppercase text-accent-text">Vorschlag von Rübert</span>
      <h3 className="text-section font-semibold text-foreground-strong">{title}</h3>
      {reason && <p className="text-dense text-foreground-2">{reason}</p>}
      {alternative && <p className="text-caption text-muted-foreground">{alternative}</p>}
      {children}
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-dense font-medium ${
              action.primary
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border-strong bg-panel text-foreground-2 hover:text-foreground-strong'
            }`}
          >
            {action.label}
            {action.shortcut && <kbd className="font-mono text-caption opacity-80">{action.shortcut}</kbd>}
          </button>
        ))}
      </div>
    </section>
  );
}
