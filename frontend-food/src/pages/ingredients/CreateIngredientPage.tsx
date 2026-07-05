/**
 * CreateIngredientPage — Geführter 3-Schritt-Flow zum Erstellen von Zutaten.
 *
 * Step 0: Modus wählen — KI / Manuell / Mit Link (URL-Import)
 * Step 1: Stammdaten — Name (required), Beschreibung, Status, Warengruppe
 * Step 2: Vorschau & Speichern
 *
 * Nach dem Speichern navigiert die Page zu /ingredients/<slug>.
 * Ist der KI-Modus aktiv, wurde die Zutat bereits per ai-create erstellt;
 * dann wird nur noch ein PATCH für eventuelle Änderungen aus Step 1 gemacht.
 */
import { Fragment, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Pencil, Sparkles, Eye, Link } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useCreateIngredient,
  useUpdateIngredient,
  useRetailSections,
  useAiCreateIngredient,
  useIngredientImportUrl,
  useGenericTerms,
} from '@/api/supplies';
import UnauthGate from '@/components/shared/UnauthGate';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngredientFormData {
  name: string;
  description: string;
  status: string;
  retail_section_id: number | null;
}

const EMPTY_FORM: IngredientFormData = {
  name: '',
  description: '',
  status: 'draft',
  retail_section_id: null,
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'user_content', label: 'Nutzercontent' },
  { value: 'approved', label: 'Geprüft' },
];

const STEPS = [
  { label: 'Beschreiben', icon: Pencil },
  { label: 'Bearbeiten', icon: Sparkles },
  { label: 'Vorschau & Speichern', icon: Eye },
] as const;

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((s, i) => {
        const isCompleted = i < step;
        const isActive = i === step;
        const IconComponent = s.icon;
        return (
          <Fragment key={s.label}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                      ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]'
                      : 'bg-card border-muted-foreground/25 text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <IconComponent className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${
                  isCompleted || isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-3 rounded-full transition-colors duration-500 ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL Import Modal
// ---------------------------------------------------------------------------
function UrlImportModal({
  onImport,
  onCancel,
  isPending,
}: {
  onImport: (url: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!url.trim()) return;
    setError(null);
    onImport(url.trim());
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Link className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">URL importieren</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Füge eine Produktseite, Open Food Facts oder USDA FoodData URL ein.
          Die KI erkennt die Quelle und extrahiert automatisch die Zutatendaten.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isPending && handleSubmit()}
          placeholder="https://www.rewe.de/produkte/..."
          disabled={isPending}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !url.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird analysiert...
              </>
            ) : (
              'Importieren'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CreateIngredientPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: retailSections } = useRetailSections();

  const createIngredient = useCreateIngredient();
  // useUpdateIngredient needs the slug at hook construction time;
  // we track it in state and use it conditionally in the save handler.
  const [createdSlug, setCreatedSlug] = useState('');
  const updateIngredient = useUpdateIngredient(createdSlug);
  const aiCreate = useAiCreateIngredient();
  const importUrl = useIngredientImportUrl();
  const { data: genericTerms } = useGenericTerms();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<IngredientFormData>(EMPTY_FORM);
  const [createdIngredient, setCreatedIngredient] = useState<{
    slug: string;
    name: string;
    description: string | null;
    status: string;
    retail_section_id: number | null;
  } | null>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);

  // Suppress unused-variable lint — createdSlug is read by useUpdateIngredient above
  void createdSlug;

  // Step 0 AI mode state
  const [aiMode, setAiMode] = useState<'choose' | 'ai' | 'cancelled'>('choose');
  const [aiName, setAiName] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Bot protection for manual creation
  const [honeyField, setHoneyField] = useState('');
  const loadedAt = useRef(Date.now());

  function updateForm(partial: Partial<IngredientFormData>) {
    setFormData((prev) => ({ ...prev, ...partial }));
  }

  // -------------------------------------------------------------------------
  // AI mode: call ai-create, pre-fill form, jump to step 1
  // -------------------------------------------------------------------------
  function handleAiCreate() {
    if (!aiName.trim()) return;
    setAiError(null);
    aiCreate.mutate(aiName.trim(), {
      onSuccess: (ingredient) => {
        setCreatedIngredient(ingredient);
        setCreatedSlug(ingredient.slug);
        setFormData({
          name: ingredient.name,
          description: ingredient.description ?? '',
          status: ingredient.status,
          retail_section_id: ingredient.retail_section_id ?? null,
        });
        setStep(1);
      },
      onError: (err) => {
        setAiError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        setAiMode('cancelled');
      },
    });
  }

  // -------------------------------------------------------------------------
  // URL import: call import-from-url, pre-fill form, jump to step 1
  // -------------------------------------------------------------------------
  function handleUrlImport(url: string) {
    importUrl.mutate(url, {
      onSuccess: (result) => {
        const draft = result.ingredient_draft;
        setFormData({
          name: draft.name,
          description: draft.description ?? '',
          status: draft.status,
          retail_section_id: draft.retail_section_id ?? null,
        });

        const nutritionCount = result.nutrition
          ? Object.values(result.nutrition).filter((v) => v !== null).length
          : 0;
        if (nutritionCount > 0) {
          toast.success(`${nutritionCount} Nährwertfelder aus der URL extrahiert`);
        }

        setShowUrlModal(false);
        setStep(1);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'URL-Import fehlgeschlagen');
      },
    });
  }

  // -------------------------------------------------------------------------
  // Step 2: Save
  // -------------------------------------------------------------------------
  async function handleSave() {
    if (honeyField || Date.now() - loadedAt.current < 5000) return;
    if (!formData.name.trim()) {
      toast.error('Bitte gib einen Namen ein');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      retail_section_id: formData.retail_section_id ?? undefined,
    };

    if (createdIngredient) {
      // AI mode: ingredient already exists — PATCH with any edits from step 1
      updateIngredient.mutate(payload as Record<string, unknown>, {
        onSuccess: (updated) => {
          toast.success('Zutat gespeichert');
          navigate(`/ingredients/${updated.slug}`);
        },
        onError: () => toast.error('Fehler beim Speichern'),
      });
    } else {
      // Manual / URL mode: create the ingredient
      createIngredient.mutate(
        {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          retail_section_id: payload.retail_section_id ?? null,
        } as Parameters<typeof createIngredient.mutate>[0],
        {
          onSuccess: (ingredient) => {
            toast.success('Zutat erstellt');
            navigate(`/ingredients/${ingredient.slug}`);
          },
          onError: () => toast.error('Fehler beim Erstellen der Zutat'),
        },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------
  if (userLoading) {
    return (
      <div className="container py-16 max-w-3xl text-center text-muted-foreground text-sm">
        Wird geladen...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8 max-w-3xl">
        <UnauthGate
          title="Anmeldung erforderlich"
          description="Melde dich an, um eine Zutat zu erstellen."
        />
      </div>
    );
  }

  const isSaving = createIngredient.isPending || updateIngredient.isPending;
  const isNameTooGeneric =
    genericTerms?.some((term) => term.toLowerCase() === formData.name.trim().toLowerCase()) ?? false;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <span className="material-symbols-outlined text-[24px]">nutrition</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Zutat erstellen</h1>
          <p className="text-sm text-muted-foreground">
            Schritt {step + 1} von {STEPS.length}
          </p>
        </div>
      </div>

      <StepIndicator step={step} />

      {/* Honeypot */}
      <div className="sr-only" aria-hidden="true">
        <input
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeyField}
          onChange={(e) => setHoneyField(e.target.value)}
        />
      </div>

      {/* ================================================================ */}
      {/* Step 0: Modus wählen                                             */}
      {/* ================================================================ */}
      {step === 0 && (
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Wie möchtest du starten?</h2>

          {aiMode === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* KI */}
              <button
                type="button"
                onClick={() => setAiMode('ai')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                  <span className="material-symbols-outlined text-[32px] text-primary">auto_awesome</span>
                </div>
                <span className="font-semibold">Mit KI-Hilfe</span>
                <span className="text-xs text-muted-foreground">
                  Name eingeben — KI füllt alle Felder automatisch aus
                </span>
              </button>

              {/* Manuell */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted">
                  <span className="material-symbols-outlined text-[32px] text-muted-foreground">edit_note</span>
                </div>
                <span className="font-semibold">Manuell</span>
                <span className="text-xs text-muted-foreground">
                  Fülle das Formular direkt selbst aus
                </span>
              </button>

              {/* Mit Link */}
              <button
                type="button"
                onClick={() => setShowUrlModal(true)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted">
                  <Link className="w-8 h-8 text-muted-foreground" />
                </div>
                <span className="font-semibold">Mit Link</span>
                <span className="text-xs text-muted-foreground">
                  Produktseite, Open Food Facts oder USDA FDC URL einfügen
                </span>
              </button>
            </div>
          )}

          {aiMode === 'ai' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gib den Namen der Zutat ein. Die KI recherchiert Nährwerte, Portionen und
                weitere Details automatisch per Google Search.
              </p>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !aiCreate.isPending && handleAiCreate()}
                placeholder="z.B. Haferflocken, Parmesan, Kichererbsen..."
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                {aiCreate.isPending ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      KI erstellt Zutat...
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleAiCreate}
                      disabled={!aiName.trim()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      Mit KI erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMode('choose')}
                      className="px-4 py-2 rounded-lg border text-sm"
                    >
                      Zurück
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {aiMode === 'cancelled' && (
            <div className="space-y-4">
              {aiError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{aiError}</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAiMode('ai'); setAiError(null); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  Erneut versuchen
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Manuell weitermachen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 1: Stammdaten                                               */}
      {/* ================================================================ */}
      {step === 1 && (
        <div className="space-y-6">
          {createdIngredient && (
            <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              KI hat die Zutat bereits mit allen Nährwerten angelegt. Hier kannst du die
              Stammdaten noch anpassen.
            </div>
          )}

          {/* Name */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              placeholder="Name der Zutat"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {isNameTooGeneric && (
              <p className="mt-2 text-xs text-amber-600 flex items-start gap-1">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                „{formData.name.trim()}“ ist zu generisch — bitte konkretisieren, z.B. mit einer
                Zustandsform („Fusilli trocken“, „Jodsalz“).
              </p>
            )}
          </div>

          {/* Beschreibung */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-1.5">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={3}
              placeholder="Kurze Beschreibung (optional)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Status + Warengruppe */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-medium mb-4">Klassifikation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => updateForm({ status: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Warengruppe</label>
                <select
                  value={formData.retail_section_id ?? ''}
                  onChange={(e) =>
                    updateForm({
                      retail_section_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Keine —</option>
                  {retailSections?.map((rs) => (
                    <option key={rs.id} value={rs.id}>
                      {rs.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => {
                if (!formData.name.trim()) {
                  toast.error('Bitte gib einen Namen ein');
                  return;
                }
                setStep(2);
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Vorschau
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 2: Vorschau & Speichern                                     */}
      {/* ================================================================ */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <h2 className="text-white text-xl font-bold">{formData.name || 'Ohne Namen'}</h2>
              {formData.description && (
                <p className="text-white/80 text-sm mt-1">{formData.description}</p>
              )}
            </div>
            <div className="p-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">label</span>
                  {STATUS_OPTIONS.find((o) => o.value === formData.status)?.label ?? formData.status}
                </span>
                {formData.retail_section_id && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">store</span>
                    {retailSections?.find((rs) => rs.id === formData.retail_section_id)?.name ?? ''}
                  </span>
                )}
              </div>
              {createdIngredient && (
                <p className="text-xs text-muted-foreground">
                  Nährwerte und weitere Details wurden von der KI befüllt und können auf der
                  Detailseite weiter bearbeitet werden.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border text-sm"
            >
              Zurück zum Bearbeiten
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* URL Import Modal */}
      {showUrlModal && (
        <UrlImportModal
          onImport={handleUrlImport}
          onCancel={() => setShowUrlModal(false)}
          isPending={importUrl.isPending}
        />
      )}
    </div>
  );
}
