/**
 * Print-optimized view for shopping lists.
 * Uses @media print CSS for clean checkbox layout grouped by retail section.
 */
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/lib/unitConversion';

interface PrintItem {
  name: string;
  quantity_g: number;
  unit: string;
  retail_section: string;
  is_checked: boolean;
}

interface ShoppingListPrintViewProps {
  items: PrintItem[];
  listName: string;
}

export function ShoppingListPrintView({ items, listName }: ShoppingListPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Group by retail section
  const grouped = items.reduce<Record<string, PrintItem[]>>((acc, item) => {
    const section = item.retail_section || 'Sonstiges';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <>
      <Button
        variant="outline"
        onClick={handlePrint}
        className="print:hidden"
      >
        <span className="material-symbols-outlined mr-2 text-base">print</span>
        Drucken
      </Button>

      <div ref={printRef} className="hidden print:block print:p-4">
        <h1 className="text-xl font-bold mb-4">{listName}</h1>

        {Object.entries(grouped).map(([section, sectionItems]) => (
          <div key={section} className="mb-4">
            <h2 className="text-sm font-semibold uppercase text-gray-500 border-b mb-2">
              {section}
            </h2>
            <ul className="space-y-1">
              {sectionItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" defaultChecked={item.is_checked} />
                  <span>
                    {item.quantity_g > 0 && (
                      <span className="font-medium">{item.unit === 'g' || item.unit === 'kg' ? formatWeight(item.quantity_g).display : `${item.quantity_g} ${item.unit}`} </span>
                    )}
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
