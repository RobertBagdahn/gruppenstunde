/**
 * KitchenReminderSection — Displays kitchen supply reminders at the bottom of shopping lists.
 * Local-only checkboxes (no server persistence). Accordion-style categories.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useKitchenReminders, useSuggestKitchenReminder } from '@/api/kitchenReminders';
import { ChevronDown, ChevronRight, Plus, Check } from 'lucide-react';

export default function KitchenReminderSection() {
  const { data: categories, isLoading } = useKitchenReminders();
  const suggestMutation = useSuggestKitchenReminder();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [available, setAvailable] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [suggestionInput, setSuggestionInput] = useState('');

  if (isLoading || !categories || categories.length === 0) return null;

  const toggleCheck = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCollapse = (catId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleAvailable = (id: number) => {
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSuggest = () => {
    const name = suggestionInput.trim();
    if (!name) return;
    suggestMutation.mutate({ name });
    setSuggestionInput('');
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Küchenbedarf – Erinnerung
      </h3>

      <div className="space-y-3">
        {categories.map((cat) => {
          const isCollapsed = collapsed.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => toggleCollapse(cat.id)}
                className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary w-full text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {cat.name}
                <span className="text-xs text-muted-foreground ml-1">
                  ({cat.reminders.length})
                </span>
              </button>

              {!isCollapsed && (
                <ul className="mt-1 ml-5 space-y-1">
                  {cat.reminders.map((reminder) => (
                    <li key={reminder.id} className="flex items-center gap-3 py-2">
                      {/* Checkbox — 44x44px touch target, matching ShoppingListItemRow */}
                      <button
                        type="button"
                        onClick={() => toggleCheck(reminder.id)}
                        className={cn(
                          'flex items-center justify-center w-11 h-11 shrink-0 rounded-lg border-2 transition-all',
                          checked.has(reminder.id)
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-muted-foreground/30 hover:border-primary',
                        )}
                        aria-label={checked.has(reminder.id) ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
                      >
                        {checked.has(reminder.id) && (
                          <Check className="h-5 w-5" />
                        )}
                      </button>

                      {/* Label */}
                      <span
                        className={cn(
                          'flex-1 text-sm font-medium',
                          checked.has(reminder.id) && 'line-through text-muted-foreground',
                          available.has(reminder.id) && 'text-muted-foreground',
                          reminder.is_own_suggestion && !reminder.is_published && 'italic text-muted-foreground'
                        )}
                      >
                        {reminder.name}
                        {reminder.is_own_suggestion && !reminder.is_published && (
                          <span className="ml-1 text-xs">(Dein Vorschlag)</span>
                        )}
                        {available.has(reminder.id) && (
                          <span className="ml-2 text-xs text-emerald-600 font-medium">✓ vorhanden</span>
                        )}
                      </span>

                      {/* "Bereits vorhanden" toggle button */}
                      <button
                        type="button"
                        onClick={() => toggleAvailable(reminder.id)}
                        className={cn(
                          'shrink-0 text-xs px-2 py-1 rounded transition-colors',
                          available.has(reminder.id)
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                        )}
                      >
                        {available.has(reminder.id) ? 'Vorhanden' : 'Bereits vorhanden'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggest new item */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={suggestionInput}
          onChange={(e) => setSuggestionInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
          placeholder="Eigenen Vorschlag hinzufügen..."
          className="flex-1 text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleSuggest}
          disabled={!suggestionInput.trim() || suggestMutation.isPending}
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Vorschlagen
        </button>
      </div>
    </div>
  );
}
