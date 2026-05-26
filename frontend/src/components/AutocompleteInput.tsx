import { useState, useRef, useCallback, useEffect } from 'react';
import type { CatalogItem } from '@/schemas/packingList';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: CatalogItem) => void;
  onSubmit: () => void;
  catalogItems: CatalogItem[];
  existingItemNames: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onSubmit,
  catalogItems,
  existingItemNames,
  placeholder = 'Gegenstand hinzufügen...',
  disabled = false,
  className = '',
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const existingLower = new Set(
    existingItemNames.map((n) => n.toLowerCase().trim()),
  );

  // Filter catalog items based on input
  const matches =
    value.trim().length > 0
      ? catalogItems
          .filter((item) => {
            const nameLower = item.name.toLowerCase();
            const queryLower = value.toLowerCase().trim();
            if (existingLower.has(nameLower)) return false;
            if (nameLower.includes(queryLower)) return true;
            return item.tags.some((tag) => tag.includes(queryLower));
          })
          .slice(0, 8)
      : [];

  const showDropdown = isOpen && value.trim().length > 0 && matches.length > 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < matches.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : matches.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < matches.length) {
            onSelect(matches[highlightIndex]);
            setIsOpen(false);
            setHighlightIndex(-1);
          } else {
            onSubmit();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [showDropdown, matches, highlightIndex, onSelect, onSubmit],
  );

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-transparent border-b border-dashed border-muted-foreground/30 text-sm py-1 outline-none focus:border-teal-500 placeholder:text-muted-foreground/50 ${className}`}
      />

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden"
        >
          {matches.map((item, idx) => (
            <button
              key={`${item.category}-${item.name}`}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition ${
                idx === highlightIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
              onMouseEnter={() => setHighlightIndex(idx)}
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
                setHighlightIndex(-1);
              }}
            >
              <span className="flex-1 truncate">
                <span className="font-medium">{item.name}</span>
                {item.quantity && (
                  <span className="text-muted-foreground ml-1">
                    ({item.quantity})
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {item.category}
              </span>
            </button>
          ))}

          {/* Fallback: create as new item */}
          <button
            type="button"
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t transition ${
              highlightIndex === -1 || highlightIndex >= matches.length
                ? ''
                : 'hover:bg-accent/50'
            }`}
            onClick={() => {
              setIsOpen(false);
              onSubmit();
            }}
          >
            <span className="material-symbols-outlined text-base text-muted-foreground">
              add
            </span>
            <span className="text-muted-foreground">
              &quot;{value.trim()}&quot; als neuen Gegenstand anlegen
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
