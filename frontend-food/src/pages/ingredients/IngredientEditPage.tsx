import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useIngredient,
  useUpdateIngredient,
  useRetailSections,
  useNutritionalTags,
} from '@/api/supplies';
import { useTags } from '@/api/tags';
import type { NutritionalTag } from '@/schemas/supply';
import type { Tag } from '@/schemas/content';
import ErrorDisplay from '@/components/ErrorDisplay';
import IngredientMergeDialog from '@/components/ingredients/IngredientMergeDialog';
import { GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'verified', label: 'Verifiziert' },
  { value: 'user_content', label: 'Benutzer erstellt' },
];

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-soft">
      <h2 className="text-sm font-display font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field row
// ---------------------------------------------------------------------------
function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function IngredientEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: ingredient, isLoading: ingredientLoading, error: ingredientError } = useIngredient(slug || '');
  const updateIngredient = useUpdateIngredient(slug || '');
  const { data: retailSections } = useRetailSections();
  const { data: nutritionalTags } = useNutritionalTags();
  const { data: allTags } = useTags();

  const canEdit = ingredient?.can_edit ?? false;

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) navigate('/login');
  }, [user, userLoading, navigate]);

  // Redirect to detail if can't edit
  useEffect(() => {
    if (!userLoading && !ingredientLoading && ingredient && !canEdit) {
      navigate(`/ingredients/${slug}`);
    }
  }, [userLoading, ingredientLoading, ingredient, canEdit, navigate, slug]);

  // Form state — Stammdaten
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [retailSectionId, setRetailSectionId] = useState('');

  // Nutritional values per 100g
  const [energyKcal, setEnergyKcal] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [fatG, setFatG] = useState('');
  const [fatSatG, setFatSatG] = useState('');
  const [carbohydrateG, setCarbohydrateG] = useState('');
  const [sugarG, setSugarG] = useState('');
  const [fibreG, setFibreG] = useState('');
  const [saltG, setSaltG] = useState('');
  const [sodiumMg, setSodiumMg] = useState('');
  const [fructoseG, setFructoseG] = useState('');
  const [lactoseG, setLactoseG] = useState('');

  // Physical
  const [physicalDensity, setPhysicalDensity] = useState('1.0');
  const [physicalViscosity, setPhysicalViscosity] = useState('');
  const [durabilityInDays, setDurabilityInDays] = useState('');
  const [maxStorageTemperature, setMaxStorageTemperature] = useState('');

  // Scout / Camp fields
  const [storageType, setStorageType] = useState('');
  const [cookingFactor, setCookingFactor] = useState('');
  const [campSuitable, setCampSuitable] = useState(false);
  const [preparationTimeMin, setPreparationTimeMin] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');

  // Scores
  const [childScore, setChildScore] = useState('');
  const [scoutScore, setScoutScore] = useState('');
  const [environmentalScore, setEnvironmentalScore] = useState('');
  const [novaScore, setNovaScore] = useState('');
  const [fruitFactor, setFruitFactor] = useState('');

  // Standalone food
  const [isStandaloneFood, setIsStandaloneFood] = useState(false);

  // Price
  const [pricePerKg, setPricePerKg] = useState('');

  // Vitamin C
  const [vitaminCMg, setVitaminCMg] = useState('');

  // References
  const [fdcId, setFdcId] = useState('');
  const [nanArtIdRewe, setNanArtIdRewe] = useState('');
  const [ean, setEan] = useState('');

  // Nutritional Tags
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  // Content Tags
  const [selectedContentTags, setSelectedContentTags] = useState<string[]>([]);

  // Pre-populate form when ingredient data loads
  useEffect(() => {
    if (!ingredient) return;

    setName(ingredient.name);
    setDescription(ingredient.description);
    setStatus(ingredient.status);
    setRetailSectionId(String(ingredient.retail_section_id ?? ''));

    setEnergyKcal(String(ingredient.energy_kcal ?? ''));
    setProteinG(String(ingredient.protein_g ?? ''));
    setFatG(String(ingredient.fat_g ?? ''));
    setFatSatG(String(ingredient.fat_sat_g ?? ''));
    setCarbohydrateG(String(ingredient.carbohydrate_g ?? ''));
    setSugarG(String(ingredient.sugar_g ?? ''));
    setFibreG(String(ingredient.fibre_g ?? ''));
    setSaltG(String(ingredient.salt_g ?? ''));
    setSodiumMg(String(ingredient.sodium_mg ?? ''));
    setFructoseG(String(ingredient.fructose_g ?? ''));
    setLactoseG(String(ingredient.lactose_g ?? ''));

    setPhysicalDensity(String(ingredient.physical_density ?? '1.0'));
    setPhysicalViscosity(ingredient.physical_viscosity ?? '');
    setDurabilityInDays(String(ingredient.durability_in_days ?? ''));
    setMaxStorageTemperature(String(ingredient.max_storage_temperature ?? ''));

    setStorageType(ingredient.storage_type ?? '');
    setCookingFactor(String(ingredient.cooking_factor ?? ''));
    setCampSuitable(ingredient.camp_suitable ?? false);
    setPreparationTimeMin(String(ingredient.preparation_time_min ?? ''));
    setSeasonStart(String(ingredient.season_start ?? ''));
    setSeasonEnd(String(ingredient.season_end ?? ''));

    setChildScore(String(ingredient.child_score ?? ''));
    setScoutScore(String(ingredient.scout_score ?? ''));
    setEnvironmentalScore(String(ingredient.environmental_score ?? ''));
    setNovaScore(String(ingredient.nova_score ?? ''));
    setFruitFactor(String(ingredient.fruit_factor ?? ''));

    setIsStandaloneFood(ingredient.is_standalone_food ?? false);
    setPricePerKg(String(ingredient.price_per_kg ?? ''));
    setVitaminCMg(String(ingredient.vitamin_c_mg ?? ''));

    setFdcId(String(ingredient.fdc_id ?? ''));
    setNanArtIdRewe(String(ingredient.nan_art_id_rewe ?? ''));
    setEan(ingredient.ean ?? '');

    setSelectedTags((ingredient.nutritional_tags ?? []).map((t) => t.id));
    setSelectedContentTags((ingredient.tags ?? []).map((t) => t.id));
  }, [ingredient]);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const toggleContentTag = (tagId: string) => {
    setSelectedContentTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const toNum = (v: string): number | null => {
    const n = Number(v);
    return v.trim() === '' || isNaN(n) ? null : n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      retail_section_id: retailSectionId ? Number(retailSectionId) : null,

      energy_kcal: toNum(energyKcal),
      protein_g: toNum(proteinG),
      fat_g: toNum(fatG),
      fat_sat_g: toNum(fatSatG),
      carbohydrate_g: toNum(carbohydrateG),
      sugar_g: toNum(sugarG),
      fibre_g: toNum(fibreG),
      salt_g: toNum(saltG),
      sodium_mg: toNum(sodiumMg),
      fructose_g: toNum(fructoseG),
      lactose_g: toNum(lactoseG),

      physical_density: toNum(physicalDensity) ?? 1.0,
      physical_viscosity: physicalViscosity.trim() || 'solid',
      durability_in_days: toNum(durabilityInDays),
      max_storage_temperature: toNum(maxStorageTemperature),

      storage_type: storageType || null,
      cooking_factor: toNum(cookingFactor),
      camp_suitable: campSuitable,
      preparation_time_min: toNum(preparationTimeMin),
      season_start: toNum(seasonStart),
      season_end: toNum(seasonEnd),

      child_score: toNum(childScore),
      scout_score: toNum(scoutScore),
      environmental_score: toNum(environmentalScore),
      nova_score: toNum(novaScore),
      fruit_factor: toNum(fruitFactor),

      is_standalone_food: isStandaloneFood,
      price_per_kg: toNum(pricePerKg),
      vitamin_c_mg: toNum(vitaminCMg),

      fdc_id: toNum(fdcId),
      nan_art_id_rewe: toNum(nanArtIdRewe),
      ean: ean.trim(),

      nutritional_tag_ids: selectedTags,
      tag_ids: selectedContentTags,
    };

    // Only include status field for staff users
    if (user?.is_staff) {
      payload.status = status;
    }

    updateIngredient.mutate(payload, {
      onSuccess: () => {
        toast.success('Zutat gespeichert');
        navigate(`/ingredients/${slug}`);
      },
      onError: (err) => {
        toast.error('Fehler beim Speichern', { description: err.message });
      },
    });
  };

  const isLoading = userLoading || ingredientLoading;

  if (ingredientError || (!isLoading && !ingredient && slug)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorDisplay
          error={ingredientError}
          title="Zutat nicht gefunden"
          description="Die Zutat existiert nicht oder wurde entfernt."
          onBack={() => navigate('/ingredients')}
          backLabel="Zurück zur Übersicht"
        />
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg max-w-3xl mx-auto mt-6" />;
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm bg-background';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate(`/ingredients/${slug}`)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Zurück zur Zutat
      </button>

      <h1 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl">egg_alt</span>
        Zutat bearbeiten
        {user?.is_staff && ingredient && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMergeDialogOpen(true)}
            className="ml-auto"
          >
            <GitMerge className="h-4 w-4 mr-1" />
            Zutat zusammenführen
          </Button>
        )}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stammdaten */}
        <FormSection title="Stammdaten" icon="description">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name *" className="sm:col-span-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Mehl, Butter, Kartoffeln"
                className={inputClass}
                required
                autoFocus
              />
            </Field>
            <Field label="Beschreibung" className="sm:col-span-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung..."
                rows={2}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              {user?.is_staff ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-muted/30 border border-border rounded text-sm text-muted-foreground">
                  {STATUS_OPTIONS.find((opt) => opt.value === status)?.label || status}
                </div>
              )}
            </Field>
            <Field label="Supermarkt-Abteilung">
              <select
                value={retailSectionId}
                onChange={(e) => setRetailSectionId(e.target.value)}
                className={inputClass}
              >
                <option value="">Keine Abteilung</option>
                {retailSections?.map((rs) => (
                  <option key={rs.id} value={rs.id}>
                    {rs.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Preis pro kg (EUR)">
              <input type="number" step="0.01" min="0" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Roh verzehrbar">
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={isStandaloneFood} onChange={(e) => setIsStandaloneFood(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Kann roh/direkt gegessen werden</span>
              </label>
            </Field>
          </div>
        </FormSection>

        {/* Nährwerte */}
        <FormSection title="Nährwerte pro 100g" icon="nutrition">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Energie (kcal)">
              <input type="number" step="0.1" value={energyKcal} onChange={(e) => setEnergyKcal(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Protein (g)">
              <input type="number" step="0.01" value={proteinG} onChange={(e) => setProteinG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Fett (g)">
              <input type="number" step="0.01" value={fatG} onChange={(e) => setFatG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="ges. Fettsäuren (g)">
              <input type="number" step="0.01" value={fatSatG} onChange={(e) => setFatSatG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Kohlenhydrate (g)">
              <input type="number" step="0.01" value={carbohydrateG} onChange={(e) => setCarbohydrateG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Zucker (g)">
              <input type="number" step="0.01" value={sugarG} onChange={(e) => setSugarG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Ballaststoffe (g)">
              <input type="number" step="0.01" value={fibreG} onChange={(e) => setFibreG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Salz (g)">
              <input type="number" step="0.01" value={saltG} onChange={(e) => setSaltG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Natrium (mg)">
              <input type="number" step="0.01" value={sodiumMg} onChange={(e) => setSodiumMg(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Fructose (g)">
              <input type="number" step="0.01" value={fructoseG} onChange={(e) => setFructoseG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Lactose (g)">
              <input type="number" step="0.01" value={lactoseG} onChange={(e) => setLactoseG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Vitamin C (mg)">
              <input type="number" step="0.1" value={vitaminCMg} onChange={(e) => setVitaminCMg(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </FormSection>

        {/* Physikalisch */}
        <FormSection title="Physikalische Eigenschaften" icon="science">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Dichte (g/ml)">
              <input type="number" step="0.01" value={physicalDensity} onChange={(e) => setPhysicalDensity(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Viskosität">
              <select
                value={physicalViscosity}
                onChange={(e) => setPhysicalViscosity(e.target.value)}
                className={inputClass}
              >
                <option value="solid">Fest</option>
                <option value="beverage">Flüssig</option>
                <option value="powder">Pulver/Schüttgut</option>
              </select>
            </Field>
            <Field label="Haltbarkeit (Tage)">
              <input type="number" value={durabilityInDays} onChange={(e) => setDurabilityInDays(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Max. Lagertemp. (°C)">
              <input type="number" value={maxStorageTemperature} onChange={(e) => setMaxStorageTemperature(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </FormSection>

        {/* Lager & Pfadfinder */}
        <FormSection title="Lager & Pfadfinder" icon="backpack">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Lagerungsart">
              <select value={storageType} onChange={(e) => setStorageType(e.target.value)} className={inputClass}>
                <option value="">Keine Angabe</option>
                <option value="dry">Trocken</option>
                <option value="refrigerated">Kühlschrank</option>
                <option value="frozen">Gefroren</option>
                <option value="ambient">Raumtemperatur</option>
              </select>
            </Field>
            <Field label="Kochfaktor (< 1 = schrumpft, > 1 = quillt auf)">
              <input type="number" step="0.01" min="0.01" value={cookingFactor} onChange={(e) => setCookingFactor(e.target.value)} placeholder="z.B. 0.7 (Fleisch) oder 2.5 (Nudeln)" className={inputClass} />
            </Field>
            <Field label="Camp-geeignet">
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={campSuitable} onChange={(e) => setCampSuitable(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Ja, fürs Zeltlager geeignet</span>
              </label>
            </Field>
            <Field label="Zubereitungsdauer (Min.)">
              <input type="number" min="0" value={preparationTimeMin} onChange={(e) => setPreparationTimeMin(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Saison von (Monat)">
              <select value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} className={inputClass}>
                <option value="">Ganzjährig</option>
                <option value="1">Januar</option>
                <option value="2">Februar</option>
                <option value="3">März</option>
                <option value="4">April</option>
                <option value="5">Mai</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Dezember</option>
              </select>
            </Field>
            <Field label="Saison bis (Monat)">
              <select value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} className={inputClass}>
                <option value="">Ganzjährig</option>
                <option value="1">Januar</option>
                <option value="2">Februar</option>
                <option value="3">März</option>
                <option value="4">April</option>
                <option value="5">Mai</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Dezember</option>
              </select>
            </Field>
          </div>
        </FormSection>

        {/* Scores */}
        <FormSection title="Bewertungen" icon="health_and_safety">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Kinder-Score">
              <input type="number" step="0.1" value={childScore} onChange={(e) => setChildScore(e.target.value)} placeholder="0-10" className={inputClass} />
            </Field>
            <Field label="Pfadfinder-Score">
              <input type="number" step="0.1" value={scoutScore} onChange={(e) => setScoutScore(e.target.value)} placeholder="0-10" className={inputClass} />
            </Field>
            <Field label="Umwelt-Score">
              <input type="number" step="0.1" value={environmentalScore} onChange={(e) => setEnvironmentalScore(e.target.value)} placeholder="0-10" className={inputClass} />
            </Field>
            <Field label="NOVA-Score">
              <input type="number" step="1" min="1" max="4" value={novaScore} onChange={(e) => setNovaScore(e.target.value)} placeholder="1-4" className={inputClass} />
            </Field>
            <Field label="Fruchtfaktor">
              <input type="number" step="0.01" value={fruitFactor} onChange={(e) => setFruitFactor(e.target.value)} placeholder="0-1" className={inputClass} />
            </Field>
          </div>
        </FormSection>

        {/* Referenzen */}
        <FormSection title="Referenzen" icon="link">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="FDC ID (USDA)">
              <input type="number" value={fdcId} onChange={(e) => setFdcId(e.target.value)} placeholder="z.B. 167567" className={inputClass} />
            </Field>
            <Field label="REWE Artikelnr.">
              <input type="number" value={nanArtIdRewe} onChange={(e) => setNanArtIdRewe(e.target.value)} placeholder="z.B. 746775" className={inputClass} />
            </Field>
            <Field label="EAN (Barcode)">
              <input value={ean} onChange={(e) => setEan(e.target.value)} placeholder="z.B. 4000521007805" className={inputClass} />
            </Field>
          </div>
        </FormSection>

        {/* Nutritional Tags */}
        {nutritionalTags && nutritionalTags.length > 0 && (
          <FormSection title="Allergene & Unverträglichkeiten" icon="warning">
            <div className="flex flex-wrap gap-2">
              {nutritionalTags.map((tag: NutritionalTag) => {
                const selected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      selected
                        ? tag.is_dangerous
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tag.name}
                    {selected && (
                      <span className="ml-1 material-symbols-outlined text-xs align-middle">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        {/* Content Tags */}
        {allTags && allTags.length > 0 && (
          <FormSection title="Tags" icon="sell">
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag: Tag) => {
                const selected = selectedContentTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleContentTag(tag.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      selected
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {tag.icon && <span className="mr-1">{tag.icon}</span>}
                    {tag.name}
                    {selected && (
                      <span className="ml-1 material-symbols-outlined text-xs align-middle">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/ingredients/${slug}`)}
            className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!name.trim() || updateIngredient.isPending}
            className="flex items-center gap-1.5 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {updateIngredient.isPending && (
              <span className="material-symbols-outlined text-lg animate-spin">
                progress_activity
              </span>
            )}
            Zutat speichern
          </button>
        </div>
      </form>

      {ingredient && (
        <IngredientMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          currentIngredient={{
            id: ingredient.id,
            name: ingredient.name,
            slug: ingredient.slug,
          }}
          onMergeComplete={() => {
            setMergeDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
