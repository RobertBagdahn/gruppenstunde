import type { ReactNode } from 'react';

/** Section heading with an icon plaque, as used in the recipe wizard steps. */
export default function WizardSectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      {children}
    </h3>
  );
}
