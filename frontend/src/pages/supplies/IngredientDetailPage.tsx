import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { AiSuggestDialog, type SuggestionField } from '@/components/shared/AiSuggestDialog';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  useCreatePortion,
  useUpdatePortion,
  useDeletePortion,
  useCreateAlias,
  useDeleteAlias,
  useRetailSections,
  useAiSuggestIngredientAll,
} from '@/api/supplies';
import { NUTRI_SCORE_COLORS } from '@/schemas/supply';
import type { Portion } from '@/schemas/supply';
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
// Portion Card
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

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(portion.name);
  const [editQuantity, setEditQuantity] = useState(String(portion.quantity));

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSavePortion = () => {
    updatePortion.mutate(
      { portionId: portion.id, data: { name: editName, quantity: Number(editQuantity) } },
      {
        onSuccess: () => {
          toast.success('Portion aktualisiert');
          setEditing(false);
        },
        onError: (err: Error) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

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
// AI Suggest field builder
// ---------------------------------------------------------------------------

function buildIngredientSuggestionFields(
  ingredient: { [key: string]: unknown; portions: Array<{ name: string }>; aliases: Array<{ name: string }> },
  suggestions: Record<string, unknown> | undefined | null,
): SuggestionField[] {
  if (!suggestions) return [];

  const fields: SuggestionField[] = [];

  const nutritionFields = [
    { key: 'energy_kj', label: 'Energie (kJ)' },
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

  // Portions
  const suggestedPortions = (suggestions.portions as Array<{ name: string; weight_g: number }>) || [];
  const existingNames = new Set(ingredient.portions.map((p) => p.name.toLowerCase()));
  suggestedPortions.forEach((p, i) => {
    if (!existingNames.has(p.name.toLowerCase())) {
      fields.push({
        key: `portion_${i}`,
        label: `${p.name} (${p.weight_g}g)`,
        group: 'Portionen',
        currentValue: null,
        suggestedValue: p,
        type: 'list',
      });
    }
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

  return fields;
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

  // AI Suggest
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const aiSuggest = useAiSuggestIngredientAll(slug || '');

  const canEdit = !!user && (user.is_staff || user.id === ingredient?.created_by_id);

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

  const handleDelete = () => {
    deleteIngredient.mutate(ingredient.slug, {
      onSuccess: () => {
        toast.success('Zutat gelöscht');
        navigate('/ingredients');
      },
      onError: (err) => {
        toast.error('Fehler beim Löschen', { description: err.message });
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
          toast.success('Portion hinzugefügt');
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
          toast.success('Alias hinzugefügt');
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

  const handleApplyAiSuggestions = (selectedKeys: string[]) => {
    if (!aiSuggest.data || !ingredient) return;

    const data = aiSuggest.data;
    const scalarUpdates: Record<string, unknown> = {};
    const portionsToCreate: Array<{ name: string; weight_g: number }> = [];
    const aliasesToCreate: string[] = [];

    for (const key of selectedKeys) {
      if (key.startsWith('portion_')) {
        const idx = parseInt(key.replace('portion_', ''), 10);
        if (data.portions?.[idx]) portionsToCreate.push(data.portions[idx]);
      } else if (key.startsWith('alias_')) {
        const idx = parseInt(key.replace('alias_', ''), 10);
        if (data.aliases?.[idx]) aliasesToCreate.push(data.aliases[idx]);
      } else {
        const value = (data as Record<string, unknown>)[key];
        if (value !== null && value !== undefined) {
          scalarUpdates[key] = value;
        }
      }
    }

    // Apply scalar updates
    const promises: Promise<unknown>[] = [];
    if (Object.keys(scalarUpdates).length > 0) {
      promises.push(
        new Promise((resolve, reject) =>
          updateIngredient.mutate(scalarUpdates, { onSuccess: resolve, onError: reject })
        )
      );
    }

    // Create portions (skip duplicates)
    const existingPortionNames = new Set(
      ingredient.portions.map((p) => p.name.toLowerCase())
    );
    for (const p of portionsToCreate) {
      if (!existingPortionNames.has(p.name.toLowerCase())) {
        promises.push(
          new Promise((resolve, reject) =>
            createPortion.mutate(
              { name: p.name, quantity: p.weight_g },
              { onSuccess: resolve, onError: reject }
            )
          )
        );
      }
    }

    // Create aliases
    for (const alias of aliasesToCreate) {
      promises.push(
        new Promise((resolve, reject) =>
          createAlias.mutate({ name: alias }, { onSuccess: resolve, onError: reject })
        )
      );
    }

    Promise.all(promises)
      .then(() => {
        toast.success('Vorschläge übernommen');
        setShowAiSuggest(false);
      })
      .catch((err) => {
        toast.error('Fehler', { description: (err as Error).message });
      });
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
      {/* Header – breadcrumb-style */}
      <div className="flex items-center gap-3 mb-2">
        <BackButton to="/ingredients" />
        <h1 className="text-xl sm:text-2xl font-bold truncate">{ingredient.name}</h1>
        {ingredient.status === 'draft' && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
            Entwurf
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
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
              onClick={() => setShowAiSuggest(true)}
              className="p-2 rounded-md hover:bg-muted transition text-muted-foreground"
              title="KI-Vorschläge"
            >
              <span className="material-symbols-outlined text-lg">auto_fix_high</span>
            </button>
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
              title="Zutat löschen"
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
            Nährwerte pro 100g
          </h2>
          <div>
            <NutritionRow label="Energie" value={ingredient.energy_kj} unit="kJ" />
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

          {/* Vitamins */}
          {(ingredient.vitamin_a_mg != null || ingredient.vitamin_b1_mg != null || ingredient.vitamin_c_mg != null) && (
            <CollapsibleNutritionGroup title="Vitamine" icon="medication" iconColor="text-amber-600">
              <NutritionRow label="Vitamin A" value={ingredient.vitamin_a_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin B1" value={ingredient.vitamin_b1_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin B2" value={ingredient.vitamin_b2_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin B6" value={ingredient.vitamin_b6_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin B12" value={ingredient.vitamin_b12_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Vitamin C" value={ingredient.vitamin_c_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin D" value={ingredient.vitamin_d_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Vitamin E" value={ingredient.vitamin_e_mg ?? null} unit="mg" />
              <NutritionRow label="Vitamin K" value={ingredient.vitamin_k_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Niacin" value={ingredient.niacin_mg ?? null} unit="mg" />
              <NutritionRow label="Folat" value={ingredient.folate_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Pantothensäure" value={ingredient.pantothenic_acid_mg ?? null} unit="mg" />
              <NutritionRow label="Biotin" value={ingredient.biotin_ug ?? null} unit={'\u00B5g'} />
            </CollapsibleNutritionGroup>
          )}

          {/* Minerals */}
          {(ingredient.calcium_mg != null || ingredient.iron_mg != null || ingredient.magnesium_mg != null) && (
            <CollapsibleNutritionGroup title="Mineralstoffe" icon="diamond" iconColor="text-cyan-600">
              <NutritionRow label="Calcium" value={ingredient.calcium_mg ?? null} unit="mg" />
              <NutritionRow label="Eisen" value={ingredient.iron_mg ?? null} unit="mg" />
              <NutritionRow label="Magnesium" value={ingredient.magnesium_mg ?? null} unit="mg" />
              <NutritionRow label="Zink" value={ingredient.zinc_mg ?? null} unit="mg" />
              <NutritionRow label="Kalium" value={ingredient.potassium_mg ?? null} unit="mg" />
              <NutritionRow label="Phosphor" value={ingredient.phosphorus_mg ?? null} unit="mg" />
              <NutritionRow label="Jod" value={ingredient.iodine_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Selen" value={ingredient.selenium_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Kupfer" value={ingredient.copper_mg ?? null} unit="mg" />
              <NutritionRow label="Mangan" value={ingredient.manganese_mg ?? null} unit="mg" />
              <NutritionRow label="Chrom" value={ingredient.chromium_ug ?? null} unit={'\u00B5g'} />
              <NutritionRow label="Fluorid" value={ingredient.fluoride_mg ?? null} unit="mg" />
            </CollapsibleNutritionGroup>
          )}
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
                <span className="text-sm text-muted-foreground">Viskosität</span>
                <span className="text-sm font-medium">{ingredient.physical_viscosity || '\u2014'}</span>
              </div>
              <NutritionRow label="Haltbarkeit" value={ingredient.durability_in_days} unit="Tage" />
              <NutritionRow label="Max. Lagertemperatur" value={ingredient.max_storage_temperature} unit="\u00B0C" />
            </div>
          </div>

          {/* References */}
          {(ingredient.fdc_id || ingredient.nan_art_id_rewe || ingredient.ean) && (
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
              Portion hinzufügen
            </button>
          )}
        </div>

        {showAddPortion && (
          <div className="border rounded-lg p-4 mb-4 bg-card">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newPortionName}
                onChange={(e) => setNewPortionName(e.target.value)}
                placeholder="Portionsname (z.B. Stück, Tasse, EL)"
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
                Hinzufügen
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
              Alias hinzufügen
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
              Hinzufügen
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
        title={`KI-Vorschläge für "${ingredient.name}"`}
        isLoading={aiSuggest.isPending}
        fields={buildIngredientSuggestionFields(ingredient, aiSuggest.data)}
        onApply={(selectedKeys) => {
          handleApplyAiSuggestions(selectedKeys);
        }}
        isApplying={updateIngredient.isPending}
      />
    </div>
  );
}
