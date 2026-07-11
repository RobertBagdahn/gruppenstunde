/**
 * Placeholder Insert Menu Component
 *
 * Helper menu to insert placeholder syntax into instruction text.
 * Provides quick access to common placeholders like {ingredient_name}, {recipe_item_id}, etc.
 */

import { useState, useRef } from 'react';
import { Copy, ChevronDown } from 'lucide-react';

interface PlaceholderInsertMenuProps {
  /**
   * Callback to insert placeholder at cursor position
   */
  onInsert: (placeholder: string) => void;

  /**
   * Available step ingredients (for numbered refs)
   */
  ingredientCount?: number;

  /**
   * CSS class for button styling
   */
  className?: string;
}

interface PlaceholderOption {
  label: string;
  value: string;
  description: string;
}

export default function PlaceholderInsertMenu({
  onInsert,
  ingredientCount = 0,
  className = '',
}: PlaceholderInsertMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Build placeholder options
  const basicPlaceholders: PlaceholderOption[] = [
    {
      label: 'Zutatenname',
      value: '{ingredient_name}',
      description: 'Name der ersten Zutat',
    },
    {
      label: 'Zutat-ID',
      value: '{recipe_item_id}',
      description: 'ID der ersten Zutat',
    },
  ];

  // Add numbered references if there are multiple ingredients
  const numberedPlaceholders: PlaceholderOption[] = Array.from(
    { length: Math.min(ingredientCount, 5) },
    (_, i) => ({
      label: `Zutat ${i + 1}`,
      value: `{${i + 1}}`,
      description: `${i + 1}. Zutat in diesem Schritt`,
    })
  );

  const allPlaceholders = [...basicPlaceholders, ...numberedPlaceholders];

  const handleInsert = (placeholder: string) => {
    onInsert(placeholder);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors border border-primary/20"
        title="Platzhalter einfügen"
      >
        <span className="font-medium">🔗</span>
        <span className="hidden sm:inline">Platzhalter</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40 min-w-80"
          >
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {/* Header */}
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
                Verfügbare Platzhalter
              </div>

              {/* Placeholder Options */}
              {allPlaceholders.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInsert(option.value)}
                  className="w-full flex items-start gap-3 p-2 rounded hover:bg-primary/10 text-left transition-colors"
                >
                  {/* Value (copyable) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-foreground">
                        {option.value}
                      </code>
                      <Copy
                        size={14}
                        className="text-muted-foreground hover:text-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </div>

                  {/* Insert Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInsert(option.value);
                    }}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 whitespace-nowrap"
                  >
                    Einfügen
                  </button>
                </button>
              ))}

              {allPlaceholders.length === 0 && (
                <div className="text-sm text-muted-foreground italic px-2 py-3">
                  Füge zunächst Zutaten hinzu, um Platzhalter zu verwenden
                </div>
              )}

              {/* Info Box */}
              <div className="border-t border-border mt-2 pt-2 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Tipps:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Mehrere Platzhalter können kombiniert werden</li>
                  <li>Der Text wird in der Vorschau aufgelöst</li>
                  <li>Ungültige Platzhalter bleiben unverändert</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
