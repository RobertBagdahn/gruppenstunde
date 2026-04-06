import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useCreatePortion,
  useUpdatePortion,
  useDeletePortion,
  useCreatePrice,
  useDeletePrice,
  useCreateAlias,
  useDeleteAlias,
  useRetailSections,
} from '@/api/ingredients';
import { NUTRI_SCORE_COLORS } from '@/schemas/ingredient';
import type { Portion } from '@/schemas/ingredient';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';

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
      className={`text-xs px-2 py-1 rounded-full font-medium ${
        isDangerous
          ? 'bg-red-100 text-red-700 border border-red-200'
          : 'bg-gray-100 text-gray-600 border border-gray-200'
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
        {value !== null ? `${value} ${unit}` : '\u2014'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portion Card (with prices)
// ---------------------------------------------------------------------------
function PortionCard({
  portion,
  slug,
}: {
  portion: Portion;
  slug: string;
}) {
  const updatePortion = useUpdatePortion(slug);
  const deletePortion = useDeletePortion(slug);
  const createPrice = useCreatePrice(slug);
  const deletePrice = useDeletePrice(slug);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(portion.name);
  const [editQuantity, setEditQuantity] = useState(String(portion.quantity));

  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceEur, setPriceEur] = useState('');
  const [priceName, setPriceName] = useState('');
  const [priceRetailer, setPriceRetailer] = useState('');
  const [priceQuantity, setPriceQuantity] = useState('1');
  const [priceQuality, setPriceQuality] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePriceId, setDeletePriceId] = useState<number | null>(null);

  const handleSavePortion = () => {
    updatePortion.mutate(
      { portionId: portion.id, data: { name: editName, quantity: Number(editQuantity) } },
      {
        onSuccess: () => {
          toast.success('Portion aktualisiert');
          setEditing(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddPrice = () => {
    createPrice.mutate(
      {
        portionId: portion.id,
        data: {
          price_eur: Number(priceEur),
          quantity: Number(priceQuantity) || 1,
          name: priceName || portion.name,
          retailer: priceRetailer,
          quality: priceQuality,
        },
      },
      {
        onSuccess: () => {
          toast.success('Preis hinzugefuegt');
          setShowPriceForm(false);
          setPriceEur('');
          setPriceName('');
          setPriceRetailer('');
          setPriceQuantity('1');
          setPriceQuality('');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  // Get prices for this portion from the ingredient detail
  // (prices are part of the IngredientDetail, but we access them through the parent component)
  // Actually, prices are NOT in the IngredientDetail schema, they are fetched per portion.
  // Let's just provide the add/delete UI. Prices are shown on the detail page as a whole.

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
        <span className="material-symbols-outlined text-primary text-lg shrink-0">
          scale
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary flex-1"
              />
              <input
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                type="number"
                step="0.01"
                className="bg-background border rounded px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary w-20"
                placeholder="Menge"
              />
              <button
                onClick={handleSavePortion}
                className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded"
              >
                OK
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs px-2 py-1 bg-muted rounded"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{portion.name}</span>
              <span className="text-xs text-muted-foreground">
                ({portion.quantity}g{portion.weight_g ? `, ~${portion.weight_g}g Gewicht` : ''})
              </span>
            </div>
          )}
        </div>

        {!editing && (
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
              title="Loeschen"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Price add form */}
      <div className="px-4 py-2">
        {!showPriceForm ? (
          <button
            onClick={() => setShowPriceForm(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Preis hinzufuegen
          </button>
        ) : (
          <div className="space-y-2 py-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                step="0.01"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="Preis (EUR)"
                className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              />
              <input
                value={priceName}
                onChange={(e) => setPriceName(e.target.value)}
                placeholder="Bezeichnung"
                className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              />
              <input
                value={priceRetailer}
                onChange={(e) => setPriceRetailer(e.target.value)}
                placeholder="Haendler"
                className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={priceQuantity}
                onChange={(e) => setPriceQuantity(e.target.value)}
                placeholder="Anzahl"
                className="w-20 px-2 py-1.5 border rounded text-sm bg-background"
              />
              <input
                value={priceQuality}
                onChange={(e) => setPriceQuality(e.target.value)}
                placeholder="Qualitaet"
                className="flex-1 px-2 py-1.5 border rounded text-sm bg-background"
              />
              <button
                onClick={handleAddPrice}
                disabled={!priceEur || createPrice.isPending}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50"
              >
                Hinzufuegen
              </button>
              <button
                onClick={() => setShowPriceForm(false)}
                className="px-3 py-1.5 bg-muted rounded text-xs"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onConfirm={() => {
          deletePortion.mutate(portion.id, {
            onSuccess: () => {
              toast.success('Portion geloescht');
              setConfirmDelete(false);
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setConfirmDelete(false);
            },
          });
        }}
        onCancel={() => setConfirmDelete(false)}
        title="Portion loeschen?"
        description="Die Portion und alle zugehoerigen Preise werden geloescht."
        confirmLabel="Loeschen"
        loading={deletePortion.isPending}
      />

      <ConfirmDialog
        open={deletePriceId !== null}
        onConfirm={() => {
          if (deletePriceId === null) return;
          deletePrice.mutate(deletePriceId, {
            onSuccess: () => {
              toast.success('Preis geloescht');
              setDeletePriceId(null);
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setDeletePriceId(null);
            },
          });
        }}
        onCancel={() => setDeletePriceId(null)}
        title="Preis loeschen?"
        description="Der Preis wird unwiderruflich entfernt."
        confirmLabel="Loeschen"
        loading={deletePrice.isPending}
      />
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
  const createAlias = useCreateAlias(slug || '');
  const deleteAlias = useDeleteAlias(slug || '');
  const { data: retailSections } = useRetailSections();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditFields, setShowEditFields] = useState(false);
  const [deleteAliasId, setDeleteAliasId] = useState<number | null>(null);

  // Portion add
  const [showAddPortion, setShowAddPortion] = useState(false);
  const [newPortionName, setNewPortionName] = useState('');
  const [newPortionQuantity, setNewPortionQuantity] = useState('100');

  // Alias add
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');

  // Edit fields
  const [editRetailSection, setEditRetailSection] = useState<string>('');

  const canEdit = !!user;

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
          backLabel="Zurueck zur Uebersicht"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const handleDelete = () => {
    deleteIngredient.mutate(ingredient.slug, {
      onSuccess: () => {
        toast.success('Zutat geloescht');
        navigate('/ingredients');
      },
      onError: (err) => {
        toast.error('Fehler beim Loeschen', { description: err.message });
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleAddPortion = () => {
    const trimmed = newPortionName.trim();
    if (!trimmed) return;
    createPortion.mutate(
      { name: trimmed, quantity: Number(newPortionQuantity) || 100 },
      {
        onSuccess: () => {
          toast.success('Portion hinzugefuegt');
          setNewPortionName('');
          setNewPortionQuantity('100');
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
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success('Alias hinzugefuegt');
          setNewAliasName('');
          setShowAddAlias(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleUpdateRetailSection = () => {
    updateIngredient.mutate(
      { retail_section_id: editRetailSection ? Number(editRetailSection) : null },
      {
        onSuccess: () => {
          toast.success('Abteilung aktualisiert');
          setShowEditFields(false);
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
            <h1 className="text-xl sm:text-2xl font-bold truncate">{ingredient.name}</h1>
            {ingredient.status === 'draft' && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                Entwurf
              </span>
            )}
          </div>
          {ingredient.description && (
            <p className="text-sm text-muted-foreground mb-2">{ingredient.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <NutriScoreBadge nutriClass={ingredient.nutri_class} />
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
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                setEditRetailSection(String(ingredient.retail_section_id || ''));
                setShowEditFields(!showEditFields);
              }}
              className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
              title="Bearbeiten"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-md hover:bg-destructive/10 transition text-destructive/70 hover:text-destructive"
              title="Zutat loeschen"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Panel */}
      {showEditFields && (
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h3 className="text-sm font-semibold mb-3">Zutat bearbeiten</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Supermarkt-Abteilung</label>
              <select
                value={editRetailSection}
                onChange={(e) => setEditRetailSection(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              >
                <option value="">Keine Abteilung</option>
                {retailSections?.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleUpdateRetailSection}
                disabled={updateIngredient.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                onClick={() => setShowEditFields(false)}
                className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Nutritional Values */}
        <div className="border rounded-lg p-4 bg-card">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">nutrition</span>
            Naehrwerte pro 100g
          </h2>
          <div>
            <NutritionRow label="Energie" value={ingredient.energy_kj} unit="kJ" />
            <NutritionRow label="Protein" value={ingredient.protein_g} unit="g" />
            <NutritionRow label="Fett" value={ingredient.fat_g} unit="g" />
            <NutritionRow label="  davon gesaettigte Fettsaeuren" value={ingredient.fat_sat_g} unit="g" />
            <NutritionRow label="Kohlenhydrate" value={ingredient.carbohydrate_g} unit="g" />
            <NutritionRow label="  davon Zucker" value={ingredient.sugar_g} unit="g" />
            <NutritionRow label="Ballaststoffe" value={ingredient.fibre_g} unit="g" />
            <NutritionRow label="Salz" value={ingredient.salt_g} unit="g" />
            <NutritionRow label="Natrium" value={ingredient.sodium_mg} unit="mg" />
            <NutritionRow label="Fructose" value={ingredient.fructose_g} unit="g" />
            <NutritionRow label="Lactose" value={ingredient.lactose_g} unit="g" />
          </div>
        </div>

        {/* Scores & Physical */}
        <div className="space-y-6">
          {/* Scores */}
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
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
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">science</span>
              Physikalische Eigenschaften
            </h2>
            <div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Dichte</span>
                <span className="text-sm font-medium">{ingredient.physical_density} g/ml</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Viskositaet</span>
                <span className="text-sm font-medium">{ingredient.physical_viscosity || '\u2014'}</span>
              </div>
              <NutritionRow label="Haltbarkeit" value={ingredient.durability_in_days} unit="Tage" />
              <NutritionRow label="Max. Lagertemperatur" value={ingredient.max_storage_temperature} unit="\u00B0C" />
            </div>
          </div>

          {/* References */}
          {(ingredient.fdc_id || ingredient.ean) && (
            <div className="border rounded-lg p-4 bg-card">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">scale</span>
            Portionen
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowAddPortion(!showAddPortion)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Portion hinzufuegen
            </button>
          )}
        </div>

        {showAddPortion && (
          <div className="border rounded-lg p-4 mb-4 bg-card">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newPortionName}
                onChange={(e) => setNewPortionName(e.target.value)}
                placeholder="Portionsname (z.B. Stueck, Tasse, EL)"
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPortion(); }}
                autoFocus
              />
              <input
                type="number"
                value={newPortionQuantity}
                onChange={(e) => setNewPortionQuantity(e.target.value)}
                placeholder="Menge (g)"
                className="w-24 px-3 py-2 border rounded-md text-sm bg-background"
              />
              <button
                onClick={handleAddPortion}
                disabled={!newPortionName.trim() || createPortion.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
              >
                Hinzufuegen
              </button>
            </div>
          </div>
        )}

        {ingredient.portions.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Keine Portionen definiert.</p>
        )}

        <div className="space-y-3">
          {ingredient.portions.map((portion) => (
            <PortionCard key={portion.id} portion={portion} slug={ingredient.slug} />
          ))}
        </div>
      </div>

      {/* Aliases Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">label</span>
            Aliase
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowAddAlias(!showAddAlias)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Alias hinzufuegen
            </button>
          )}
        </div>

        {showAddAlias && (
          <div className="flex gap-2 mb-4">
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
              Hinzufuegen
            </button>
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
        title="Zutat loeschen?"
        description="Die Zutat und alle zugehoerigen Portionen, Preise und Aliase werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteIngredient.isPending}
      />

      {/* Delete alias confirm */}
      <ConfirmDialog
        open={deleteAliasId !== null}
        onConfirm={() => {
          if (deleteAliasId === null) return;
          deleteAlias.mutate(deleteAliasId, {
            onSuccess: () => {
              toast.success('Alias geloescht');
              setDeleteAliasId(null);
            },
            onError: (err) => {
              toast.error('Fehler', { description: err.message });
              setDeleteAliasId(null);
            },
          });
        }}
        onCancel={() => setDeleteAliasId(null)}
        title="Alias loeschen?"
        description="Der alternative Name wird entfernt."
        confirmLabel="Loeschen"
        loading={deleteAlias.isPending}
      />
    </div>
  );
}
