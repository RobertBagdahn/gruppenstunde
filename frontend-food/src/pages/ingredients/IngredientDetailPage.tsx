import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, Plus, X, Search, CheckCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCurrentUser } from '@/api/auth';
import { useTags } from '@/api/tags';
import type { Tag } from '@/schemas/content';
import {
  useIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useCreatePortion,
  useUpdatePortion,
  useDeletePortion,
  useReorderPortions,
  useCreateAlias,
  useDeleteAlias,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  useAiSuggestIngredientAll,
  useApplyAiSuggestions,
  useMeasuringUnits,
  useRecipesByIngredient,
} from '@/api/supplies';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import type { Package, Portion, MeasuringUnit, PortionSuggestion as PortionSuggestionShape, PackageSuggestion as PackageSuggestionShape } from '@/schemas/supply';
import { formatMeasuringUnitLabel } from '@/lib/units';
// Use the inferred return type from useIngredient to avoid TS2719 cross-module conflicts
type IngredientDetail = NonNullable<ReturnType<typeof useIngredient>['data']>;
import { ApiDeleteError } from '@/api/supplies';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { AiSuggestDialog, type SuggestionField } from '@/components/shared/AiSuggestDialog';
import { IngredientBenchmarkSection } from '@/components/ingredient/IngredientBenchmarkSection';

import { SortablePortionItem } from '@/components/ingredients/SortablePortionItem';
import RecipeCard from '@/components/recipe/RecipeCard';

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'verified', label: 'Verifiziert' },
  { value: 'user_content', label: 'Benutzer erstellt' },
];

// ---------------------------------------------------------------------------
// NutriScoreBadge
// ---------------------------------------------------------------------------
function NutriScoreBadge({ nutriClass }: { nutriClass: number | null }) {
  if (!nutriClass) return null;
  const colors = NUTRI_SCORE_COLORS[nutriClass];
  if (!colors) return null;
  return (
    <span className={`${colors.bg} ${colors.text} text-sm font-bold px-3 py-1 rounded-md`}>
      Nutri-Score {colors.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// NutritionalTagBadge
// ---------------------------------------------------------------------------
function NutritionalTagBadge({
  name,
  isDangerous,
}: {
  name: string;
  isDangerous: boolean;
}) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        isDangerous
          ? 'bg-destructive/10 text-destructive border border-destructive/20'
          : 'bg-muted text-muted-foreground border border-border'
      }`}
    >
      {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Nutrition Value Row
// ---------------------------------------------------------------------------
function NutritionRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">
        {value !== null ? `${parseFloat(value.toFixed(1))} ${unit}` : '\u2014'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Nutrition Group (for Vitamins / Minerals)
// ---------------------------------------------------------------------------
function CollapsibleNutritionGroup({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <span className={`material-symbols-outlined text-base ${iconColor}`}>{icon}</span>
          {title}
        </span>
        <span
          className={`material-symbols-outlined text-muted-foreground text-base transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Package Row
// ---------------------------------------------------------------------------
function PackageRow({
  pkg,
  canEdit = false,
  updatePackage,
  deletePackage,
}: {
  pkg: Package;
  canEdit?: boolean;
  updatePackage: ReturnType<typeof useUpdatePackage>;
  deletePackage: ReturnType<typeof useDeletePackage>;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(pkg.name);
  const [editWeight, setEditWeight] = useState(pkg.weight_g?.toString() || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEditName(pkg.name);
    setEditWeight(pkg.weight_g?.toString() || '');
  }, [pkg]);

  if (editing) {
    return (
      <div className="flex items-center gap-2 p-3 border border-border rounded-xl bg-card">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
        />
        <input
          value={editWeight}
          onChange={(e) => setEditWeight(e.target.value)}
          type="number"
          placeholder="g"
          className="w-24 px-2 py-1 text-sm border border-border rounded bg-background"
        />
        <button
          onClick={() => {
            updatePackage.mutate({
              packageId: pkg.id,
              data: { name: editName, weight_g: editWeight ? parseFloat(editWeight) : null },
            });
            setEditing(false);
          }}
          className="text-xs text-primary hover:underline"
        >
          OK
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">
          Abbrechen
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-card">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{pkg.name}</span>
        {pkg.weight_g && (
          <span className="text-xs text-muted-foreground ml-2">{pkg.weight_g}g</span>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 text-muted-foreground hover:text-destructive"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          open={confirmDelete}
          title="Packung löschen"
          description={`"${pkg.name}" wirklich löschen?`}
          onConfirm={() => {
            deletePackage.mutate(pkg.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
          loading={deletePackage.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portion Card
// ---------------------------------------------------------------------------
function PortionCard({
  portion,
  slug,
  canEdit = false,
}: {
  portion: Portion;
  slug: string;
  canEdit?: boolean;
}) {
  const updatePortion = useUpdatePortion(slug);
  const deletePortion = useDeletePortion(slug);
  const { data: measuringUnits } = useMeasuringUnits();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(portion.name);
  const [editRank, setEditRank] = useState(String(portion.rank));
  const [editQuantity, setEditQuantity] = useState(String(portion.quantity ?? 1));
  const [editUnitId, setEditUnitId] = useState(String(portion.measuring_unit_id ?? ''));
  const [editWeight, setEditWeight] = useState(portion.weight_g?.toString() || '');

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSavePortion = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Name darf nicht leer sein');
      return;
    }
    const weight = editWeight.trim() ? Number(editWeight) : null;
    if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) {
      toast.error('Gewicht muss größer als 0 g sein');
      return;
    }
    updatePortion.mutate(
      {
        portionId: portion.id,
        data: {
          name: trimmed,
          rank: Number(editRank),
          quantity: Number(editQuantity) || 1,
          measuring_unit_id: editUnitId ? Number(editUnitId) : null,
          weight_g: weight,
        },
      },
      {
        onSuccess: () => {
          toast.success('Portion aktualisiert');
          setEditing(false);
        },
        onError: (err: Error) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const isDefault = portion.rank === 1;

  return (
    <div className={`border rounded-xl overflow-hidden shadow-soft ${isDefault ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${isDefault ? 'bg-primary/10 border-primary/20' : 'bg-muted/20 border-border/80'}`}>
        <span className={`material-symbols-outlined text-lg shrink-0 ${isDefault ? 'text-primary' : 'text-primary'}`}>
          scale
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col flex-1">
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-full"
                  placeholder="z.B. EL, ml, Gramm"
                />
              </div>
              <div className="flex flex-col w-20">
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5">Anzahl</label>
                <input
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  type="number"
                  step="0.01"
                  className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-full"
                />
              </div>
              <div className="flex flex-col w-28">
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5">Einheit</label>
                <select
                  value={editUnitId}
                  onChange={(e) => setEditUnitId(e.target.value)}
                  className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-full"
                >
                  <option value="">—</option>
                  {measuringUnits?.map((u) => (
                    <option key={u.id} value={u.id}>{formatMeasuringUnitLabel(u)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col w-16">
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5">Rank</label>
                <input
                  value={editRank}
                  onChange={(e) => setEditRank(e.target.value)}
                  type="number"
                  step="1"
                  className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-full"
                />
              </div>
              <div className="flex flex-col w-20">
                <label className="text-[10px] text-muted-foreground font-medium mb-0.5">Gewicht (g)</label>
                <input
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  type="number"
                  min="0.01"
                  step="0.1"
                  className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-full"
                  placeholder="z. B. 15"
                />
              </div>
              <button
                onClick={handleSavePortion}
                disabled={!editName.trim()}
                className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded self-end disabled:opacity-50"
              >
                OK
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-2 py-1 bg-muted rounded self-end"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {portion.name.trim() || <span className="text-destructive font-medium italic">Unbenannt</span>}
              </span>
              {isDefault && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
                  Standard
                </span>
              )}
              {portion.weight_g ? (
                <span className="text-xs text-muted-foreground">
                  ≈ {portion.weight_g}g
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[11px] bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] font-medium px-1.5 py-0.5 rounded border border-[hsl(var(--chart-4))]/20"
                  title="Gewicht konnte nicht automatisch berechnet werden. Bitte manuell pflegen, um die Portion in Rezepten nutzen zu können."
                >
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Kein Gewicht
                </span>
              )}
            </div>
          )}
        </div>

        {!editing && canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground rounded p-1 transition"
              title="Bearbeiten"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-destructive/60 hover:text-destructive rounded p-1 transition"
              title="Löschen"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onConfirm={() => {
          deletePortion.mutate(portion.id, {
            onSuccess: () => {
              toast.success('Portion gelöscht');
              setConfirmDelete(false);
            },
            onError: (err: Error) => {
              toast.error('Fehler', { description: err.message });
              setConfirmDelete(false);
            },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
        title="Portion löschen?"
        description="Die Portion wird unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deletePortion.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecipesSection — shows recipes that use this ingredient
// ---------------------------------------------------------------------------

function RecipesSection({ slug, ingredientName }: { slug: string; ingredientName: string }) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useRecipesByIngredient(slug);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <ChefHat className="text-primary" size={20} />
          Rezepte mit dieser Zutat
        </h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <p className="text-sm text-destructive">
          Rezepte konnten nicht geladen werden.
        </p>
      )}

      {/* Empty state */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="border border-border rounded-xl p-6 bg-card text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Noch kein Rezept mit dieser Zutat.
          </p>
          <button
            onClick={() => navigate(`/recipes/new?ingredient=${slug}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus size={16} />
            Rezept mit {ingredientName} erstellen
          </button>
        </div>
      )}

      {/* Recipe grid */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {data.items.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe as unknown as import('@/schemas/recipe').RecipeListItem} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PortionsSection with Drag & Drop
// ---------------------------------------------------------------------------

interface PortionsSectionProps {
  ingredient: IngredientDetail;
  canEdit: boolean;
  showAddPortion: boolean;
  setShowAddPortion: (show: boolean) => void;
  newPortionName: string;
  setNewPortionName: (name: string) => void;
  newPortionQuantity: string;
  setNewPortionQuantity: (qty: string) => void;
  newPortionUnitId: string;
  setNewPortionUnitId: (id: string) => void;
  measuringUnits: MeasuringUnit[];
  onAddPortion: () => void;
  isAddingPortion: boolean;
}

function PortionsSection({
  ingredient,
  canEdit,
  showAddPortion,
  setShowAddPortion,
  newPortionName,
  setNewPortionName,
  newPortionQuantity,
  setNewPortionQuantity,
  newPortionUnitId,
  setNewPortionUnitId,
  measuringUnits,
  onAddPortion,
  isAddingPortion,
}: PortionsSectionProps) {
  const reorderPortions = useReorderPortions(ingredient.slug);
  const [portions, setPortions] = useState(ingredient.portions);

  useEffect(() => {
    setPortions(ingredient.portions);
  }, [ingredient.portions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedPortions = useMemo(() => {
    return [...portions].sort((a, b) => a.rank - b.rank);
  }, [portions]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = sortedPortions.findIndex((p) => p.id === active.id);
      const newIndex = sortedPortions.findIndex((p) => p.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Rearrange locally first (optimistic update)
      const newPortions = arrayMove(sortedPortions, oldIndex, newIndex);
      // Die g-Portion (rank 9999) wird aus der Payload gefiltert — nur nicht-g-Portionen erhalten Ränge 1..N
      let rankCounter = 1;
      const orders = newPortions
        .filter((p: Portion) => p.name !== 'g')
        .map((p: Portion) => ({
          id: p.id,
          rank: rankCounter++,
        }));

      setPortions(newPortions);

      // Send to backend
      reorderPortions.mutate(orders, {
        onError: () => {
          // Revert on error
          setPortions(ingredient.portions);
          toast.error('Fehler beim Speichern der Sortierung');
        },
        onSuccess: (updatedPortions) => {
          // Update with server response
          setPortions(updatedPortions);
          toast.success('Portionen neu sortiert');
        },
      });
    },
    [sortedPortions, reorderPortions, ingredient.portions],
  );

  const portionIds = useMemo(() => sortedPortions.map((p) => p.id), [sortedPortions]);

  // Check if Packung portion is missing weight
  const packungPortion = sortedPortions.find((p) => p.name === 'Packung');
  const packungHasWeight = packungPortion && packungPortion.weight_g && packungPortion.weight_g > 0;
  const showPackungWarning = packungPortion && !packungHasWeight;

  return (
    <div className="mb-8">
      {showPackungWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
          <div className="text-sm text-amber-800">
            <strong>Packungsgewicht fehlt:</strong> Die Packung-Portion hat kein Gewicht. Bitte manuell eintragen, damit die Einkaufsliste korrekt berechnet wird.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">scale</span>
            Portionen
          </h2>
          <p className="text-xs text-muted-foreground mt-1 ml-7">
            Jede Portion hat einen Namen, eine Anzahl und eine Einheit. Das Gewicht in Gramm wird automatisch berechnet.
            Ziehen Sie die Portionen zum Sortieren.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddPortion(!showAddPortion)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Portion hinzufügen
          </button>
        )}
      </div>

      {showAddPortion && (
        <div className="border border-border rounded-xl p-4 mb-4 bg-card shadow-soft">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newPortionName}
              onChange={(e) => setNewPortionName(e.target.value)}
              placeholder="Portionsname (z.B. Tasse, EL)"
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddPortion();
              }}
              autoFocus
            />
            <input
              type="number"
              value={newPortionQuantity}
              onChange={(e) => setNewPortionQuantity(e.target.value)}
              placeholder="Anzahl"
              className="w-20 px-3 py-2 border rounded-md text-sm bg-background"
            />
            <select
              value={newPortionUnitId}
              onChange={(e) => setNewPortionUnitId(e.target.value)}
              className="w-28 px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="">Einheit…</option>
              {measuringUnits?.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatMeasuringUnitLabel(u)}
                </option>
              ))}
            </select>
            <button
              onClick={onAddPortion}
              disabled={!newPortionName.trim() || isAddingPortion}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {ingredient.portions.length === 0 && <p className="text-sm text-muted-foreground italic">Keine Portionen definiert.</p>}

      {canEdit ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={portionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedPortions.map((portion) => (
                <SortablePortionItem key={portion.id} portion={portion} canEdit={canEdit}>
                  <PortionCard portion={portion} slug={ingredient.slug} canEdit={canEdit} />
                </SortablePortionItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {sortedPortions.map((portion) => (
            <SortablePortionItem key={portion.id} portion={portion} canEdit={canEdit}>
              <PortionCard portion={portion} slug={ingredient.slug} canEdit={canEdit} />
            </SortablePortionItem>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main IngredientDetailPage
// ---------------------------------------------------------------------------
export default function IngredientDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const { data: ingredient, isLoading, error, refetch } = useIngredient(slug || '');
  const updateIngredient = useUpdateIngredient(slug || '');
  const deleteIngredient = useDeleteIngredient();
  const createPortion = useCreatePortion(slug || '');
  const applyAiSuggestions = useApplyAiSuggestions(slug || '');

  const createAlias = useCreateAlias(slug || '');
  const deleteAlias = useDeleteAlias(slug || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAliasId, setDeleteAliasId] = useState<number | null>(null);

  // Package hooks
  const createPackage = useCreatePackage(slug || '');
  const updatePackage = useUpdatePackage(slug || '');
  const deletePackage = useDeletePackage(slug || '');
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageWeight, setNewPackageWeight] = useState('');

  // Tag state
  const { data: allTags } = useTags();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Portion add
  const [showAddPortion, setShowAddPortion] = useState(false);
  const [newPortionName, setNewPortionName] = useState('');
  const [newPortionQuantity, setNewPortionQuantity] = useState('1');
  const [newPortionUnitId, setNewPortionUnitId] = useState('');
  const { data: measuringUnits } = useMeasuringUnits();

  // Alias add
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasIsGeneric, setNewAliasIsGeneric] = useState(false);

  // AI Suggest
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [replacePortions, setReplacePortions] = useState(false);
  const aiSuggest = useAiSuggestIngredientAll(slug || '');

  const canEdit = ingredient?.can_edit ?? false;
  const canAiSuggest = !!user && user.is_staff;

  // --- Loading / error states ---
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  if (error || !ingredient) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorDisplay
          error={error}
          title="Zutat nicht gefunden"
          description="Die Zutat existiert nicht oder wurde entfernt."
          onBack={() => navigate('/ingredients')}
          backLabel="Zurück zur Übersicht"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const handleApplyAiSuggestions = (selectedKeys: string[]) => {
    if (!aiSuggest.data || !ingredient) return;

    const data = aiSuggest.data;
    const scalarUpdates: Record<string, unknown> = {};
    const selectedPortions: PortionSuggestionShape[] = [];
    const selectedPackages: PackageSuggestionShape[] = [];
    const aliasesToCreate: string[] = [];
    const tagsToAssign: number[] = [];

    const portionsByKey: Record<string, PortionSuggestionShape> = {};
    const packagesByKey: Record<string, PackageSuggestionShape> = {};
    if (data.ai_suggest) {
      const normalizePortion = (p: {
        name: string;
        weight_g: number;
        measuring_unit_name: string;
        portion_type: string;
        quantity?: number;
        rank?: number;
      }): PortionSuggestionShape => ({
        name: p.name,
        weight_g: p.weight_g,
        measuring_unit_name: p.measuring_unit_name,
        portion_type: p.portion_type as PortionSuggestionShape['portion_type'],
        quantity: p.quantity ?? 1,
        rank: p.rank ?? 1,
      });
      (data.ai_suggest.portions ?? []).forEach((p, i) => {
        portionsByKey[`portion_rezeptportion_${i}`] = normalizePortion(p);
      });
      (data.ai_suggest.packages ?? []).forEach((p, i) => {
        packagesByKey[`package_${i}`] = {
          name: p.name,
          weight_g: p.weight_g,
          rank: p.rank ?? 1,
          package_type: p.package_type ?? 'packung',
        };
      });
    }

    for (const key of selectedKeys) {
      if (key.startsWith('portion_')) {
        if (portionsByKey[key]) selectedPortions.push(portionsByKey[key]);
      } else if (key.startsWith('package_')) {
        if (packagesByKey[key]) selectedPackages.push(packagesByKey[key]);
      } else if (key.startsWith('alias_')) {
        const idx = parseInt(key.replace('alias_', ''), 10);
        if (data.aliases?.[idx]) aliasesToCreate.push(data.aliases[idx]);
      } else if (key.startsWith('tag_')) {
        const tagId = parseInt(key.replace('tag_', ''), 10);
        tagsToAssign.push(tagId);
      } else if (key === 'name_suggestion') {
        const value = (data as Record<string, unknown>)[key];
        if (value && typeof value === 'string') {
          scalarUpdates['name'] = value;
        }
      } else {
        const value = (data as Record<string, unknown>)[key];
        if (value !== null && value !== undefined) {
          scalarUpdates[key] = value;
        }
      }
    }

    if (tagsToAssign.length > 0) {
      const existingTagIds = (ingredient.nutritional_tags || []).map((t) => t.id);
      scalarUpdates['nutritional_tag_ids'] = Array.from(
        new Set([...existingTagIds, ...tagsToAssign])
      );
    }

    const promises: Promise<unknown>[] = [];
    if (Object.keys(scalarUpdates).length > 0) {
      promises.push(
        new Promise((resolve, reject) =>
          updateIngredient.mutate(scalarUpdates, { onSuccess: resolve, onError: reject })
        )
      );
    }

    // Selected portions (incl. optional replace_all) go through the atomic
    // backend endpoint, which resolves measuring_unit_name server-side and
    // handles the mandatory "g" system portion recreation in one transaction.
    if (selectedPortions.length > 0 || selectedPackages.length > 0 || replacePortions) {
      promises.push(
        new Promise((resolve, reject) =>
          applyAiSuggestions.mutate(
            { replace_all: replacePortions, portions: selectedPortions, packages: selectedPackages },
            { onSuccess: resolve, onError: reject }
          )
        )
      );
    }

    for (const alias of aliasesToCreate) {
      promises.push(
        new Promise((resolve, reject) =>
          createAlias.mutate({ name: alias }, { onSuccess: resolve, onError: reject })
        )
      );
    }

    setShowAiSuggest(false);
    setReplacePortions(false);

    Promise.all(promises)
      .then(() => {
        toast.success('Vorschläge übernommen');
      })
      .catch((err) => {
        toast.error('Fehler', { description: (err as Error).message });
      });
  };

  const handleDelete = () => {
    deleteIngredient.mutate(ingredient.slug, {
      onSuccess: () => {
        toast.success('Zutat gelöscht');
        navigate('/ingredients');
      },
      onError: (err: Error) => {
        setShowDeleteConfirm(false);
        if (err instanceof ApiDeleteError && err.status === 409 && err.recipes.length > 0) {
          const recipeNames = err.recipes.map((r) => r.title).join(', ');
          toast.error('Zutat wird noch verwendet', {
            description: `Entferne die Zutat zuerst aus folgenden Rezepten: ${recipeNames}`,
          });
        } else {
          toast.error('Fehler beim Löschen', { description: err.message });
        }
      },
    });
  };

  const handleAddPortion = () => {
    const trimmed = newPortionName.trim();
    if (!trimmed) {
      toast.error('Name darf nicht leer sein');
      return;
    }
    createPortion.mutate(
      {
        name: trimmed,
        quantity: Number(newPortionQuantity) || 1,
        measuring_unit_id: newPortionUnitId ? Number(newPortionUnitId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Portion hinzugefügt');
          setNewPortionName('');
          setNewPortionQuantity('1');
          setNewPortionUnitId('');
          setShowAddPortion(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddAlias = () => {
    const trimmed = newAliasName.trim();
    if (!trimmed) return;
    createAlias.mutate(
      { name: trimmed, is_generic: newAliasIsGeneric },
      {
        onSuccess: () => {
          toast.success('Alias hinzugefügt');
          setNewAliasName('');
          setNewAliasIsGeneric(false);
          setShowAddAlias(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '\u2014';
    return `${price.toFixed(2).replace('.', ',')} EUR`;
  };

  const nutriColors = ingredient.nutri_class
    ? NUTRI_SCORE_COLORS[ingredient.nutri_class]
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/ingredients')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Alle Zutaten
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground truncate">{ingredient.name}</h1>
            {ingredient.status === 'verified' ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 border bg-emerald-50 border-emerald-200 text-emerald-700 flex items-center gap-1">
                <CheckCircle size={12} />
                Inspi Verified
              </span>
            ) : (
              <>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 border ${
                  ingredient.status === 'draft'
                    ? 'bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/20 text-[hsl(var(--chart-4))]'
                    : 'bg-[hsl(var(--chart-5))]/10 border-[hsl(var(--chart-5))]/20 text-[hsl(var(--chart-5))]'
                }`}>
                  {STATUS_OPTIONS.find((s) => s.value === ingredient.status)?.label ?? ingredient.status}
                </span>
                {user?.is_staff && (
                  <button
                    onClick={() => updateIngredient.mutate({ status: 'verified' } as Record<string, unknown>)}
                    disabled={updateIngredient.isPending}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-200 text-emerald-700 hover:bg-emerald-50 shrink-0"
                  >
                    Verifizieren
                  </button>
                )}
              </>
            )}
          </div>
          {ingredient.description && (
            <p className="text-sm text-muted-foreground mb-2">{ingredient.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <NutriScoreBadge nutriClass={ingredient.nutri_class} />
            {ingredient.camp_suitable && (
              <span className="flex items-center gap-1 text-xs text-foreground bg-amber-100 px-2 py-1 rounded">
                <span className="material-symbols-outlined text-sm">camping</span>
                Camp-geeignet
              </span>
            )}
            {ingredient.retail_section_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <span className="material-symbols-outlined text-sm">store</span>
                {ingredient.retail_section_name}
              </span>
            )}
            {ingredient.price_per_kg !== null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                <span className="material-symbols-outlined text-sm">payments</span>
                {formatPrice(ingredient.price_per_kg)}/kg
              </span>
            )}
            {ingredient.is_standalone_food && (
              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded font-medium">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Roh verzehrbar
              </span>
            )}
          </div>
        </div>

        {(canEdit || canAiSuggest) && (
          <div className="flex items-center gap-1 shrink-0">
            {canAiSuggest && (
              <button
                onClick={() => {
                  setShowAiSuggest(true);
                  if (!aiSuggest.data && !aiSuggest.isPending) {
                    aiSuggest.mutate();
                  }
                }}
                className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
                title="KI-Vorschläge"
              >
                <span className="material-symbols-outlined text-lg">auto_fix_high</span>
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={() => navigate(`/ingredients/${ingredient.slug}/edit`)}
                  className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
                  title="Bearbeiten"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-md hover:bg-destructive/10 transition text-destructive/70 hover:text-destructive"
                  title="Zutat löschen"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Nutritional Tags */}
      {ingredient.nutritional_tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {ingredient.nutritional_tags.map((tag) => (
            <NutritionalTagBadge
              key={tag.id}
              name={tag.name}
              isDangerous={tag.is_dangerous}
            />
          ))}
        </div>
      )}

      {/* Tags (content.Tag) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
          {canEdit && (
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus size={14} />
              Tag hinzufügen
            </button>
          )}
        </div>
        {showTagPicker && canEdit && (
          <div className="mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Tag suchen..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            {tagSearch && (
              <div className="mt-1 border border-border rounded-lg max-h-40 overflow-y-auto bg-card">
                {(allTags || [])
                  .filter((t) => !(ingredient.tags || []).some((it: Tag) => it.id === t.id) && t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .slice(0, 10)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const newTagIds = [...(ingredient.tags || []).map((t: Tag) => t.id), tag.id];
                        updateIngredient.mutate({ tag_ids: newTagIds } as Record<string, unknown>);
                        setTagSearch('');
                        setShowTagPicker(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <span className="text-xs">{tag.icon}</span>
                      <span>{tag.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{tag.group}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(ingredient.tags || []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Keine Tags</p>
          ) : (
            (ingredient.tags || []).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted border border-border"
              >
                <span>{tag.icon}</span>
                <span>{tag.name}</span>
                {canEdit && (
                  <button
                    onClick={() => {
                      const newTagIds = (ingredient.tags || []).filter((t: Tag) => t.id !== tag.id).map((t: Tag) => t.id);
                      updateIngredient.mutate({ tag_ids: newTagIds } as Record<string, unknown>);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Nutritional Values */}
        <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
          <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">nutrition</span>
            Nährwerte pro 100g
          </h2>
          <div>
            <NutritionRow label="Energie" value={ingredient.energy_kcal != null ? Math.round(ingredient.energy_kcal) : null} unit="kcal" />
            <NutritionRow label="Protein" value={ingredient.protein_g} unit="g" />
            <NutritionRow label="Fett" value={ingredient.fat_g} unit="g" />
            <NutritionRow label="  davon gesättigte Fettsäuren" value={ingredient.fat_sat_g} unit="g" />
            <NutritionRow label="Kohlenhydrate" value={ingredient.carbohydrate_g} unit="g" />
            <NutritionRow label="  davon Zucker" value={ingredient.sugar_g} unit="g" />
            <NutritionRow label="Ballaststoffe" value={ingredient.fibre_g} unit="g" />
            <NutritionRow label="Salz" value={ingredient.salt_g} unit="g" />
            <NutritionRow label="Natrium" value={ingredient.sodium_mg} unit="mg" />
            <NutritionRow label="Fructose" value={ingredient.fructose_g} unit="g" />
            <NutritionRow label="Lactose" value={ingredient.lactose_g} unit="g" />
          </div>

          {/* Vitamins (only vitamin_c_mg is stored by the backend) */}
          {ingredient.vitamin_c_mg != null && (
            <CollapsibleNutritionGroup title="Vitamine" icon="medication" iconColor="text-primary">
              <NutritionRow label="Vitamin C" value={ingredient.vitamin_c_mg ?? null} unit="mg" />
            </CollapsibleNutritionGroup>
          )}
        </div>

        {/* Scores & Physical */}
        <div className="space-y-6">
          {/* Scores */}
          <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
            <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">health_and_safety</span>
              Bewertungen
            </h2>
            <div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Nutri-Score</span>
                <span className="text-sm font-medium">
                  {nutriColors ? (
                    <span className={`${nutriColors.bg} ${nutriColors.text} text-xs font-bold px-2 py-0.5 rounded`}>
                      {nutriColors.label}
                    </span>
                  ) : '\u2014'}
                </span>
              </div>
              <NutritionRow label="NOVA-Score" value={ingredient.nova_score} unit="" />
              <NutritionRow label="Kinder-Score" value={ingredient.child_score} unit="" />
              <NutritionRow label="Pfadfinder-Score" value={ingredient.scout_score} unit="" />
              <NutritionRow label="Umwelt-Score" value={ingredient.environmental_score} unit="" />
              <NutritionRow label="Fruchtfaktor" value={ingredient.fruit_factor} unit="" />
            </div>
          </div>

          {/* Physical Properties */}
          <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
            <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">science</span>
              Physikalische Eigenschaften
            </h2>
            <div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Dichte</span>
                <span className="text-sm font-medium">{ingredient.physical_density} g/ml</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Viskosität</span>
                <span className="text-sm font-medium">{ingredient.physical_viscosity ? ({ solid: 'Fest', beverage: 'Flüssig', powder: 'Pulver' }[ingredient.physical_viscosity] ?? ingredient.physical_viscosity) : '\u2014'}</span>
              </div>
              <NutritionRow label="Haltbarkeit" value={ingredient.durability_in_days} unit="Tage" />
              <NutritionRow label="Max. Lagertemperatur" value={ingredient.max_storage_temperature} unit="°C" />
            </div>
          </div>

          {/* Scout / Camp Fields */}
          {(ingredient.storage_type != null || ingredient.cooking_factor != null || ingredient.preparation_time_min != null || ingredient.season_start != null) && (
            <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
              <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">backpack</span>
                Lager & Pfadfinder
              </h2>
              <div>
                {ingredient.storage_type != null && (
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">Lagerungsart</span>
                    <span className="text-sm font-medium">
                      {{ dry: 'Trocken', refrigerated: 'Kühlschrank', frozen: 'Gefroren', ambient: 'Raumtemperatur' }[ingredient.storage_type] ?? ingredient.storage_type}
                    </span>
                  </div>
                )}
                {ingredient.cooking_factor != null && (
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">Kochfaktor</span>
                    <span className="text-sm font-medium">
                      aus 100g roh &rarr; {Math.round(ingredient.cooking_factor * 100)}g gekocht
                    </span>
                  </div>
                )}
                {ingredient.preparation_time_min != null && (
                  <NutritionRow label="Zubereitungsdauer" value={ingredient.preparation_time_min} unit="Min." />
                )}
                {ingredient.season_start != null && ingredient.season_end != null ? (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Saison</span>
                    <span className="text-sm font-medium">
                      {MONTH_NAMES[ingredient.season_start - 1]}–{MONTH_NAMES[ingredient.season_end - 1]}
                    </span>
                  </div>
                ) : ingredient.season_start != null ? (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Saison ab</span>
                    <span className="text-sm font-medium">{MONTH_NAMES[ingredient.season_start - 1]}</span>
                  </div>
                ) : ingredient.season_end != null ? (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Saison bis</span>
                    <span className="text-sm font-medium">{MONTH_NAMES[ingredient.season_end - 1]}</span>
                  </div>
                ) : null}
                {ingredient.season_start == null && ingredient.season_end == null && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Saison</span>
                    <span className="text-sm font-medium">ganzjährig</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* References */}
          {(ingredient.fdc_id || ingredient.nan_art_id_rewe || ingredient.ean) && (
            <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
              <h2 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">link</span>
                Referenzen
              </h2>
              <div>
                {ingredient.fdc_id && (
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">FDC ID</span>
                    <span className="text-sm font-medium">{ingredient.fdc_id}</span>
                  </div>
                )}
                {ingredient.nan_art_id_rewe && (
                  <div className="flex justify-between py-1.5 border-b border-border/30">
                    <span className="text-sm text-muted-foreground">REWE Artikelnr.</span>
                    <span className="text-sm font-medium">{ingredient.nan_art_id_rewe}</span>
                  </div>
                )}
                {ingredient.ean && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">EAN</span>
                    <span className="text-sm font-medium">{ingredient.ean}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portions Section */}
      <PortionsSection
        ingredient={ingredient}
        canEdit={canEdit}
        showAddPortion={showAddPortion}
        setShowAddPortion={setShowAddPortion}
        newPortionName={newPortionName}
        setNewPortionName={setNewPortionName}
        newPortionQuantity={newPortionQuantity}
        setNewPortionQuantity={setNewPortionQuantity}
        newPortionUnitId={newPortionUnitId}
        setNewPortionUnitId={setNewPortionUnitId}
        measuringUnits={measuringUnits || []}
        onAddPortion={handleAddPortion}
        isAddingPortion={createPortion.isPending}
      />

      {/* Packages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Packungen
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowAddPackage(!showAddPackage)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Packung hinzufügen
            </button>
          )}
        </div>

        {showAddPackage && canEdit && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <input
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
                placeholder="Name (z.B. 500g Packung)"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <input
                value={newPackageWeight}
                onChange={(e) => setNewPackageWeight(e.target.value)}
                placeholder="Gewicht (g)"
                type="number"
                className="w-32 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <button
                onClick={() => {
                  if (!newPackageName.trim()) return;
                  const weight = newPackageWeight ? parseFloat(newPackageWeight) : undefined;
                  createPackage.mutate(
                    { name: newPackageName.trim(), weight_g: weight || null },
                    {
                      onSuccess: () => {
                        setNewPackageName('');
                        setNewPackageWeight('');
                        setShowAddPackage(false);
                      },
                    }
                  );
                }}
                disabled={createPackage.isPending || !newPackageName.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {createPackage.isPending ? '...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        )}

        {(ingredient.packages || []).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Keine Packungen definiert</p>
        ) : (
          <div className="space-y-2">
            {(ingredient.packages || []).map((pkg) => (
              <PackageRow
                key={pkg.id}
                pkg={pkg}
                canEdit={canEdit}
                updatePackage={updatePackage}
                deletePackage={deletePackage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Aliases Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">label</span>
            Aliase
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowAddAlias(!showAddAlias)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Alias hinzufügen
            </button>
          )}
        </div>

        {showAddAlias && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              <input
                value={newAliasName}
                onChange={(e) => setNewAliasName(e.target.value)}
                placeholder="Alternativer Name..."
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddAlias(); }}
                autoFocus
              />
              <button
                onClick={handleAddAlias}
                disabled={!newAliasName.trim() || createAlias.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
              >
                Hinzufügen
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={newAliasIsGeneric}
                onChange={(e) => setNewAliasIsGeneric(e.target.checked)}
              />
              Generischer Begriff (darf an mehreren Zutaten hängen, z.B. „Salz", „Pfeffer")
            </label>
          </div>
        )}

        {ingredient.aliases.length === 0 && !showAddAlias && (
          <p className="text-sm text-muted-foreground italic">Keine Aliase definiert.</p>
        )}

        {ingredient.aliases.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ingredient.aliases.map((alias) => (
              <span
                key={alias.id}
                className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm group"
              >
                {alias.name}
                {alias.is_generic && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">generisch</span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setDeleteAliasId(alias.id)}
                    className="text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recipes with this ingredient */}
      <RecipesSection slug={ingredient.slug} ingredientName={ingredient.name} />

      {/* Statistischer Vergleich */}
      <IngredientBenchmarkSection
        values={{
          price_per_kg: ingredient.price_per_kg,
          energy_kcal: ingredient.energy_kcal,
          protein_g: ingredient.protein_g,
          carbohydrate_g: ingredient.carbohydrate_g,
          sugar_g: ingredient.sugar_g,
          fat_g: ingredient.fat_g,
          retail_section_id: ingredient.retail_section_id,
          retail_section_name: ingredient.retail_section_name,
        }}
      />

      {/* Meta */}
      <div className="border-t pt-4 text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>Erstellt: {new Date(ingredient.created_at).toLocaleDateString('de-DE')}</span>
        <span>Aktualisiert: {new Date(ingredient.updated_at).toLocaleDateString('de-DE')}</span>
        <span>Slug: {ingredient.slug}</span>
      </div>

      {/* Delete ingredient confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Zutat löschen?"
        description="Die Zutat und alle zugehörigen Portionen und Aliase werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteIngredient.isPending}
      />

      {/* Delete alias confirm */}
      <ConfirmDialog
        open={deleteAliasId !== null}
        onConfirm={() => {
          if (deleteAliasId === null) return;
          deleteAlias.mutate(deleteAliasId, {
            onSuccess: () => {
              toast.success('Alias gelöscht');
              setDeleteAliasId(null);
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setDeleteAliasId(null);
            },
          });
        }}
        onCancel={() => setDeleteAliasId(null)}
        title="Alias löschen?"
        description="Der alternative Name wird entfernt."
        confirmLabel="Löschen"
        loading={deleteAlias.isPending}
      />

      {/* AI Suggest Dialog */}
      <AiSuggestDialog
        open={showAiSuggest}
        onOpenChange={(open) => {
          setShowAiSuggest(open);
          if (open && !aiSuggest.data && !aiSuggest.isPending) {
            aiSuggest.mutate();
          }
        }}
        title="KI-Vorschläge für Zutat"
        isLoading={aiSuggest.isPending}
        error={aiSuggest.error?.message ?? null}
        fields={buildIngredientSuggestionFields(ingredient, aiSuggest.data)}
        onApply={(selectedKeys) => {
          handleApplyAiSuggestions(selectedKeys);
        }}
        isApplying={updateIngredient.isPending || createPortion.isPending || createAlias.isPending || applyAiSuggestions.isPending}
        perGroupSelectAll
        extraCheckbox={{
          label: 'Alte Portionen ersetzen',
          checked: replacePortions,
          onChange: setReplacePortions,
          warning: `${ingredient.portions.length} bestehende Portion${ingredient.portions.length === 1 ? '' : 'en'} werden ersetzt (inkl. System- und Belag-Portionen).`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Build suggestion fields for the AI dialog
// ---------------------------------------------------------------------------

function buildIngredientSuggestionFields(
  ingredient: {
    [key: string]: unknown;
    name: string;
    portions: Array<{ name: string }>;
    packages?: Array<{ name: string }>;
    aliases: Array<{ name: string }>;
    nutritional_tags?: Array<{ id: number; name: string }>;
  },
  suggestions: Record<string, unknown> | undefined | null,
): SuggestionField[] {
  if (!suggestions) return [];

  const fields: SuggestionField[] = [];

  // Name suggestion (full-width in dialog)
  const nameSuggestion = suggestions.name_suggestion as string | undefined;
  if (nameSuggestion && nameSuggestion !== ingredient.name) {
    fields.push({
      key: 'name_suggestion',
      label: 'Name',
      group: 'Name',
      currentValue: ingredient.name,
      suggestedValue: nameSuggestion,
      type: 'scalar',
    });
  }

  // Description suggestion
  const descriptionSuggestion = suggestions.description as string | undefined;
  if (descriptionSuggestion && descriptionSuggestion !== (ingredient.description as string)) {
    fields.push({
      key: 'description',
      label: 'Beschreibung',
      group: 'Name',
      currentValue: ingredient.description as unknown,
      suggestedValue: descriptionSuggestion,
      type: 'scalar',
    });
  }

  const scoutFieldKeys = ['storage_type', 'cooking_factor', 'camp_suitable', 'preparation_time_min', 'season_start', 'season_end'] as const;

  const scoutFieldLabels: Record<string, string> = {
    storage_type: 'Lagerungsart',
    cooking_factor: 'Kochfaktor',
    camp_suitable: 'Camp-geeignet',
    preparation_time_min: 'Zubereitungsdauer (Min.)',
    season_start: 'Saison von',
    season_end: 'Saison bis',
  };

  const nutritionFields = [
    { key: 'energy_kcal', label: 'Energie (kcal)' },
    { key: 'protein_g', label: 'Protein (g)' },
    { key: 'fat_g', label: 'Fett (g)' },
    { key: 'fat_sat_g', label: 'davon gesättigte Fettsäuren (g)' },
    { key: 'carbohydrate_g', label: 'Kohlenhydrate (g)' },
    { key: 'sugar_g', label: 'davon Zucker (g)' },
    { key: 'fibre_g', label: 'Ballaststoffe (g)' },
    { key: 'salt_g', label: 'Salz (g)' },
    { key: 'sodium_mg', label: 'Natrium (mg)' },
    { key: 'fructose_g', label: 'Fructose (g)' },
    { key: 'lactose_g', label: 'Lactose (g)' },
  ];

  const ratingFields = [
    { key: 'nutri_score', label: 'Nutri-Score' },
    { key: 'nova_score', label: 'NOVA-Score' },
    { key: 'child_score', label: 'Kinder-Score' },
    { key: 'scout_score', label: 'Pfadfinder-Score' },
    { key: 'environmental_score', label: 'Umwelt-Score' },
    { key: 'fruit_factor', label: 'Fruchtfaktor' },
  ];

  const physicalFields = [
    { key: 'physical_density', label: 'Dichte (g/ml)' },
    { key: 'physical_viscosity', label: 'Viskosität' },
    { key: 'durability_in_days', label: 'Haltbarkeit (Tage)' },
    { key: 'max_storage_temperature', label: 'Max. Lagertemperatur (°C)' },
  ];

  const priceFields = [
    { key: 'price_per_kg', label: 'Preis pro kg (€)' },
  ];

  for (const { key, label } of nutritionFields) {
    fields.push({
      key,
      label,
      group: 'Nährwerte pro 100g',
      currentValue: ingredient[key] as unknown,
      suggestedValue: suggestions[key] as unknown,
      type: 'scalar',
    });
  }

  for (const { key, label } of ratingFields) {
    fields.push({
      key,
      label,
      group: 'Bewertungen',
      currentValue: ingredient[key] as unknown,
      suggestedValue: suggestions[key] as unknown,
      type: 'scalar',
    });
  }

  for (const { key, label } of physicalFields) {
    fields.push({
      key,
      label,
      group: 'Physikalische Eigenschaften',
      currentValue: ingredient[key] as unknown,
      suggestedValue: suggestions[key] as unknown,
      type: 'scalar',
    });
  }

  // Scout fields
  for (const key of scoutFieldKeys) {
    const suggested = suggestions[key] as unknown;
    if (suggested !== null && suggested !== undefined) {
      fields.push({
        key,
        label: scoutFieldLabels[key],
        group: 'Physikalische Eigenschaften',
        currentValue: ingredient[key] as unknown,
        suggestedValue: suggested,
        type: 'scalar',
      });
    }
  }

  for (const { key, label } of priceFields) {
    fields.push({
      key,
      label,
      group: 'Preis',
      currentValue: ingredient[key] as unknown,
      suggestedValue: suggestions[key] as unknown,
      type: 'scalar',
    });
  }

  // Portions and Packages — from ai_suggest
  const aiSuggest = suggestions.ai_suggest as
    | {
        portions: PortionSuggestionShape[];
        packages: PackageSuggestionShape[];
      }
    | undefined;
  const existingPortionNames = new Set(ingredient.portions.map((p) => p.name.toLowerCase()));
  const existingPackageNames = new Set((ingredient.packages ?? []).map((p) => p.name.toLowerCase()));

  // Portion suggestions
  (aiSuggest?.portions ?? []).forEach((p, i) => {
    if (existingPortionNames.has(p.name.toLowerCase())) return;
    fields.push({
      key: `portion_${i}`,
      label: p.name,
      group: 'Portionen',
      currentValue: null,
      suggestedValue: p,
      type: 'list',
      priority: p.rank === 1 ? 100 : 10,
    });
  });

  // Package suggestions
  (aiSuggest?.packages ?? []).forEach((p, i) => {
    if (existingPackageNames.has(p.name.toLowerCase())) return;
    fields.push({
      key: `package_${i}`,
      label: p.name,
      group: 'Packungen',
      currentValue: null,
      suggestedValue: p,
      type: 'list',
      priority: p.rank === 1 ? 100 : 10,
    });
  });

  // Aliases
  const suggestedAliases = (suggestions.aliases as string[]) || [];
  const existingAliases = new Set(ingredient.aliases.map((a) => a.name.toLowerCase()));
  suggestedAliases.forEach((alias, i) => {
    if (!existingAliases.has(alias.toLowerCase())) {
      fields.push({
        key: `alias_${i}`,
        label: alias,
        group: 'Aliase',
        currentValue: null,
        suggestedValue: alias,
        type: 'list',
      });
    }
  });

  // Ernährungstags
  const suggestedTags = (suggestions.nutritional_tags as Array<{ id: number; name: string }>) || [];
  const existingTagIds = new Set((ingredient.nutritional_tags || []).map((t) => t.id));
  suggestedTags.forEach((tag) => {
    if (!existingTagIds.has(tag.id)) {
      fields.push({
        key: `tag_${tag.id}`,
        label: tag.name,
        group: 'Ernährungstags',
        currentValue: null,
        suggestedValue: tag,
        type: 'list',
      });
    }
  });

  return fields;
}
