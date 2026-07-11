/**
 * Ingredient Assignment Dropdown Component
 *
 * Allows selecting which recipe item should be assigned to a step ingredient.
 * Shows available recipe items with their ingredient names.
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface RecipeItemOption {
  id: number;
  name: string;
  ingredient_name?: string;
  portion?: {
    ingredient?: { name?: string };
    measuring_unit?: { name?: string };
  };
}

interface IngredientAssignmentDropdownProps {
  /**
   * Currently selected recipe item ID
   */
  selectedItemId: number;

  /**
   * Available recipe items to choose from
   */
  availableItems: RecipeItemOption[];

  /**
   * Callback when item is selected
   */
  onSelect: (itemId: number) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Show search input
   */
  showSearch?: boolean;
}

export default function IngredientAssignmentDropdown({
  selectedItemId,
  availableItems,
  onSelect,
  placeholder = 'Zutat wählen...',
  showSearch = true,
}: IngredientAssignmentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get display name for item
  const getItemDisplayName = (item: RecipeItemOption): string => {
    return (
      item.portion?.ingredient?.name ||
      item.ingredient_name ||
      item.name ||
      `Item #${item.id}`
    );
  };

  // Get selected item display
  const selectedItem = availableItems.find((item) => item.id === selectedItemId);
  const selectedDisplay = selectedItem ? getItemDisplayName(selectedItem) : placeholder;

  // Filter items based on search
  const filteredItems = availableItems.filter((item) =>
    getItemDisplayName(item).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (itemId: number) => {
    onSelect(itemId);
    setIsOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-lg hover:bg-muted focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
      >
        <span className="text-sm text-foreground">{selectedDisplay}</span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40 max-h-64 flex flex-col">
            {/* Search Input */}
            {showSearch && (
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  Keine Zutaten gefunden
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      item.id === selectedItemId
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="font-medium">{getItemDisplayName(item)}</div>
                    {item.portion?.measuring_unit?.name && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.portion.measuring_unit.name}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
