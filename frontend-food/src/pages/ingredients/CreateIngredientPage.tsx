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
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Sparkles, Eye, Link } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { useCurrentUser } from '@/api/auth';
import {
  useCreateIngredient,
  useUpdateIngredient,
  useRetailSections,
  useAiCreateIngredient,
  useIngredientAiPreview,
  useIngredientImportUrl,
  useGenericTerms,
} from '@/api/supplies';
import { RESTORE_DRAFT_PARAM, clearDraft, loadDraft } from '@/hooks/useDraft';
import { useRequireLogin } from '@/hooks/useRequireLogin';
import { useAiAccess } from '@/hooks/useAiAccess';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import type { IngredientStatus } from '@/schemas/supply';
import { ingredientStatusLabel } from '@/lib/ingredientStatus';
import { Icon } from '@/components/ui/icon';


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IngredientFormData {
  name: string;
  description: string;
  status: IngredientStatus;
  retail_section_id: number | null;
}

const INGREDIENT_DRAFT_KEY = 'ingredient:new';

const EMPTY_FORM: IngredientFormData = {
  name: '',
  description: '',
  status: 'draft',
  retail_section_id: null,
};

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
                className={`text-caption font-semibold whitespace-nowrap transition-colors duration-300 ${
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
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Link className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-section font-semibold">URL importieren</h2>
        </div>
        <p className="text-body text-muted-foreground">
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
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-body">{error}</div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !url.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body font-medium disabled:opacity-50"
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
            className="px-4 py-2 rounded-lg border text-body"
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
  const [searchParams] = useSearchParams();
  const prefillName = searchParams.get('prefillName') ?? '';
  const redirectTo = searchParams.get('redirectTo') ?? '';

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: retailSections } = useRetailSections();

  const createIngredient = useCreateIngredient();
  // useUpdateIngredient needs the slug at hook construction time;
  // we track it in state and use it conditionally in the save handler.
  const [createdSlug, setCreatedSlug] = useState('');
  const updateIngredient = useUpdateIngredient(createdSlug);
  const aiCreate = useAiCreateIngredient();
  const aiPreview = useIngredientAiPreview();
  const aiPending = aiCreate.isPending || aiPreview.isPending;
  // "Zutat erkennen" (name/link) is on the anonymous allowlist; only the quota can block it.
  const ai = useAiAccess({ anonymousAllowed: true });
  const { guard } = useRequireLogin();
  const importUrl = useIngredientImportUrl();
  const { data: genericTerms } = useGenericTerms();

  const [step, setStep] = useState(prefillName ? 1 : 0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [existingIngredient, setExistingIngredient] = useState<{ slug: string; name: string } | null>(null);
  const [formData, setFormData] = useState<IngredientFormData>(
    prefillName ? { ...EMPTY_FORM, name: prefillName } : EMPTY_FORM,
  );
  const [createdIngredient, setCreatedIngredient] = useState<{
    slug: string;
    name: string;
    description: string | null;
    status: IngredientStatus;
    retail_section_id: number | null;
    ai_interaction_id?: string | null;
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

  // After the login round trip: restore the draft the visitor was about to save.
  useEffect(() => {
    if (!user || searchParams.get(RESTORE_DRAFT_PARAM) !== INGREDIENT_DRAFT_KEY) return;
    const draft = loadDraft<IngredientFormData>(INGREDIENT_DRAFT_KEY);
    if (!draft) return;
    setFormData(draft);
    setStep(1);
    toast.info('Willkommen zurück! Deine Zutat ist wiederhergestellt – prüfe sie und speichere.');
    // Only once per login round trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Inline name validation: message at the field, focus on it. Returns false when the name is missing. */
  function requireName(): boolean {
    if (formData.name.trim()) return true;
    setNameError('Bitte gib einen Namen ein.');
    setStep(1);
    window.setTimeout(() => nameInputRef.current?.focus(), 0);
    return false;
  }

  function updateForm(partial: Partial<IngredientFormData>) {
    setFormData((prev) => ({ ...prev, ...partial }));
  }

  // -------------------------------------------------------------------------
  // AI mode: call ai-create, pre-fill form, jump to step 1
  // -------------------------------------------------------------------------
  function handleAiCreate() {
    if (!aiName.trim()) return;
    setAiError(null);
    if (!user) {
      // Visitors get a draft without saving; the ingredient is created on save after login.
      aiPreview.mutate(aiName.trim(), {
        onSuccess: (result) => {
          setFormData({
            name: result.ingredient_draft.name,
            description: result.ingredient_draft.description ?? '',
            status: result.ingredient_draft.status,
            retail_section_id: result.ingredient_draft.retail_section_id ?? null,
          });
          setStep(1);
        },
        onError: (err) => {
          setAiError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
          setAiMode('cancelled');
        },
      });
      return;
    }
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
    if (honeyField) return;
    if (!requireName()) return;
    guard(saveIngredient, {
      reason: 'Melde dich an, um deine Zutat zu speichern. Deine Eingaben bleiben erhalten.',
      draftKey: INGREDIENT_DRAFT_KEY,
      draftValue: formData,
    });
  }

  function saveIngredient() {

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      retail_section_id: formData.retail_section_id ?? undefined,
    };

    function getRedirectUrl(slug: string): string {
      if (redirectTo) {
        const separator = redirectTo.includes('?') ? '&' : '?';
        return `${redirectTo}${separator}newIngredientSlug=${slug}`;
      }
      return `/ingredients/${slug}`;
    }

    if (createdIngredient) {
      // AI mode: ingredient already exists — PATCH with any edits from step 1
      updateIngredient.mutate(payload as Record<string, unknown>, {
        onSuccess: (updated) => {
          toast.success('Zutat gespeichert');
          navigate(getRedirectUrl(updated.slug));
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
            clearDraft(INGREDIENT_DRAFT_KEY);
            toast.success('Zutat erstellt');
            navigate(getRedirectUrl(ingredient.slug));
          },
          onError: (err) => {
            if (err instanceof ApiError && err.existing) {
              // Duplicate name: point to the existing ingredient at the name field instead of a generic toast.
              setExistingIngredient({ slug: err.existing.slug, name: err.existing.name });
              setNameError(err.message);
              setStep(1);
              window.setTimeout(() => nameInputRef.current?.focus(), 0);
              return;
            }
            toast.error('Fehler beim Erstellen der Zutat', { description: err.message });
          },
        },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------
  if (userLoading) {
    return (
      <div className="container py-16 max-w-3xl text-center text-muted-foreground text-body">
        Wird geladen...
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
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-success to-success text-white">
          <Icon name="nutrition" size={24} />
        </div>
        <div>
          <h1 className="text-title font-bold font-display">Zutat erstellen</h1>
          <p className="text-body text-muted-foreground">
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
          <h2 className="text-section font-semibold mb-4">Wie möchtest du starten?</h2>

          {aiMode === 'choose' && ai.hint && (
            <p className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{ai.hint}</p>
          )}
          {aiMode === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* KI */}
              <button
                type="button"
                onClick={() => setAiMode('ai')}
                disabled={ai.disabled}
                title={ai.hint || undefined}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10">
                  <Icon name="auto_awesome" size={24} className="text-primary" />
                </div>
                <span className="font-semibold">Mit KI-Hilfe</span>
                <span className="text-caption text-muted-foreground">
                  Name eingeben — KI füllt alle Felder automatisch aus
                </span>
              </button>

              {/* Manuell */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-muted">
                  <Icon name="edit_note" size={24} className="text-muted-foreground" />
                </div>
                <span className="font-semibold">Manuell</span>
                <span className="text-caption text-muted-foreground">
                  Fülle das Formular direkt selbst aus
                </span>
              </button>

              {/* Mit Link */}
              <button
                type="button"
                onClick={() => setShowUrlModal(true)}
                disabled={ai.disabled}
                title={ai.hint || undefined}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-muted">
                  <Link className="w-8 h-8 text-muted-foreground" />
                </div>
                <span className="font-semibold">Mit Link</span>
                <span className="text-caption text-muted-foreground">
                  Produktseite, Open Food Facts oder USDA FDC URL einfügen
                </span>
              </button>
            </div>
          )}

          {aiMode === 'ai' && (
            <div className="space-y-4">
              <p className="text-body text-muted-foreground">
                Gib den Namen der Zutat ein. Die KI recherchiert Nährwerte, Portionen und
                weitere Details automatisch per Google Search.
              </p>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !aiPending && !ai.disabled && handleAiCreate()}
                placeholder="z.B. Haferflocken, Parmesan, Kichererbsen..."
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                {aiPending ? (
                  <>
                    <div className="flex items-center gap-2 text-body text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      {user ? 'KI erstellt Zutat...' : 'KI erkennt Zutat...'}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleAiCreate}
                      disabled={!aiName.trim() || ai.disabled}
                      title={ai.hint || undefined}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      {user ? 'Mit KI erstellen' : 'Mit KI erkennen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiMode('choose')}
                      className="px-4 py-2 rounded-lg border text-body"
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
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-body">{aiError}</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAiMode('ai'); setAiError(null); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body font-medium flex items-center gap-1.5"
                >
                  <Icon name="auto_awesome" size={16} />
                  Erneut versuchen
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg border text-body"
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
           <div className="p-3 rounded-lg bg-primary/10 text-primary text-body flex items-center gap-2">
              <Icon name="check_circle" size={16} />
              KI hat die Zutat bereits mit allen Nährwerten angelegt. Hier kannst du die
              Stammdaten noch anpassen.
            </div>
          )}
          {createdIngredient?.ai_interaction_id && (
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              <span>War die KI-Hilfe hilfreich?</span>
              <AiVoteButtons interactionId={createdIngredient.ai_interaction_id} />
            </div>
          )}

          {/* Name */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-body font-medium mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              ref={nameInputRef}
              onChange={(e) => {
                updateForm({ name: e.target.value });
                setNameError(null);
                setExistingIngredient(null);
              }}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? 'ingredient-name-error' : undefined}
              placeholder="Name der Zutat"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {nameError && (
              <p id="ingredient-name-error" role="alert" className="mt-2 text-caption text-destructive">
                {nameError}{' '}
                {existingIngredient && (
                  <RouterLink to={`/ingredients/${existingIngredient.slug}`} className="underline">
                    Zur vorhandenen Zutat „{existingIngredient.name}“
                  </RouterLink>
                )}
              </p>
            )}
            {isNameTooGeneric && (
              <p className="mt-2 text-caption text-warning flex items-start gap-1">
                <Icon name="warning" size={16} />
                „{formData.name.trim()}“ ist zu generisch — bitte konkretisieren, z.B. mit einer
                Zustandsform („Fusilli trocken“, „Jodsalz“).
              </p>
            )}
          </div>

          {/* Beschreibung */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-body font-medium mb-1.5">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              rows={3}
              placeholder="Kurze Beschreibung (optional)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Status + Warengruppe */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-body font-medium mb-4">Klassifikation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-caption text-muted-foreground mb-1">Status</span>
                <p className="rounded-lg border border-input bg-muted/30 px-3 py-2 text-body text-muted-foreground">
                  {ingredientStatusLabel(formData.status)} – neue Zutaten werden vom Team geprüft
                </p>
              </div>
              <div>
                <label className="block text-caption text-muted-foreground mb-1">Warengruppe</label>
                <select
                  value={formData.retail_section_id ?? ''}
                  onChange={(e) =>
                    updateForm({
                      retail_section_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body"
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
              className="px-4 py-2 rounded-lg border text-body"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireName()) return;
                setStep(2);
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body font-medium disabled:opacity-50"
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
            <div className="bg-gradient-to-r from-success to-success px-6 py-4">
              <h2 className="text-white text-section font-bold">{formData.name || 'Ohne Namen'}</h2>
              {formData.description && (
                <p className="text-white/80 text-body mt-1">{formData.description}</p>
              )}
            </div>
            <div className="p-6 space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-caption font-medium">
                  <Icon name="label" size={16} />
                  {ingredientStatusLabel(formData.status)}
                </span>
                {formData.retail_section_id && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-caption font-medium">
                    <Icon name="store" size={16} />
                    {retailSections?.find((rs) => rs.id === formData.retail_section_id)?.name ?? ''}
                  </span>
                )}
              </div>
              {createdIngredient && (
                <p className="text-caption text-muted-foreground">
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
              className="px-4 py-2 rounded-lg border text-body"
            >
              Zurück zum Bearbeiten
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-body font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Icon name="save" size={16} />
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
