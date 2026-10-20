/** Marks everything that is example data, never real data (Rübert rule: Beispieldaten sind überall markiert). */
export function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded-sm border border-warning-border bg-warning-soft px-1.5 text-caption text-warning-text">
      Beispiel
    </span>
  );
}

export function SampleDataBanner({ children }: { children: string }) {
  return (
    <div role="note" className="rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-dense text-warning-text">
      <strong className="font-semibold">Beispieldaten.</strong> {children}
    </div>
  );
}
