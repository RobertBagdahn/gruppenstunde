/**
 * ExportTab — Column selection, format selector, filter dropdowns, download trigger.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { EventDetail, ExportColumn } from '@/schemas/event';
import { useExportColumns, useExportParticipants } from '@/api/eventDashboard';
import { useLabels } from '@/api/eventDashboard';
import { cn } from '@/lib/utils';

interface Props {
  event: EventDetail;
}

const FORMAT_OPTIONS = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: 'table_view' },
  { value: 'csv', label: 'CSV (.csv)', icon: 'description' },
  { value: 'pdf', label: 'PDF (.pdf)', icon: 'picture_as_pdf' },
] as const;

export default function ExportTab({ event }: Props) {
  const { data: columns, isLoading: columnsLoading } = useExportColumns(event.slug);
  const { data: labels } = useLabels(event.slug);
  const exportMutation = useExportParticipants(event.slug);

  const [format, setFormat] = useState<string>('excel');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['all']));
  const [useAllColumns, setUseAllColumns] = useState(true);

  // Filters
  const [filterPaid, setFilterPaid] = useState<string>('');
  const [filterBookingOption, setFilterBookingOption] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');

  const toggleColumn = (colId: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setUseAllColumns(true);
    setSelectedColumns(new Set(['all']));
  };

  const handleSelectCustom = () => {
    setUseAllColumns(false);
    // Pre-select all columns when switching to custom
    if (columns) {
      setSelectedColumns(new Set(columns.map((c) => c.id)));
    }
  };

  const handleExport = () => {
    const colList = useAllColumns
      ? ['all']
      : Array.from(selectedColumns);

    if (!useAllColumns && colList.length === 0) {
      toast.error('Bitte mindestens eine Spalte auswaehlen');
      return;
    }

    const filters: Record<string, unknown> = {};
    if (filterPaid === 'true') filters.is_paid = true;
    if (filterPaid === 'false') filters.is_paid = false;
    if (filterBookingOption) filters.booking_option_id = Number(filterBookingOption);
    if (filterLabel) filters.label_id = Number(filterLabel);

    exportMutation.mutate(
      {
        format,
        columns: colList,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      },
      {
        onSuccess: () => toast.success('Export heruntergeladen'),
        onError: (err) => toast.error('Export fehlgeschlagen', { description: err.message }),
      },
    );
  };

  // Group columns by type for display
  const standardCols = (columns ?? []).filter((c) => c.type === 'standard');
  const computedCols = (columns ?? []).filter((c) => c.type === 'computed');
  const customFieldCols = (columns ?? []).filter((c) => c.type === 'custom_field');

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">file_present</span>
          Dateiformat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                format === opt.value
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-transparent bg-muted/30 hover:bg-muted/50',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  format === opt.value
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
              </div>
              <span className={cn('text-sm font-medium', format === opt.value && 'text-violet-700')}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Section */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">filter_alt</span>
          Filter (optional)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Payment Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Bezahlstatus
            </label>
            <select
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
            >
              <option value="">Alle</option>
              <option value="true">Bezahlt</option>
              <option value="false">Nicht bezahlt</option>
            </select>
          </div>

          {/* Booking Option */}
          {event.booking_options.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Buchungsoption
              </label>
              <select
                value={filterBookingOption}
                onChange={(e) => setFilterBookingOption(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">Alle</option>
                {event.booking_options.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Label */}
          {(labels ?? []).length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Label
              </label>
              <select
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
              >
                <option value="">Alle</option>
                {(labels ?? []).map((lbl) => (
                  <option key={lbl.id} value={String(lbl.id)}>
                    {lbl.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Column Selection */}
      <div className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">view_column</span>
          Spalten
        </h3>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleSelectAll}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              useAllColumns
                ? 'bg-violet-100 border-violet-300 text-violet-700'
                : 'hover:bg-muted',
            )}
          >
            Alle Spalten
          </button>
          <button
            onClick={handleSelectCustom}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg border transition-all',
              !useAllColumns
                ? 'bg-violet-100 border-violet-300 text-violet-700'
                : 'hover:bg-muted',
            )}
          >
            Auswahl
          </button>
        </div>

        {!useAllColumns && (
          columnsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {standardCols.length > 0 && (
                <ColumnGroup
                  title="Stammdaten"
                  columns={standardCols}
                  selected={selectedColumns}
                  onToggle={toggleColumn}
                />
              )}
              {computedCols.length > 0 && (
                <ColumnGroup
                  title="Berechnete Felder"
                  columns={computedCols}
                  selected={selectedColumns}
                  onToggle={toggleColumn}
                />
              )}
              {customFieldCols.length > 0 && (
                <ColumnGroup
                  title="Eigene Felder"
                  columns={customFieldCols}
                  selected={selectedColumns}
                  onToggle={toggleColumn}
                />
              )}
            </div>
          )
        )}
      </div>

      {/* Download Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {exportMutation.isPending ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Export wird erstellt...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportieren
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column Group
// ---------------------------------------------------------------------------

function ColumnGroup({
  title,
  columns,
  selected,
  onToggle,
}: {
  title: string;
  columns: ExportColumn[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {columns.map((col) => (
          <label
            key={col.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-all',
              selected.has(col.id)
                ? 'bg-violet-50 border-violet-300'
                : 'hover:bg-muted/50',
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(col.id)}
              onChange={() => onToggle(col.id)}
              className="accent-violet-600"
            />
            <span className="truncate">{col.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
