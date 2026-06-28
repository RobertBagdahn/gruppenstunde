import { useState, useRef, useEffect, useMemo } from 'react';
import { useNutritionalTags } from '@/api/supplies';

const TAG_COLOR_MAP: Record<string, string> = {
  'Tierbestandteile (nicht Vegetarisch)': 'bg-red-100 text-red-700 border-red-200',
  'Tierische Produkte (nicht Vegan)': 'bg-red-100 text-red-700 border-red-200',
  'Gluten (Zöliakie)': 'bg-amber-100 text-amber-700 border-amber-200',
  'Laktose': 'bg-amber-100 text-amber-700 border-amber-200',
  'Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...': 'bg-amber-100 text-amber-700 border-amber-200',
  'Erdnüsse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Fisch': 'bg-amber-100 text-amber-700 border-amber-200',
  'Soja, Sojaerzeugnisse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Sellerie, Sellerieerzeugnisse': 'bg-amber-100 text-amber-700 border-amber-200',
  'Senf': 'bg-amber-100 text-amber-700 border-amber-200',
  'Sesam': 'bg-amber-100 text-amber-700 border-amber-200',
  'Lupinen': 'bg-amber-100 text-amber-700 border-amber-200',
  'Histamin': 'bg-purple-100 text-purple-700 border-purple-200',
  'Fructose': 'bg-purple-100 text-purple-700 border-purple-200',
  'Koffeinhaltig': 'bg-purple-100 text-purple-700 border-purple-200',
  'Halal': 'bg-green-100 text-green-700 border-green-200',
  'Koscher': 'bg-green-100 text-green-700 border-green-200',
  'Gluten (nicht zöliakie)': 'bg-stone-100 text-stone-700 border-stone-200',
  'Weizen': 'bg-stone-100 text-stone-700 border-stone-200',
  'Roggen': 'bg-stone-100 text-stone-700 border-stone-200',
  'Gerste': 'bg-stone-100 text-stone-700 border-stone-200',
  'Hafer': 'bg-stone-100 text-stone-700 border-stone-200',
  'Dinkel': 'bg-stone-100 text-stone-700 border-stone-200',
  'Kamut': 'bg-stone-100 text-stone-700 border-stone-200',
  'Alkohol': 'bg-sky-100 text-sky-700 border-sky-200',
  'Scharf': 'bg-sky-100 text-sky-700 border-sky-200',
  'Schwefeldioxid und Sulfide': 'bg-sky-100 text-sky-700 border-sky-200',
  'Hülsenfrüchte': 'bg-sky-100 text-sky-700 border-sky-200',
  'Knoblauch': 'bg-sky-100 text-sky-700 border-sky-200',
};

function getTagColorClass(name: string): string {
  return TAG_COLOR_MAP[name] ?? 'bg-muted text-muted-foreground border-border';
}

function getTagDotColor(name: string): string {
  const colorMap: Record<string, string> = {
    'Tierbestandteile (nicht Vegetarisch)': 'bg-red-500',
    'Tierische Produkte (nicht Vegan)': 'bg-red-500',
    'Gluten (Zöliakie)': 'bg-amber-500',
    'Laktose': 'bg-amber-500',
    'Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...': 'bg-amber-500',
    'Erdnüsse': 'bg-amber-500',
    'Fisch': 'bg-amber-500',
    'Soja, Sojaerzeugnisse': 'bg-amber-500',
    'Sellerie, Sellerieerzeugnisse': 'bg-amber-500',
    'Senf': 'bg-amber-500',
    'Sesam': 'bg-amber-500',
    'Lupinen': 'bg-amber-500',
    'Histamin': 'bg-purple-500',
    'Fructose': 'bg-purple-500',
    'Koffeinhaltig': 'bg-purple-500',
    'Halal': 'bg-green-500',
    'Koscher': 'bg-green-500',
    'Gluten (nicht zöliakie)': 'bg-stone-500',
    'Weizen': 'bg-stone-500',
    'Roggen': 'bg-stone-500',
    'Gerste': 'bg-stone-500',
    'Hafer': 'bg-stone-500',
    'Dinkel': 'bg-stone-500',
    'Kamut': 'bg-stone-500',
    'Alkohol': 'bg-sky-500',
    'Scharf': 'bg-sky-500',
    'Schwefeldioxid und Sulfide': 'bg-sky-500',
    'Hülsenfrüchte': 'bg-sky-500',
    'Knoblauch': 'bg-sky-500',
  };
  return colorMap[name] ?? 'bg-muted-foreground';
}

interface NutritionalTagMultiSelectProps {
  selectedTagIds: number[];
  onToggle: (tagId: number) => void;
}

export default function NutritionalTagMultiSelect({ selectedTagIds, onToggle }: NutritionalTagMultiSelectProps) {
  const { data: nutritionalTags } = useNutritionalTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!nutritionalTags) return [];
    if (!search) return nutritionalTags;
    return nutritionalTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [nutritionalTags, search]);

  const selectedTags = useMemo(() => {
    if (!nutritionalTags) return [];
    return nutritionalTags.filter((t) => selectedTagIds.includes(t.id));
  }, [nutritionalTags, selectedTagIds]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium bg-muted border border-border rounded-lg hover:bg-border transition-colors whitespace-nowrap"
      >
        <span>Ernährungstags</span>
        {selectedTagIds.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full bg-primary text-white text-[10px] px-1 font-bold">
            {selectedTagIds.length}
          </span>
        )}
        <span className={`material-symbols-outlined text-[14px] transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-xl shadow-lg p-2 max-h-80 overflow-hidden flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full px-3 py-2 mb-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                Keine Einträge gefunden
              </p>
            ) : (
              filtered.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm hover:bg-muted rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(tag.id)}
                      className="rounded border-muted-foreground accent-primary"
                    />
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTagDotColor(tag.name)}`} />
                    {tag.name}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected tags as removable chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border font-medium transition-colors ${getTagColorClass(tag.name)}`}
            >
              {tag.name}
              <span className="material-symbols-outlined text-[12px]">close</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
