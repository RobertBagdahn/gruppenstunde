/**
 * ShoppingListPrintView — the open entries of a list as a two-column A4 sheet with boxes to tick.
 * Hidden on screen; the page hides itself while printing, so only this sheet reaches paper or PDF.
 */
import type { ShoppingListExport } from '@/lib/shoppingListExport';

interface ShoppingListPrintViewProps {
  data: ShoppingListExport;
}

/** Blank lines for entries that are not on the list yet. */
const EXTRA_LINES = 5;

export default function ShoppingListPrintView({ data }: ShoppingListPrintViewProps) {
  const counts = data.checkedCount > 0 ? `${data.openCount} offen · ${data.checkedCount} schon abgehakt` : `${data.openCount} offen`;

  return (
    <div className="hidden print:block text-black bg-white" data-testid="shopping-print-view">
      {/* A div, not <header>: the global print stylesheet hides every <header>. */}
      <div className="mb-4 border-b border-black pb-2">
        <h1 className="text-title font-bold">{data.title}</h1>
        <p className="text-body">Stand {data.stamp} · {counts}</p>
      </div>

      <div className="print:columns-2 print:gap-8">
        {data.sections.map((section) => (
          <section key={section.title} className="mb-4 print:break-inside-avoid">
            <h2 className="border-b border-black pb-1 text-emphasis font-bold">{section.title}</h2>
            <ul className="mt-1">
              {section.entries.map((entry, index) => (
                <li key={`${entry.name}-${index}`} className="flex items-start gap-2 py-1 print:break-inside-avoid">
                  <span aria-hidden="true" className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 border border-black" />
                  <span>
                    {entry.name}
                    {entry.quantity && <span> – {entry.quantity}</span>}
                    {entry.claimedBy && <span> ({entry.claimedBy})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6 print:break-inside-avoid">
        <h2 className="border-b border-black pb-1 text-emphasis font-bold">Zusätzlich</h2>
        {Array.from({ length: EXTRA_LINES }, (_, index) => (
          <div key={index} className="mt-4 h-6 border-b border-black" />
        ))}
      </section>
    </div>
  );
}
