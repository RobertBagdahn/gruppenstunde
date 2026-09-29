import { useState, useRef, useEffect, useMemo } from 'react';
import { useNutritionalTags } from '@/api/supplies';

const TAG_COLOR_MAP: Record<string, string> = {
  'Tierbestandteile (nicht Vegetarisch)': 'bg-danger-soft text-danger border-danger-border',
  'Tierische Produkte (nicht Vegan)': 'bg-danger-soft text-danger border-danger-border',
  'Gluten (Zöliakie)': 'bg-warning-soft text-warning border-warning-border',
  'Laktose': 'bg-warning-soft text-warning border-warning-border',
  'Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...': 'bg-warning-soft text-warning border-warning-border',
  'Erdnüsse': 'bg-warning-soft text-warning border-warning-border',
  'Fisch': 'bg-warning-soft text-warning border-warning-border',
  'Soja, Sojaerzeugnisse': 'bg-warning-soft text-warning border-warning-border',
  'Sellerie, Sellerieerzeugnisse': 'bg-warning-soft text-warning border-warning-border',
  'Senf': 'bg-warning-soft text-warning border-warning-border',
  'Sesam': 'bg-warning-soft text-warning border-warning-border',
  'Lupinen': 'bg-warning-soft text-warning border-warning-border',
  'Histamin': 'bg-info-soft text-info border-info-border',
  'Fructose': 'bg-info-soft text-info border-info-border',
  'Koffeinhaltig': 'bg-info-soft text-info border-info-border',
  'Halal': 'bg-success-soft text-success border-success-border',
  'Koscher': 'bg-success-soft text-success border-success-border',
  'Gluten (nicht zöliakie)': 'bg-muted text-foreground border-border',
  'Weizen': 'bg-muted text-foreground border-border',
  'Roggen': 'bg-muted text-foreground border-border',
  'Gerste': 'bg-muted text-foreground border-border',
  'Hafer': 'bg-muted text-foreground border-border',
  'Dinkel': 'bg-muted text-foreground border-border',
  'Kamut': 'bg-muted text-foreground border-border',
  'Alkohol': 'bg-info-soft text-info border-info-border',
  'Scharf': 'bg-info-soft text-info border-info-border',
  'Schwefeldioxid und Sulfide': 'bg-info-soft text-info border-info-border',
  'Hülsenfrüchte': 'bg-info-soft text-info border-info-border',
  'Knoblauch': 'bg-info-soft text-info border-info-border',
};

function getTagColorClass(name: string): string {
  return TAG_COLOR_MAP[name] ?? 'bg-muted text-muted-foreground border-border';
}

function getTagDotColor(name: string): string {
  const colorMap: Record<string, string> = {
    'Tierbestandteile (nicht Vegetarisch)': 'bg-danger',
    'Tierische Produkte (nicht Vegan)': 'bg-danger',
    'Gluten (Zöliakie)': 'bg-warning',
    'Laktose': 'bg-warning',
    'Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...': 'bg-warning',
    'Erdnüsse': 'bg-warning',
    'Fisch': 'bg-warning',
    'Soja, Sojaerzeugnisse': 'bg-warning',
    'Sellerie, Sellerieerzeugnisse': 'bg-warning',
    'Senf': 'bg-warning',
    'Sesam': 'bg-warning',
    'Lupinen': 'bg-warning',
    'Histamin': 'bg-info',
    'Fructose': 'bg-info',
    'Koffeinhaltig': 'bg-info',
    'Halal': 'bg-success',
    'Koscher': 'bg-success',
    'Gluten (nicht zöliakie)': 'bg-muted-foreground',
    'Weizen': 'bg-muted-foreground',
    'Roggen': 'bg-muted-foreground',
    'Gerste': 'bg-muted-foreground',
    'Hafer': 'bg-muted-foreground',
    'Dinkel': 'bg-muted-foreground',
    'Kamut': 'bg-muted-foreground',
    'Alkohol': 'bg-info',
    'Scharf': 'bg-info',
    'Schwefeldioxid und Sulfide': 'bg-info',
    'Hülsenfrüchte': 'bg-info',
    'Knoblauch': 'bg-info',
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
        className="flex items-center gap-1.5 h-8 px-2.5 text-caption font-medium bg-muted border border-border rounded-lg hover:bg-border transition-colors whitespace-nowrap"
      >
        <span>Ernährungstags</span>
        {selectedTagIds.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-4 rounded-full bg-primary text-white text-caption px-1 font-bold">
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
            className="w-full px-3 py-2 mb-2 text-body bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {filtered.length === 0 ? (
              <p className="text-body text-muted-foreground px-2 py-4 text-center">
                Keine Einträge gefunden
              </p>
            ) : (
              filtered.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-body hover:bg-muted rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(tag.id)}
                      className="rounded-lg border-muted-foreground accent-primary"
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
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-caption rounded-full border font-medium transition-colors ${getTagColorClass(tag.name)}`}
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
