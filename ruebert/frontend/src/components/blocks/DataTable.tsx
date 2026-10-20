import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  /** CSS track size, e.g. "minmax(0,2fr)" or "96px". */
  width: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
};

/** CSS-grid table in a box. Numbers are right-aligned and in mono; the box scrolls horizontally (Design.md). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
}) {
  const tracks = columns.map((c) => c.width).join(' ');
  const minWidth = `${Math.max(columns.length * 96, 480)}px`;
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-panel">
      <div role="table" aria-label={caption} style={{ minWidth }}>
        <div role="row" className="grid gap-3 border-b border-border px-4 py-2" style={{ gridTemplateColumns: tracks }}>
          {columns.map((c) => (
            <span key={c.key} role="columnheader" className={`text-label uppercase text-muted-foreground ${c.align === 'right' ? 'text-right' : ''}`}>
              {c.header}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div key={rowKey(row)} role="row" className="grid items-center gap-3 border-b border-border-row px-4 py-2.5 text-dense hover:bg-row-hover" style={{ gridTemplateColumns: tracks }}>
            {columns.map((c) => (
              <span key={c.key} role="cell" className={`min-w-0 truncate ${c.align === 'right' ? 'text-right font-mono' : ''}`}>
                {c.render(row)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
