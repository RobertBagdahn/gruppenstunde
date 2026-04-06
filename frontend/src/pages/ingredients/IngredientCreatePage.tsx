import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import { useCreateIngredient, useRetailSections, useNutritionalTags } from '@/api/ingredients';
import type { NutritionalTag } from '@/schemas/ingredient';

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
    <div className="border rounded-lg p-4 bg-card">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
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
export default function IngredientCreatePage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const createIngredient = useCreateIngredient();
  const { data: retailSections } = useRetailSections();
  const { data: nutritionalTags } = useNutritionalTags();

  // Redirect if not logged in
  useEffect(() => {
    if (!userLoading && !user) navigate('/login');
  }, [user, userLoading, navigate]);

  // Form state — Stammdaten
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [retailSectionId, setRetailSectionId] = useState('');

  // Nutritional values per 100g
  const [energyKj, setEnergyKj] = useState('');
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

  // Scores
  const [childScore, setChildScore] = useState('');
  const [scoutScore, setScoutScore] = useState('');
  const [environmentalScore, setEnvironmentalScore] = useState('');
  const [novaScore, setNovaScore] = useState('');
  const [fruitFactor, setFruitFactor] = useState('');

  // References
  const [fdcId, setFdcId] = useState('');
  const [ean, setEan] = useState('');

  // Nutritional Tags
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
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
      status,
      retail_section_id: retailSectionId ? Number(retailSectionId) : null,

      energy_kj: toNum(energyKj),
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
      physical_viscosity: physicalViscosity.trim(),
      durability_in_days: toNum(durabilityInDays),
      max_storage_temperature: toNum(maxStorageTemperature),

      child_score: toNum(childScore),
      scout_score: toNum(scoutScore),
      environmental_score: toNum(environmentalScore),
      nova_score: toNum(novaScore),
      fruit_factor: toNum(fruitFactor),

      fdc_id: toNum(fdcId),
      ean: ean.trim(),

      nutritional_tag_ids: selectedTags,
    };

    createIngredient.mutate(payload, {
      onSuccess: (data) => {
        toast.success('Zutat erstellt');
        navigate(`/ingredients/${data.slug}`);
      },
      onError: (err) => {
        toast.error('Fehler beim Erstellen', { description: err.message });
      },
    });
  };

  if (userLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg max-w-3xl mx-auto mt-6" />;
  }

  const inputClass = 'w-full px-3 py-2 rounded-md border text-sm bg-background';

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

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl">egg_alt</span>
        Neue Zutat erstellen
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
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="draft">Entwurf</option>
                <option value="published">Veroeffentlicht</option>
              </select>
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
          </div>
        </FormSection>

        {/* Naehrwerte */}
        <FormSection title="Naehrwerte pro 100g" icon="nutrition">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Energie (kJ)">
              <input type="number" step="0.1" value={energyKj} onChange={(e) => setEnergyKj(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Protein (g)">
              <input type="number" step="0.01" value={proteinG} onChange={(e) => setProteinG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Fett (g)">
              <input type="number" step="0.01" value={fatG} onChange={(e) => setFatG(e.target.value)} className={inputClass} />
            </Field>
            <Field label="ges. Fettsaeuren (g)">
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
          </div>
        </FormSection>

        {/* Physikalisch */}
        <FormSection title="Physikalische Eigenschaften" icon="science">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Dichte (g/ml)">
              <input type="number" step="0.01" value={physicalDensity} onChange={(e) => setPhysicalDensity(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Viskositaet">
              <input value={physicalViscosity} onChange={(e) => setPhysicalViscosity(e.target.value)} placeholder="z.B. fluessig, fest" className={inputClass} />
            </Field>
            <Field label="Haltbarkeit (Tage)">
              <input type="number" value={durabilityInDays} onChange={(e) => setDurabilityInDays(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Max. Lagertemp. (\u00B0C)">
              <input type="number" value={maxStorageTemperature} onChange={(e) => setMaxStorageTemperature(e.target.value)} className={inputClass} />
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
            <Field label="EAN (Barcode)">
              <input value={ean} onChange={(e) => setEan(e.target.value)} placeholder="z.B. 4000521007805" className={inputClass} />
            </Field>
          </div>
        </FormSection>

        {/* Nutritional Tags */}
        {nutritionalTags && nutritionalTags.length > 0 && (
          <FormSection title="Allergene & Unvertraeglichkeiten" icon="warning">
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
                          ? 'bg-red-100 text-red-700 border-red-300'
                          : 'bg-primary/10 text-primary border-primary/30'
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/ingredients')}
            className="px-4 py-2 border rounded-md text-sm hover:bg-muted transition"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={!name.trim() || createIngredient.isPending}
            className="flex items-center gap-1.5 px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {createIngredient.isPending && (
              <span className="material-symbols-outlined text-lg animate-spin">
                progress_activity
              </span>
            )}
            Zutat erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
