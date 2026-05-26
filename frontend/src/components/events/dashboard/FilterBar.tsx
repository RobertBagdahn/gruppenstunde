/**
 * FilterBar — Reusable filter bar for dashboard tabs.
 * Renders search input, select dropdowns, and date range pickers.
 * Supports mobile-friendly collapsible layout.
 *
 * All filter state is URL-driven via useSearchParams.
 */
import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  /** URL parameter name (e.g. 'booking-option', 'payment-status') */
  param: string;
  /** Display label */
  label: string;
  /** 'select' for dropdown, 'search' for text input, 'date-range' for from/to */
  type: 'select' | 'search' | 'date-range';
  /** Options for 'select' type */
  options?: FilterOption[];
  /** Placeholder for 'search' type */
  placeholder?: string;
}

interface FilterBarProps {
  fields: FilterField[];
  /** Total count (unfiltered) */
  totalCount?: number;
  /** Filtered count */
  filteredCount?: number;
  /** Label for counts, e.g. "Teilnehmern" */
  countLabel?: string;
}

// ---------------------------------------------------------------------------
// Hook: useFilterParams — reads/writes filter values from URL search params
// ---------------------------------------------------------------------------

/**
 * Hook to read and write filter parameters from URL search params.
 * Preserves the 'tab' parameter when updating filters.
 */
export function useFilterParams(fields: FilterField[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  /** Get current value of a filter param */
  const getValue = useCallback(
    (param: string): string => {
      return searchParams.get(param) ?? '';
    },
    [searchParams],
  );

  /** Get date range values (from, to) for a date-range field */
  const getDateRange = useCallback(
    (param: string): { from: string; to: string } => {
      return {
        from: searchParams.get(`${param}-from`) ?? '',
        to: searchParams.get(`${param}-to`) ?? '',
      };
    },
    [searchParams],
  );

  /** Set a filter value. Empty string removes the param. */
  const setValue = useCallback(
    (param: string, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) {
            next.set(param, value);
          } else {
            next.delete(param);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Set a date range value. */
  const setDateRange = useCallback(
    (param: string, from: string, to: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (from) {
            next.set(`${param}-from`, from);
          } else {
            next.delete(`${param}-from`);
          }
          if (to) {
            next.set(`${param}-to`, to);
          } else {
            next.delete(`${param}-to`);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /** Count of active filters (non-empty values) */
  const activeCount = useMemo(() => {
    let count = 0;
    for (const field of fields) {
      if (field.type === 'date-range') {
        const { from, to } = getDateRange(field.param);
        if (from || to) count++;
      } else {
        if (getValue(field.param)) count++;
      }
    }
    return count;
  }, [fields, getValue, getDateRange]);

  /** Clear all filters (preserve 'tab' param) */
  const clearAll = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        const tab = prev.get('tab');
        if (tab) next.set('tab', tab);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { getValue, setValue, getDateRange, setDateRange, activeCount, clearAll };
}

// ---------------------------------------------------------------------------
// FilterBar Component
// ---------------------------------------------------------------------------

export default function FilterBar({
  fields,
  totalCount,
  filteredCount,
  countLabel = 'Ergebnissen',
}: FilterBarProps) {
  const { getValue, setValue, getDateRange, setDateRange, activeCount, clearAll } =
    useFilterParams(fields);

  // On mobile, filters are collapsed behind a button
  const [expanded, setExpanded] = useState(false);

  // Separate search fields from other filters
  const searchField = fields.find((f) => f.type === 'search');
  const filterFields = fields.filter((f) => f.type !== 'search');

  return (
    <div className="space-y-2">
      {/* Main row: search + mobile filter toggle */}
      <div className="flex gap-2">
        {/* Search input */}
        {searchField && (
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              search
            </span>
            <input
              type="text"
              placeholder={searchField.placeholder ?? 'Suchen...'}
              value={getValue(searchField.param)}
              onChange={(e) => setValue(searchField.param, e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background"
            />
            {getValue(searchField.param) && (
              <button
                type="button"
                onClick={() => setValue(searchField.param, '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        )}

        {/* Desktop: inline filters */}
        <div className="hidden sm:flex gap-2 flex-wrap">
          {filterFields.map((field) => (
            <FilterControl
              key={field.param}
              field={field}
              value={getValue(field.param)}
              dateRange={field.type === 'date-range' ? getDateRange(field.param) : undefined}
              onChange={(v) => setValue(field.param, v)}
              onDateRangeChange={
                field.type === 'date-range'
                  ? (from, to) => setDateRange(field.param, from, to)
                  : undefined
              }
            />
          ))}
        </div>

        {/* Mobile: filter toggle button */}
        {filterFields.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'sm:hidden flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors shrink-0',
              activeCount > 0
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'hover:bg-muted',
            )}
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Filter
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Mobile: expanded filter panel */}
      {expanded && (
        <div className="sm:hidden flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
          {filterFields.map((field) => (
            <FilterControl
              key={field.param}
              field={field}
              value={getValue(field.param)}
              dateRange={field.type === 'date-range' ? getDateRange(field.param) : undefined}
              onChange={(v) => setValue(field.param, v)}
              onDateRangeChange={
                field.type === 'date-range'
                  ? (from, to) => setDateRange(field.param, from, to)
                  : undefined
              }
              fullWidth
            />
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Alle Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Results count + clear button */}
      {totalCount !== undefined && filteredCount !== undefined && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {filteredCount} von {totalCount} {countLabel}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">close</span>
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterControl — renders a single filter field
// ---------------------------------------------------------------------------

function FilterControl({
  field,
  value,
  dateRange,
  onChange,
  onDateRangeChange,
  fullWidth = false,
}: {
  field: FilterField;
  value: string;
  dateRange?: { from: string; to: string };
  onChange: (value: string) => void;
  onDateRangeChange?: (from: string, to: string) => void;
  fullWidth?: boolean;
}) {
  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'text-sm border rounded-lg px-3 py-2 bg-background',
          fullWidth && 'w-full',
          value && 'border-violet-300 bg-violet-50/50',
        )}
      >
        <option value="">{field.label}</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date-range') {
    return (
      <div className={cn('flex items-center gap-1.5', fullWidth && 'w-full')}>
        <label className="text-xs text-muted-foreground shrink-0">{field.label}:</label>
        <input
          type="date"
          value={dateRange?.from ?? ''}
          onChange={(e) => onDateRangeChange?.(e.target.value, dateRange?.to ?? '')}
          className={cn(
            'text-sm border rounded-lg px-2 py-1.5 bg-background',
            fullWidth ? 'flex-1' : 'w-32',
            dateRange?.from && 'border-violet-300 bg-violet-50/50',
          )}
          placeholder="Von"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="date"
          value={dateRange?.to ?? ''}
          onChange={(e) => onDateRangeChange?.(dateRange?.from ?? '', e.target.value)}
          className={cn(
            'text-sm border rounded-lg px-2 py-1.5 bg-background',
            fullWidth ? 'flex-1' : 'w-32',
            dateRange?.to && 'border-violet-300 bg-violet-50/50',
          )}
          placeholder="Bis"
        />
      </div>
    );
  }

  // Search type handled in the main component
  return null;
}
