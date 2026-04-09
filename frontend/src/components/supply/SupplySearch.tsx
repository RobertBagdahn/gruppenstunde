/**
 * SupplySearch — Universal supply search component with fuzzy matching.
 *
 * Supports searching for Materials (and optionally Ingredients).
 * Shows results in a dropdown, with a "Neuen Eintrag anlegen" prompt
 * when no results are found.
 *
 * Used in ContentStepper material/ingredient steps.
 */
import { useState, useRef, useEffect } from 'react';
import { useSupplySearch, useCreateMaterial } from '@/api/supplies';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';
import type { MaterialListItem } from '@/schemas/supply';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplySearchResult {
  id: number;
  name: string;
  slug: string;
  type: 'material';
  category?: string;
}

interface SupplySearchProps {
  /** Called when a supply item is selected */
  onSelect: (item: SupplySearchResult) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional class name */
  className?: string;
  /** Allow creating new materials inline */
  allowCreate?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupplySearch({
  onSelect,
  placeholder = 'Material suchen...',
  className = '',
  allowCreate = true,
}: SupplySearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialCategory, setNewMaterialCategory] = useState('other');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [] } = useSupplySearch(query);
  const createMaterial = useCreateMaterial();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(item: MaterialListItem) {
    onSelect({
      id: item.id,
      name: item.name,
      slug: item.slug,
      type: 'material',
      category: item.material_category,
    });
    setQuery('');
    setIsOpen(false);
  }

  function handleCreateMaterial() {
    if (!newMaterialName.trim()) return;
    createMaterial.mutate(
      { name: newMaterialName.trim(), material_category: newMaterialCategory },
      {
        onSuccess: (material) => {
          onSelect({
            id: material.id,
            name: material.name,
            slug: material.slug,
            type: 'material',
            category: material.material_category,
          });
          setQuery('');
          setIsOpen(false);
          setShowCreateForm(false);
          setNewMaterialName('');
          toast.success(`"${material.name}" erstellt`);
        },
        onError: (err) => {
          toast.error('Fehler beim Erstellen', { description: err.message });
        },
      },
    );
  }

  const hasResults = searchResults.length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-[18px]">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setShowCreateForm(false);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-64 overflow-y-auto">
          {hasResults ? (
            <ul className="py-1">
              {searchResults.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                      build
                    </span>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {MATERIAL_CATEGORY_OPTIONS.find((c) => c.value === item.material_category)?.label ?? item.material_category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Keine Ergebnisse für &quot;{query}&quot;
            </div>
          )}

          {/* Create new prompt */}
          {allowCreate && !showCreateForm && (
            <div className="border-t px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setNewMaterialName(query);
                }}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Neues Material &quot;{query}&quot; anlegen
              </button>
            </div>
          )}

          {/* Inline create form */}
          {showCreateForm && (
            <div className="border-t p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Neues Material erstellen</p>
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="Name"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              />
              <select
                value={newMaterialCategory}
                onChange={(e) => setNewMaterialCategory(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              >
                {MATERIAL_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateMaterial}
                  disabled={!newMaterialName.trim() || createMaterial.isPending}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                >
                  {createMaterial.isPending ? 'Erstellt...' : 'Erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
