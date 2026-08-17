import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import { NutritionalTagSchema, type NutritionalTag } from '@/schemas/supply';
import { X } from 'lucide-react';

const NutritionalTagListSchema = z.array(NutritionalTagSchema);

async function fetchJson<T>(url: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return schema.parse(data);
}

interface Props {
  selectedTagIds: number[];
  selectedTags: NutritionalTag[];
  onTagsChange: (tagIds: number[], tags: NutritionalTag[]) => void;
}

export function NutritionalTagAutocomplete({ selectedTagIds, selectedTags, onTagsChange }: Props) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { data: searchTags = [], isLoading } = useQuery<NutritionalTag[]>({
    queryKey: ['nutritional-tags', search],
    queryFn: () => fetchJson(`${API_BASE_URL}/api/nutritional-tags/?search=${encodeURIComponent(search)}`, NutritionalTagListSchema),
    enabled: search.length > 0,
  });

  const handleSelect = useCallback((tag: NutritionalTag) => {
    if (!selectedTagIds.includes(tag.id)) {
      onTagsChange([...selectedTagIds, tag.id], [...selectedTags, tag]);
    }
    setSearch('');
    setIsOpen(false);
  }, [selectedTagIds, selectedTags, onTagsChange]);

  const handleRemove = useCallback((tagId: number) => {
    onTagsChange(
      selectedTagIds.filter((id) => id !== tagId),
      selectedTags.filter((t) => t.id !== tagId)
    );
  }, [selectedTagIds, selectedTags, onTagsChange]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Besonderheiten</label>
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setIsOpen(true);
          }}
          onFocus={() => search && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder="z.B. Nüsse, Laktose..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        {isOpen && search && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Suche...</div>
            ) : searchTags.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Keine Treffer</div>
            ) : (
              searchTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(tag)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {tag.name}
              <button type="button" onClick={() => handleRemove(tag.id)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
