/**
 * AiSuggestDialog — Shared dialog for displaying AI suggestions with checkboxes.
 *
 * Shows suggested values grouped by category, allows selecting individual
 * fields, and applies selected suggestions.
 */
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuggestionField {
  key: string;
  label: string;
  group: string;
  currentValue: unknown;
  suggestedValue: unknown;
  type: 'scalar' | 'list';
  /** Optional priority (0–100). Used for list-type fields like portions to show a priority badge. */
  priority?: number;
}

interface AiSuggestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isLoading: boolean;
  fields: SuggestionField[];
  onApply: (selectedKeys: string[]) => void;
  isApplying?: boolean;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiSuggestDialog({
  open,
  onOpenChange,
  title,
  isLoading,
  fields,
  onApply,
  isApplying = false,
  error = null,
}: AiSuggestDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filter to only show fields where suggestion differs from current
  const relevantFields = useMemo(() => {
    return fields.filter((f) => {
      if (f.suggestedValue === null || f.suggestedValue === undefined) return false;
      if (f.type === 'list') {
        const arr = f.suggestedValue as unknown[];
        return arr.length > 0;
      }
      // Scalar: show if suggestion differs from current
      // Treat null/undefined as equivalent to 0 for comparison
      const current = f.currentValue ?? 0;
      const suggested = f.suggestedValue ?? 0;
      return current !== suggested;
    });
  }, [fields]);

  // Reset selected state when dialog opens or closed, or when relevant fields list changes
  const relevantKeysStr = useMemo(() => {
    return relevantFields.map((f) => f.key).join(',');
  }, [relevantFields]);

  useEffect(() => {
    if (open) {
      const keys = relevantKeysStr ? relevantKeysStr.split(',') : [];
      setSelected(new Set(keys.filter(Boolean)));
    } else {
      setSelected(new Set());
    }
  }, [open, relevantKeysStr]);

  // Group fields
  const groups = useMemo(() => {
    const map = new Map<string, SuggestionField[]>();
    for (const f of relevantFields) {
      const existing = map.get(f.group) || [];
      existing.push(f);
      map.set(f.group, existing);
    }
    return map;
  }, [relevantFields]);

  // Select all / none
  const allSelected = relevantFields.length > 0 && relevantFields.every((f) => selected.has(f.key));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(relevantFields.map((f) => f.key)));
    }
  }

  function toggleField(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleApply() {
    onApply(Array.from(selected));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            {title}
          </DialogTitle>
          <DialogDescription>
            Wähle die Vorschläge aus, die du übernehmen möchtest.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-6 text-center text-destructive">
            {error}
          </p>
        ) : isLoading ? (
          <div className="space-y-3 py-4">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
            <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        ) : relevantFields.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground italic">
            Keine neuen Vorschläge gefunden.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {Array.from(groups.entries()).map(([groupName, groupFields]) => (
              <div
                key={groupName}
                className={groupName === 'Name' ? 'md:col-span-2 lg:col-span-3' : ''}
              >
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {groupName}
                </h4>
                <div className="space-y-2">
                  {groupFields.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-3 rounded-md border p-2 cursor-pointer hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(field.key)}
                        onChange={() => toggleField(field.key)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {field.label}
                          {field.type === 'list' && field.priority !== undefined && field.priority >= 100 && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary">
                              Rezeptportion
                            </span>
                          )}
                          {field.type === 'list' && field.priority !== undefined && field.priority >= 50 && field.priority < 100 && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">
                              Packung / Stück
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {field.type === 'list' ? (
                            <span>{formatListValue(field.suggestedValue)}</span>
                          ) : (
                            <>
                              <span className="line-through">
                                {formatValue(field.currentValue)}
                              </span>
                              <span className="text-foreground font-medium">
                                &rarr; {formatValue(field.suggestedValue)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {relevantFields.length > 0 && !isLoading && (
          <DialogFooter className="flex-row justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {allSelected ? 'Keine auswählen' : 'Alle auswählen'}
            </Button>
            <Button
              onClick={handleApply}
              disabled={selected.size === 0 || isApplying}
            >
              {isApplying
                ? 'Wird übernommen...'
                : `Ausgewählte übernehmen (${selected.size})`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (value === 0) return '0';
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value);
}

function formatListValue(value: unknown): string {
  if (!Array.isArray(value)) return '\u2014';
  if (value.length === 0) return '\u2014';
  // Handle portion suggestions (objects with name)
  if (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]) {
    return value.map((v: { name: string; weight_g?: number }) =>
      v.weight_g ? `${v.name} (${v.weight_g}g)` : v.name
    ).join(', ');
  }
  // Plain strings
  return value.join(', ');
}
