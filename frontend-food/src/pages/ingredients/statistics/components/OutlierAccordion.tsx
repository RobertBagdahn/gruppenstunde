import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FieldOutliers } from '@/schemas/supply';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutlierAccordionProps {
  fields: FieldOutliers[];
  summary: string;
}

export default function OutlierAccordion({ fields, summary }: OutlierAccordionProps) {
  const [openField, setOpenField] = useState<string | null>(fields[0]?.field ?? null);

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-semibold">Keine Ausreißer gefunden</p>
        <p className="text-sm mt-1">{summary}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{summary}</p>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.field} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpenField(openField === field.field ? null : field.field)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  'w-4 h-4',
                  field.items.some((i) => i.severity === 'extreme') ? 'text-destructive' : 'text-amber-500',
                )} />
                <span className="font-semibold text-sm">{field.field_label}</span>
                <span className="text-xs text-muted-foreground">
                  ({field.count} {field.count === 1 ? 'Ausreißer' : 'Ausreißer'})
                </span>
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                openField === field.field && 'rotate-180',
              )} />
            </button>

            {openField === field.field && (
              <div className="border-t border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="text-left py-2 px-4 font-medium">Zutat</th>
                        <th className="text-right py-2 px-4 font-medium">Wert ({field.unit})</th>
                        <th className="text-center py-2 px-4 font-medium">Schwere</th>
                        <th className="text-right py-2 px-4 font-medium hidden sm:table-cell">Abweichung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {field.items.map((item) => (
                        <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-4">
                            <Link to={`/ingredients/${item.slug}`} className="text-primary hover:underline font-medium">
                              {item.name}
                            </Link>
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-xs">{item.value.toFixed(1)}</td>
                          <td className="py-2 px-4 text-center">
                            <span className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                              item.severity === 'extreme'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-amber-50 text-amber-700',
                            )}>
                              {item.severity === 'extreme' ? 'Extrem' : 'Moderat'}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-mono text-xs hidden sm:table-cell text-muted-foreground">
                            {item.deviation.toFixed(1)}× Median
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
