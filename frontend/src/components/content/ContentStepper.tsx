/**
 * ContentStepper — Reusable multi-step creation wizard for all content types.
 *
 * Shared steps:
 *  0. "Beschreiben" — AI or manual toggle, free-text AI input
 *  1. "Bearbeiten"  — Common fields (title, summary, description, difficulty, costs, etc.)
 *     + injected type-specific fields via `renderTypeFields`
 *  2. "Vorschau & Speichern" — Preview card + save button
 *
 * Each content type page provides:
 *  - `renderTypeFields()` for step 1 extras
 *  - `renderPreviewExtras()` for step 2 extras
 *  - `onSave()` callback with the assembled payload
 *  - `typeLabel` / `typeIcon` for display
 */
import { useRef, useState, type ReactNode } from 'react';
import { useRefurbish, useImproveText, useSuggestTags } from '@/api/ai';
import { useTags, useScoutLevels } from '@/api/tags';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_RATING_OPTIONS,
} from '@/schemas/content';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentFormData {
  title: string;
  summary: string;
  description: string;
  difficulty: string;
  costsRating: string;
  executionTime: string;
  preparationTime: string;
  selectedTagIds: number[];
  selectedScoutIds: number[];
}

export interface ContentStepperProps {
  /** Display label, e.g. "Gruppenstunde" */
  typeLabel: string;
  /** Material Symbols icon name */
  typeIcon: string;
  /** Gradient class for the header badge, e.g. "from-sky-500 to-cyan-600" */
  typeGradient: string;

  /** Additional fields rendered in step 1 (Edit) below the common fields */
  renderTypeFields?: () => ReactNode;
  /** Additional preview content rendered in step 2 below the common preview */
  renderPreviewExtras?: (formData: ContentFormData) => ReactNode;
  /** Called when user clicks "Speichern" — receives the common form data */
  onSave: (formData: ContentFormData) => void | Promise<void>;
  /** Whether saving is in progress */
  isSaving?: boolean;
  /** Optional: hide preparation_time field (e.g. for Blog) */
  hidePreparationTime?: boolean;

  /** Expose form data changes to parent for type-specific AI pre-fill */
  formData?: ContentFormData;
  onFormDataChange?: (data: ContentFormData) => void;
}

// Stepper step definitions
const STEPS = [
  { label: 'Beschreiben', icon: 'edit_note' },
  { label: 'Bearbeiten', icon: 'auto_awesome' },
  { label: 'Vorschau & Speichern', icon: 'visibility' },
] as const;

const PREPARATION_TIME_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'less_15', label: '< 15 Minuten' },
  { value: '15_30', label: '15 – 30 Minuten' },
  { value: '30_60', label: '30 – 60 Minuten' },
  { value: 'more_60', label: '> 60 Minuten' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentStepper({
  typeLabel,
  typeIcon,
  typeGradient,
  renderTypeFields,
  renderPreviewExtras,
  onSave,
  isSaving = false,
  hidePreparationTime = false,
  formData: controlledFormData,
  onFormDataChange,
}: ContentStepperProps) {
  const [step, setStep] = useState(0);

  // Bot protection
  const [honeyField, setHoneyField] = useState('');
  const loadedAt = useRef(Date.now());

  // Step 0 mode
  const [step0Mode, setStep0Mode] = useState<'choose' | 'ai' | 'cancelled'>('choose');
  const [rawText, setRawText] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Form state (internal or controlled)
  const [internalFormData, setInternalFormData] = useState<ContentFormData>({
    title: '',
    summary: '',
    description: '',
    difficulty: '',
    costsRating: '',
    executionTime: '',
    preparationTime: '',
    selectedTagIds: [],
    selectedScoutIds: [],
  });

  const formData = controlledFormData ?? internalFormData;
  const setFormData = (update: Partial<ContentFormData>) => {
    const next = { ...formData, ...update };
    if (onFormDataChange) {
      onFormDataChange(next);
    } else {
      setInternalFormData(next);
    }
  };

  // APIs
  const refurbish = useRefurbish();
  const improveText = useImproveText();
  const suggestTags = useSuggestTags();
  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

  // -------------------------------------------------------------------------
  // Step 0 → Step 1: AI refurbish
  // -------------------------------------------------------------------------
  function handleAiRefurbish() {
    if (!rawText.trim()) return;
    setAiErrorMessage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    refurbish.mutate(
      { raw_text: rawText.trim(), signal: controller.signal },
      {
        onSuccess: (data) => {
          abortControllerRef.current = null;
          setFormData({
            title: data.title,
            summary: data.summary,
            description: data.description,
            difficulty: data.difficulty,
            costsRating: data.costs_rating,
            executionTime: data.execution_time,
            preparationTime: data.preparation_time,
            selectedTagIds: data.suggested_tag_ids,
            selectedScoutIds: data.suggested_scout_level_ids ?? [],
          });
          setStep(1);
        },
        onError: (err) => {
          abortControllerRef.current = null;
          if (err instanceof Error && err.name === 'AbortError') {
            // User cancelled — do nothing
          } else {
            setAiErrorMessage(err.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
          }
          setStep0Mode('cancelled');
        },
      },
    );
  }

  function handleAbortAi() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStep0Mode('cancelled');
    refurbish.reset();
  }

  // AI improve text for a single field
  function handleImproveField(field: string, text: string, setter: (v: string) => void) {
    improveText.mutate(
      { text, field },
      {
        onSuccess: (data) => setter(data.improved_text),
        onError: () => toast.error('KI-Verbesserung fehlgeschlagen'),
      },
    );
  }

  // AI suggest tags
  function handleSuggestTags() {
    suggestTags.mutate(
      {
        title: formData.title,
        description: formData.description,
      },
      {
        onSuccess: (data) => {
          setFormData({ selectedTagIds: data.tag_ids });
          toast.success(`${data.tag_ids.length} Tags vorgeschlagen`);
        },
        onError: () => toast.error('Tag-Vorschläge fehlgeschlagen'),
      },
    );
  }

  // Save
  async function handleSave() {
    // Bot check
    if (honeyField || Date.now() - loadedAt.current < 5000) return;
    if (!formData.title.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }
    await onSave(formData);
  }

  // Helper to get tag/scout level labels
  function getTagName(id: number) {
    return allTags?.find((t) => t.id === id)?.name ?? `Tag ${id}`;
  }
  function getScoutLevelName(id: number) {
    return scoutLevels?.find((s) => s.id === id)?.name ?? `Stufe ${id}`;
  }
  function getOptionLabel(options: readonly { value: string; label: string }[], value: string) {
    return options.find((o) => o.value === value)?.label ?? value;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${typeGradient} text-white`}>
          <span className="material-symbols-outlined text-[24px]">{typeIcon}</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{typeLabel} erstellen</h1>
          <p className="text-sm text-muted-foreground">
            Schritt {step + 1} von {STEPS.length}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              if (i < step) setStep(i);
            }}
            disabled={i > step}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              i === step
                ? 'bg-primary text-primary-foreground'
                : i < step
                  ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                  : 'bg-muted text-muted-foreground cursor-default'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Honeypot (bot protection) */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website_url">Website</label>
        <input
          id="website_url"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeyField}
          onChange={(e) => setHoneyField(e.target.value)}
        />
      </div>

      {/* ================================================================ */}
      {/* Step 0: Describe (AI or Manual)                                  */}
      {/* ================================================================ */}
      {step === 0 && (
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Wie möchtest du starten?</h2>

          {step0Mode === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStep0Mode('ai')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10">
                  <span className="material-symbols-outlined text-[32px] text-primary">auto_awesome</span>
                </div>
                <span className="font-semibold">Mit KI-Hilfe</span>
                <span className="text-xs text-muted-foreground">
                  Beschreibe deine Idee in eigenen Worten — die KI strukturiert alles für dich
                </span>
              </button>

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
            </div>
          )}

          {step0Mode === 'ai' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Beschreibe deine {typeLabel.toLowerCase()} in eigenen Worten. Die KI erstellt daraus
                einen strukturierten Entwurf, den du anschliessend überarbeiten kannst.
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={6}
                placeholder={`Beschreibe deine ${typeLabel.toLowerCase()} hier...`}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                {refurbish.isPending ? (
                  <button
                    type="button"
                    onClick={handleAbortAi}
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
                  >
                    Abbrechen
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleAiRefurbish}
                      disabled={!rawText.trim()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      KI-Entwurf erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep0Mode('choose')}
                      className="px-4 py-2 rounded-lg border text-sm"
                    >
                      Zurück
                    </button>
                  </>
                )}
              </div>

              {refurbish.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  KI arbeitet...
                </div>
              )}
            </div>
          )}

          {step0Mode === 'cancelled' && (
            <div className="space-y-4">
              {aiErrorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {aiErrorMessage}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep0Mode('ai');
                    setAiErrorMessage(null);
                  }}
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
      {/* Step 1: Edit (Common + Type-Specific Fields)                     */}
      {/* ================================================================ */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-1.5">
              Titel <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ title: e.target.value })}
                placeholder="Titel eingeben"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() =>
                  handleImproveField('title', formData.title, (v) =>
                    setFormData({ title: v }),
                  )
                }
                disabled={!formData.title.trim() || improveText.isPending}
                className="px-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                title="KI-Verbesserung"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-1.5">Kurzbeschreibung</label>
            <div className="flex gap-2">
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ summary: e.target.value })}
                rows={2}
                placeholder="Worum geht es? (1-2 Sätze)"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() =>
                  handleImproveField('summary', formData.summary, (v) =>
                    setFormData({ summary: v }),
                  )
                }
                disabled={!formData.summary.trim() || improveText.isPending}
                className="px-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 self-start"
                title="KI-Verbesserung"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium">Beschreibung</label>
              <button
                type="button"
                onClick={() =>
                  handleImproveField('description', formData.description, (v) =>
                    setFormData({ description: v }),
                  )
                }
                disabled={!formData.description.trim() || improveText.isPending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 text-xs"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                KI verbessern
              </button>
            </div>
            <MarkdownEditor
              value={formData.description}
              onChange={(val) => setFormData({ description: val ?? '' })}
              height={250}
            />
          </div>

          {/* Meta fields */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-medium mb-4">Eigenschaften</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Schwierigkeit</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ difficulty: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Kosten</label>
                <select
                  value={formData.costsRating}
                  onChange={(e) => setFormData({ costsRating: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {COSTS_RATING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Durchführungszeit</label>
                <select
                  value={formData.executionTime}
                  onChange={(e) => setFormData({ executionTime: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {EXECUTION_TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {!hidePreparationTime && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vorbereitungszeit</label>
                  <select
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ preparationTime: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Wählen —</option>
                    {PREPARATION_TIME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Type-specific fields (injected) */}
          {renderTypeFields?.()}

          {/* Tags */}
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Tags</h3>
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={(!formData.title && !formData.description) || suggestTags.isPending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 text-xs"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                {suggestTags.isPending ? 'Wird geladen...' : 'KI-Vorschläge'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags?.map((tag) => {
                const selected = formData.selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        selectedTagIds: selected
                          ? formData.selectedTagIds.filter((id) => id !== tag.id)
                          : [...formData.selectedTagIds, tag.id],
                      })
                    }
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scout levels */}
          <div className="bg-card rounded-xl border p-6">
            <h3 className="text-sm font-medium mb-3">Altersstufen</h3>
            <div className="flex flex-wrap gap-2">
              {scoutLevels?.map((level) => {
                const selected = formData.selectedScoutIds.includes(level.id);
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        selectedScoutIds: selected
                          ? formData.selectedScoutIds.filter((id) => id !== level.id)
                          : [...formData.selectedScoutIds, level.id],
                      })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {level.name}
                  </button>
                );
              })}
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
              onClick={() => setStep(2)}
              disabled={!formData.title.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Vorschau
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 2: Preview & Save                                           */}
      {/* ================================================================ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Preview card */}
          <div className="bg-card rounded-xl border overflow-hidden">
            {/* Preview header */}
            <div className={`bg-gradient-to-r ${typeGradient} px-6 py-4`}>
              <h2 className="text-white text-xl font-bold">{formData.title || 'Ohne Titel'}</h2>
              {formData.summary && (
                <p className="text-white/80 text-sm mt-1">{formData.summary}</p>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* Meta KPIs */}
              <div className="flex flex-wrap gap-3">
                {formData.difficulty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
                    {getOptionLabel(DIFFICULTY_OPTIONS, formData.difficulty)}
                  </span>
                )}
                {formData.costsRating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">payments</span>
                    {getOptionLabel(COSTS_RATING_OPTIONS, formData.costsRating)}
                  </span>
                )}
                {formData.executionTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {getOptionLabel(EXECUTION_TIME_OPTIONS, formData.executionTime)}
                  </span>
                )}
                {formData.preparationTime && !hidePreparationTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    {getOptionLabel(PREPARATION_TIME_OPTIONS, formData.preparationTime)}
                  </span>
                )}
              </div>

              {/* Tags */}
              {formData.selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.selectedTagIds.map((id) => (
                    <span key={id} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {getTagName(id)}
                    </span>
                  ))}
                </div>
              )}

              {/* Scout levels */}
              {formData.selectedScoutIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formData.selectedScoutIds.map((id) => (
                    <span key={id} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium">
                      {getScoutLevelName(id)}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {formData.description && (
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={formData.description} />
                </div>
              )}

              {/* Type-specific preview extras */}
              {renderPreviewExtras?.(formData)}
            </div>
          </div>

          {/* Navigation */}
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
              disabled={isSaving || !formData.title.trim()}
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
    </div>
  );
}
