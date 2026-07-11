import { useState, useDeferredValue, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useIngredientSearch } from '@/api/supplies';
import { useIngredientGroups, useRetailSections, useNutritionalTags } from '@/api/supplies';
import type { Portion } from '@/schemas/supply';
import IngredientQuantityDialog from './IngredientQuantityDialog';

// ---------------------------------------------------------------------------
// Nutriscore Badge
// ---------------------------------------------------------------------------

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

function NutriscoreBadge({ nutriClass }: { nutriClass: number | null | undefined }) {
  if (!nutriClass) return <span className="text-muted-foreground text-xs">–</span>;
  const label = ['A', 'B', 'C', 'D', 'E'][nutriClass - 1] ?? '?';
  const colors = NUTRI_SCORE_COLORS[label];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0',
        colors?.bg ?? 'bg-muted',
        colors?.text ?? 'text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ordering options
// ---------------------------------------------------------------------------

type Ordering = 'popularity' | 'relevance' | 'price_asc' | 'price_desc' | 'nutri_class_asc' | 'energy_kcal_asc';

const ORDERING_OPTIONS: { value: Ordering; label: string }[] = [
  { value: 'popularity', label: 'Beliebtheit' },
  { value: 'relevance', label: 'Relevanz' },
  { value: 'price_asc', label: 'Preis ↑' },
  { value: 'price_desc', label: 'Preis ↓' },
  { value: 'nutri_class_asc', label: 'Nutriscore' },
  { value: 'energy_kcal_asc', label: 'Kalorien' },
];

// ---------------------------------------------------------------------------
// FilterPill
// ---------------------------------------------------------------------------

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Ingredient row
// ---------------------------------------------------------------------------

interface IngredientRowProps {
  name: string;
  retailSectionName: string | null;
  groupNames: string[];
  energyKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbohydrateG: number | null;
  pricePerKg: number | null;
  nutriClass: number | null;
  onClick: () => void;
}

function formatNum(v: number | null): string {
  return v != null ? parseFloat(v.toFixed(1)) + 'g' : '–';
}

function IngredientRow({
  name,
  retailSectionName,
  groupNames,
  energyKcal,
  proteinG,
  fatG,
  carbohydrateG,
  pricePerKg,
  nutriClass,
  onClick,
}: IngredientRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-center gap-3"
    >
      <NutriscoreBadge nutriClass={nutriClass} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[retailSectionName, ...groupNames].filter(Boolean).join(' · ') || '\u00a0'}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        <span>{energyKcal != null ? `${Math.round(energyKcal)} kcal` : '–'}</span>
        <span>{formatNum(proteinG)} E</span>
        <span>{formatNum(fatG)} F</span>
        <span>{formatNum(carbohydrateG)} KH</span>
      </div>

      <span className="text-xs font-medium text-foreground shrink-0 ml-2">
        {pricePerKg != null
          ? `${pricePerKg.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/kg`
          : '–'}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

interface SelectedIngredient {
  id: number;
  name: string;
  slug: string;
  portions: Portion[];
}

interface IngredientDetailSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    ingredientId: number,
    ingredientName: string,
    ingredientSlug: string,
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
  ) => void;
  showQuantityDialog?: boolean;
}

export default function IngredientDetailSearchDialog({
  open,
  onOpenChange,
  onSelect,
  showQuantityDialog = true,
}: IngredientDetailSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedRetailSection, setSelectedRetailSection] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedNutritionalTags, setSelectedNutritionalTags] = useState<number[]>([]);
  const [ordering, setOrdering] = useState<Ordering>('popularity');
  const [page, setPage] = useState(1);
  const [quantityDialogIngredient, setQuantityDialogIngredient] = useState<SelectedIngredient | null>(null);
  const [loadingPortionsFor, setLoadingPortionsFor] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  const { data: retailSections = [] } = useRetailSections();
  const { data: nutritionalTags = [] } = useNutritionalTags();
  const { data: ingredientGroups = [] } = useIngredientGroups();

  // Only pass ordering to API if not 'relevance' (relevance = default backend ordering)
  const { data: results, isFetching } = useIngredientSearch({
    name: deferredQuery || undefined,
    retail_section: selectedRetailSection ?? undefined,
    group: selectedGroup ?? undefined,
    // AND-logic: use first selected tag (multi-tag AND requires multiple queries; single tag covers common case)
    nutritional_tag: selectedNutritionalTags.length > 0 ? selectedNutritionalTags[0] : undefined,
    ordering: ordering !== 'relevance' ? ordering : undefined,
    page,
    page_size: 20,
  });

  // Reset all state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedRetailSection(null);
      setSelectedGroup(null);
      setSelectedNutritionalTags([]);
      setOrdering('popularity');
      setPage(1);
      setQuantityDialogIngredient(null);
    }
  }, [open]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [deferredQuery, selectedRetailSection, selectedGroup, selectedNutritionalTags, ordering]);

  const toggleNutritionalTag = (tagId: number) => {
    setSelectedNutritionalTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleIngredientClick = async (slug: string, name: string, id: number) => {
    if (!showQuantityDialog) {
      onSelect(id, name, slug, null, null, 0);
      onOpenChange(false);
      return;
    }
    setLoadingPortionsFor(slug);
    try {
      const res = await fetch(`/api/ingredients/${slug}/portions/`, { credentials: 'include' });
      const portions: Portion[] = await res.json();
      setQuantityDialogIngredient({ id, name, slug, portions });
    } catch {
      // Portion load failed — fall through without opening dialog
    } finally {
      setLoadingPortionsFor(null);
    }
  };

  const handleQuantityConfirm = (
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
  ) => {
    if (!quantityDialogIngredient) return;
    onSelect(
      quantityDialogIngredient.id,
      quantityDialogIngredient.name,
      quantityDialogIngredient.slug,
      portionId,
      measuringUnitId,
      quantity,
    );
    setQuantityDialogIngredient(null);
    onOpenChange(false);
  };

  const items = results?.items ?? [];
  const totalPages = results?.total_pages ?? 1;

  return (
    <>
      <Dialog open={open && !quantityDialogIngredient} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-display">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <span className="flex-1">Zutat suchen</span>
              <button
                type="button"
                onClick={() => {
                  const currentUrl = `${window.location.pathname}${window.location.search}`;
                  navigate(`/ingredients/new?redirectTo=${encodeURIComponent(currentUrl)}`);
                  onOpenChange(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors text-sm font-medium text-primary"
                title="Neue Zutat anlegen"
              >
                <Plus className="w-4 h-4" />
                Neue Zutat
              </button>
            </DialogTitle>
          </DialogHeader>

          {/* Suchfeld */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nach Zutat suchen..."
              autoFocus
              className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Abteilungs-Filter */}
          {retailSections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Abteilung:</span>
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <FilterPill
                  label="Alle"
                  active={selectedRetailSection === null}
                  onClick={() => setSelectedRetailSection(null)}
                />
                {retailSections.map((rs) => (
                  <FilterPill
                    key={rs.id}
                    label={rs.name}
                    active={selectedRetailSection === rs.id}
                    onClick={() =>
                      setSelectedRetailSection(selectedRetailSection === rs.id ? null : rs.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gruppen-Filter */}
          {ingredientGroups.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Gruppe:</span>
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <FilterPill
                  label="Alle"
                  active={selectedGroup === null}
                  onClick={() => setSelectedGroup(null)}
                />
                {ingredientGroups.map((g) => (
                  <FilterPill
                    key={g.id}
                    label={g.name}
                    active={selectedGroup === g.slug}
                    onClick={() =>
                      setSelectedGroup(selectedGroup === g.slug ? null : g.slug)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Diät-Tag-Filter */}
          {nutritionalTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Diät:</span>
              <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {nutritionalTags.map((tag) => (
                  <FilterPill
                    key={tag.id}
                    label={tag.name}
                    active={selectedNutritionalTags.includes(tag.id)}
                    onClick={() => toggleNutritionalTag(tag.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sortierung */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">Sortierung:</span>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {ORDERING_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.value}
                  label={opt.label}
                  active={ordering === opt.value}
                  onClick={() => setOrdering(opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Aktive Filter-Badges (Übersicht) */}
          {selectedNutritionalTags.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              {selectedNutritionalTags.slice(1).map((tagId) => {
                const tag = nutritionalTags.find((t) => t.id === tagId);
                return tag ? (
                  <span
                    key={tagId}
                    className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    {tag.name}
                    <button onClick={() => toggleNutritionalTag(tagId)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
              <span className="text-xs text-muted-foreground">
                (mehrere Tags werden als UND-Filter angewendet)
              </span>
            </div>
          )}

          {/* Ergebnisliste */}
          <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0">
            {isFetching && items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Suche läuft…</div>
            )}

            {!isFetching && items.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Keine Zutaten gefunden
              </div>
            )}

            {items.map((ingredient) => (
              <IngredientRow
                key={ingredient.id}
                name={ingredient.name}
                retailSectionName={ingredient.retail_section_name}
                groupNames={ingredient.groups?.map((g) => g.name) ?? []}
                energyKcal={ingredient.energy_kcal}
                proteinG={ingredient.protein_g}
                fatG={ingredient.fat_g}
                carbohydrateG={ingredient.carbohydrate_g}
                pricePerKg={ingredient.price_per_kg}
                nutriClass={ingredient.nutri_class}
                onClick={() =>
                  handleIngredientClick(ingredient.slug, ingredient.name, ingredient.id)
                }
              />
            ))}

            {loadingPortionsFor && (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Portionen werden geladen…
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Seite {page} von {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
                  >
                    Zurück
                  </button>
                )}
                {page < totalPages && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
                  >
                    Mehr laden
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mengenauswahl-Dialog */}
      {quantityDialogIngredient && (
        <IngredientQuantityDialog
          ingredient={quantityDialogIngredient}
          open={!!quantityDialogIngredient}
          onOpenChange={(isOpen) => {
            if (!isOpen) setQuantityDialogIngredient(null);
          }}
          onConfirm={handleQuantityConfirm}
        />
      )}
    </>
  );
}
