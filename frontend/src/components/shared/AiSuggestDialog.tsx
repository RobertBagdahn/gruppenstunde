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
}

interface AiSuggestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isLoading: boolean;
  fields: SuggestionField[];
  onApply: (selectedKeys: string[]) => void;
  isApplying?: boolean;
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
      // Scalar: show if different from current
      if (f.currentValue === null || f.currentValue === undefined || f.currentValue === 0) {
        return true;
      }
      return f.currentValue !== f.suggestedValue;
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
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Wähle die Vorschläge aus, die du übernehmen möchtest.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
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
          <div className="space-y-4 py-4">
            {Array.from(groups.entries()).map(([groupName, groupFields]) => (
              <div key={groupName}>
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
                        <div className="text-sm font-medium">{field.label}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {field.type === 'list' ? (
                            <span>{formatListValue(field.suggestedValue)}</span>
                          ) : (
                            <>
                              <span className="line-through">
                                {formatValue(field.currentValue)}
                              </span>
                              <span className="text-foreground font-medium">
                                → {formatValue(field.suggestedValue)}
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
  if (value === null || value === undefined) return '—';
  if (value === 0) return '0';
  if (typeof value === 'number') return String(value);
  return String(value);
}

function formatListValue(value: unknown): string {
  if (!Array.isArray(value)) return '—';
  if (value.length === 0) return '—';
  // Handle portion suggestions (objects with name)
  if (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]) {
    return value.map((v: { name: string; weight_g?: number }) =>
      v.weight_g ? `${v.name} (${v.weight_g}g)` : v.name
    ).join(', ');
  }
  // Plain strings
  return value.join(', ');
}
