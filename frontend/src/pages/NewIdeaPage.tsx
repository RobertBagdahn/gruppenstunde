import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRefurbish, useImproveText, useSuggestTags, useGenerateImage } from '@/api/ai';
import { useTags, useScoutLevels } from '@/api/tags';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_OPTIONS,
  PREPARATION_TIME_OPTIONS,
  IDEA_TYPE_OPTIONS,
} from '@/schemas/idea';

const STEPS = [
  { label: 'Beschreiben', icon: 'edit_note' },
  { label: 'Bearbeiten', icon: 'auto_awesome' },
  { label: 'Vorschau & Speichern', icon: 'visibility' },
] as const;

export default function NewIdeaPage() {
  const navigate = useNavigate();
  const { ideaType: urlIdeaType } = useParams<{ ideaType?: string }>();
  const [step, setStep] = useState(0);

  // Bot protection: honeypot + timestamp
  const [honeyField, setHoneyField] = useState('');
  const loadedAt = useRef(Date.now());

  // Step 1 state
  const [rawText, setRawText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const validTypes = ['idea', 'knowledge'];
  const [ideaType, setIdeaType] = useState(
    urlIdeaType && validTypes.includes(urlIdeaType) ? urlIdeaType : 'idea'
  );

  // Step 2 state (form fields)
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [costsRating, setCostsRating] = useState('');
  const [executionTime, setExecutionTime] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedScoutIds, setSelectedScoutIds] = useState<number[]>([]);
  const [materials, setMaterials] = useState<Array<{ quantity: string; material_name: string; material_unit: string; quantity_type: string }>>([]);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiImageUrls, setAiImageUrls] = useState<string[]>([]);
  const [aiLocation, setAiLocation] = useState('');
  const [aiSeason, setAiSeason] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');

  // APIs
  const refurbish = useRefurbish();
  const improveText = useImproveText();
  const suggestTags = useSuggestTags();
  const generateImage = useGenerateImage();
  const { data: allTags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

  const [saving, setSaving] = useState(false);

  // Step 1 → Step 2: call AI refurbish
  function handleGoToStep2() {
    if (!rawText.trim()) return;
    refurbish.mutate(
      { raw_text: rawText.trim() },
      {
        onSuccess: (data) => {
          setTitle(data.title);
          setSummary(data.summary);
          setDescription(data.description);
          setDifficulty(data.difficulty);
          setCostsRating(data.costs_rating);
          setExecutionTime(data.execution_time);
          setPreparationTime(data.preparation_time);
          setSelectedTagIds(data.suggested_tag_ids);
          setSelectedScoutIds(data.suggested_scout_level_ids ?? []);
          setMaterials(data.suggested_materials ?? []);
          if (data.idea_type && ['idea', 'knowledge'].includes(data.idea_type)) {
            setIdeaType(data.idea_type);
          }
          setAiImageUrl(data.image_url ?? null);
          setAiImageUrls(data.image_urls ?? []);
          setAiLocation(data.location ?? '');
          setAiSeason(data.season ?? '');
          setStep(1);
        },
      },
    );
  }

  // Step 2 → Step 3
  function handleGoToStep3() {
    setStep(2);
  }

  // AI improve field helper
  function handleImprove(field: string, text: string, setter: (v: string) => void) {
    improveText.mutate(
      { text, field },
      { onSuccess: (data) => setter(data.improved_text) },
    );
  }

  // Tag suggest helper
  function handleSuggestTags() {
    suggestTags.mutate(
      { title, description },
      {
        onSuccess: (data) => {
          setSelectedTagIds((prev) => [...new Set([...prev, ...data.tag_ids])]);
        },
      },
    );
  }

  function toggleTag(id: number) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleScoutLevel(id: number) {
    setSelectedScoutIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Save idea
  async function handleSave() {
    // Bot protection: reject if honeypot filled or form submitted too fast
    if (honeyField) return;
    const elapsedSeconds = (Date.now() - loadedAt.current) / 1000;
    if (elapsedSeconds < 5) return;

    setSaving(true);
    const body = {
      title,
      idea_type: ideaType,
      summary,
      description,
      difficulty,
      costs_rating: costsRating,
      execution_time: executionTime,
      preparation_time: preparationTime,
      tag_ids: selectedTagIds,
      scout_level_ids: selectedScoutIds,
      materials,
      website: honeyField,
      form_loaded_at: loadedAt.current,
    };
    const res = await fetch('/api/ideas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      // If we have an AI-generated image, update the idea with it
      if (aiImageUrl) {
        await fetch(`/api/ideas/${data.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: aiImageUrl }),
        });
      }
      setSaving(false);
      navigate(`/idea/${data.slug}`);
    } else {
      setSaving(false);
    }
  }

  // Labels for preview
  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label ?? difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === executionTime)?.label ?? executionTime;
  const costsLabel =
    COSTS_OPTIONS.find((c) => c.value === costsRating)?.label ?? costsRating;
  const prepTimeLabel =
    PREPARATION_TIME_OPTIONS.find((p) => p.value === preparationTime)?.label ?? preparationTime;

  // Group tags for preview
  const selectedTags = allTags?.filter((t) => selectedTagIds.includes(t.id)) ?? [];
  const topicTags = selectedTags.filter((t) => t.parent_id === null);
  const locationTags = selectedTags.filter((t) => t.parent_name === 'Ort');
  const timePeriodTags = selectedTags.filter((t) => t.parent_name === 'Jahreszeit');
  const locationLabel = aiLocation || locationTags.map((t) => t.name).join(', ') || '–';
  const timePeriodLabel = aiSeason || timePeriodTags.map((t) => t.name).join(', ') || '–';
  const selectedScoutLevels =
    scoutLevels?.filter((s) => selectedScoutIds.includes(s.id)) ?? [];

  return (
    <div className="container py-8 max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm font-bold transition-all ${
                  i < step
                    ? 'gradient-primary text-white'
                    : i === step
                    ? 'gradient-primary text-white shadow-glow'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? (
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">check</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{s.icon}</span>
                )}
              </div>
              <span
                className={`mt-1 sm:mt-1.5 text-[10px] sm:text-xs font-medium text-center ${
                  i === step ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 rounded ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Beschreiben ─── */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="text-center">
            <img
              src="/images/inspi_creativ.png"
              alt="Kreativ"
              className="mx-auto h-48 w-auto mb-4"
            />
            <h1 className="text-2xl font-bold mb-2">
              Willkommen beim Hinzufügen einer neuen Heimabend-Idee!
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Viele Pfadfinderinnen und Pfadfinder freuen sich schon über deine Inspiration.
              Beschreibe deine Idee in eigenen Worten – unsere KI erstellt daraus eine
              strukturierte Idee mit Titel, Beschreibung und passenden Tags.
            </p>
          </div>

          {/* Type Selection */}
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-1">Was möchtest du erstellen?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle zuerst den Typ deines Beitrags aus.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {IDEA_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIdeaType(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    ideaType === opt.value
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[32px] ${
                    ideaType === opt.value ? 'text-primary' : 'text-muted-foreground'
                  }`}>{opt.icon}</span>
                  <span className={`font-semibold text-sm ${
                    ideaType === opt.value ? 'text-primary' : 'text-foreground'
                  }`}>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-semibold mb-1">Schritt 1: Beschreibe deine Idee</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Schreibe einfach los! Beschreibe deine Idee so gut du kannst. Es muss nicht
              perfekt sein – die KI hilft dir im nächsten Schritt, alles zu strukturieren.
            </p>
            <textarea
              placeholder="Beschreibe deine Idee in eigenen Worten... z.B. 'Wir machen eine Schnitzeljagd im Wald, bei der die Kinder verschiedene Stationen mit Aufgaben absolvieren müssen...'"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-500 text-[24px] mt-0.5">info</span>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">So funktioniert's:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li><strong>Beschreiben</strong> – Du gibst deine Idee als Freitext ein</li>
                  <li><strong>Bearbeiten</strong> – Die KI füllt das Formular aus, du kannst alles anpassen</li>
                  <li><strong>Vorschau & Speichern</strong> – Du siehst das Ergebnis und speicherst</li>
                </ol>
                <p className="mt-2 text-blue-600 dark:text-blue-400">
                  Nach der Erstellung kannst du noch weitere Informationen hinzufügen oder ändern.
                  Der Heimabend wird erst veröffentlicht, wenn du ihn freigibst.
                  Ein Titelbild lässt sich erst nach der Erstellung hinzufügen. Die Materialliste wird von der KI vorgeschlagen.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Ich habe verstanden</span>
          </label>

          {refurbish.error && (
            <p className="text-destructive text-sm">
              Fehler: {refurbish.error.message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGoToStep2}
              disabled={!rawText.trim() || !acknowledged || refurbish.isPending}
              className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
            >
              {refurbish.isPending ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  KI arbeitet...
                </>
              ) : (
                <>
                  Weiter
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Honeypot field – hidden from real users, bots will fill it */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: 0, overflow: 'hidden' }}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={honeyField}
          onChange={(e) => setHoneyField(e.target.value)}
        />
      </div>

      {/* ─── STEP 2: Bearbeiten ─── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary text-white">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Idee bearbeiten</h1>
              <p className="text-sm text-muted-foreground">
                Die KI hat deine Idee strukturiert. Passe alle Felder nach deinen Wünschen an.
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="bg-card rounded-xl border p-5">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">title</span>
              Titel
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => handleImprove('title', title, setTitle)}
                disabled={!title || improveText.isPending}
                className="flex items-center gap-1 px-3 py-2.5 rounded-lg border text-sm bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 transition-colors text-secondary-foreground"
                title="KI-Verbesserung"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card rounded-xl border p-5">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">short_text</span>
              Zusammenfassung
            </label>
            <div className="flex gap-2">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="flex-1 px-4 py-2.5 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => handleImprove('summary', summary, setSummary)}
                disabled={!summary || improveText.isPending}
                className="flex items-center gap-1 px-3 py-2.5 rounded-lg border text-sm bg-secondary/20 hover:bg-secondary/40 disabled:opacity-50 transition-colors self-start text-secondary-foreground"
                title="KI-Verbesserung"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </button>
            </div>
          </div>

          {/* Description - Rich Text Editor */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                Beschreibung
              </label>
              <button
                type="button"
                onClick={() => handleImprove('description', description, setDescription)}
                disabled={!description || improveText.isPending}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                title="KI-Verbesserung"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                {improveText.isPending ? 'Verbessert...' : 'KI verbessern'}
              </button>
            </div>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Beschreibe die Idee ausführlich..."
            />
          </div>

          {/* Meta selects */}
          <div className="bg-card rounded-xl border p-5">
            <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
              <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
              Kriterien
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Schwierigkeit</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">–</option>
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Kosten</label>
                <select
                  value={costsRating}
                  onChange={(e) => setCostsRating(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">–</option>
                  {COSTS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dauer</label>
                <select
                  value={executionTime}
                  onChange={(e) => setExecutionTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">–</option>
                  {EXECUTION_TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Vorbereitung</label>
                <select
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">–</option>
                  {PREPARATION_TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <span className="material-symbols-outlined text-primary text-[18px]">label</span>
                Tags
              </label>
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={(!title && !description) || suggestTags.isPending}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                {suggestTags.isPending ? 'KI denkt...' : 'Tags vorschlagen'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags?.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>}
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Scout Levels */}
          {scoutLevels && (
            <div className="bg-card rounded-xl border p-5">
              <label className="flex items-center gap-1.5 text-sm font-medium mb-3">
                <span className="material-symbols-outlined text-blue-500 text-[18px]">groups</span>
                Stufen
              </label>
              <div className="flex flex-wrap gap-2">
                {scoutLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => toggleScoutLevel(level.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      selectedScoutIds.includes(level.id)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Zurück
            </button>
            <button
              type="button"
              onClick={handleGoToStep3}
              disabled={!title.trim()}
              className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 transition-all"
            >
              Vorschau
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Vorschau & Speichern ─── */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary text-white">
              <span className="material-symbols-outlined text-[24px]">visibility</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Vorschau</h1>
              <p className="text-sm text-muted-foreground">
                So wird deine Idee aussehen. Überprüfe alles und speichere sie.
              </p>
            </div>
          </div>

          <article className="space-y-6">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h1>

            {/* Hero Image */}
            <div className="relative rounded-xl overflow-hidden shadow-soft group">
              <img
                src={aiImageUrl || '/images/inspi_flying.png'}
                alt={title}
                className="w-full object-cover max-h-96"
              />
              <button
                type="button"
                onClick={() => setImageDialogOpen(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-white/50 text-sm font-medium text-gray-700 hover:bg-white shadow-md transition-all opacity-0 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Bild neu generieren
              </button>
            </div>

            {/* Image Generation Dialog */}
            {imageDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setImageDialogOpen(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      <span className="material-symbols-outlined text-[20px]">image</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Titelbild generieren</h3>
                      <p className="text-sm text-muted-foreground">Ergänze optional eine Beschreibung – der Inhalt deiner Idee wird automatisch mitgesendet</p>
                    </div>
                  </div>

                  <textarea
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="Optional: Zusätzliche Bildbeschreibung, z.B. 'Lagerfeuer mit Marshmallows, Sternenhimmel...'"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setImageDialogOpen(false)}
                      className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      disabled={generateImage.isPending}
                      onClick={() => {
                        generateImage.mutate(
                          {
                            prompt: customImagePrompt.trim() || title,
                            title,
                            summary,
                            description,
                          },
                          {
                            onSuccess: (data) => {
                              setAiImageUrls(data.image_urls);
                            },
                          },
                        );
                      }}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                      {generateImage.isPending ? 'Generiert 4 Bilder...' : '4 Bilder generieren'}
                    </button>
                  </div>

                  {generateImage.error && (
                    <p className="text-sm text-destructive">Fehler: {generateImage.error.message}</p>
                  )}

                  {aiImageUrls.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Wähle ein Bild aus:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {aiImageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setAiImageUrl(url);
                              setImageDialogOpen(false);
                            }}
                            className={`rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg ${
                              aiImageUrl === url
                                ? 'border-purple-500 ring-2 ring-purple-500/30'
                                : 'border-transparent hover:border-purple-300'
                            }`}
                          >
                            <img src={url} alt={`Variante ${idx + 1}`} className="w-full aspect-square object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Info Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {selectedScoutLevels.length > 0 && (
                <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground">groups</span>
                  <span className="text-base font-bold">{selectedScoutLevels.map((s) => s.name).join(', ')}</span>
                  <span className="text-xs text-muted-foreground">Stufe</span>
                </div>
              )}
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">location_on</span>
                <span className="text-base font-bold">{locationLabel}</span>
                <span className="text-xs text-muted-foreground">Ort</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">calendar_month</span>
                <span className="text-base font-bold">{timePeriodLabel}</span>
                <span className="text-xs text-muted-foreground">Zeitraum</span>
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div className="bg-card rounded-xl border p-5">
                <p className="text-lg font-semibold italic">{summary}</p>
              </div>
            )}

            {/* Topic Tags */}
            {topicTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topicTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border-2 border-primary text-primary px-4 py-1.5 text-sm font-medium"
                  >
                    {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>}
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* KPI Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">signal_cellular_alt</span>
                <span className="text-base font-bold">{difficultyLabel || '–'}</span>
                <span className="text-xs text-muted-foreground">Schwierigkeit</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">timer</span>
                <span className="text-base font-bold">{timeLabel || '–'}</span>
                <span className="text-xs text-muted-foreground">Durchführungszeit</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">euro</span>
                <span className="text-base font-bold">{costsLabel || '–'}</span>
                <span className="text-xs text-muted-foreground">Kosten pro Person</span>
              </div>
              <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
                <span className="material-symbols-outlined text-3xl text-muted-foreground">pending_actions</span>
                <span className="text-base font-bold">{prepTimeLabel || '–'}</span>
                <span className="text-xs text-muted-foreground">Vorbereitungszeit</span>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="bg-card rounded-xl border p-6">
                <MarkdownRenderer content={description} />
              </div>
            )}

            {/* Materials */}
            {materials.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                  <span className="material-symbols-outlined text-primary">inventory_2</span>
                  Materialien
                </h2>
                <ul className="space-y-2">
                  {materials.map((m, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-muted-foreground text-[18px]">check_circle</span>
                      {m.quantity && <span className="font-semibold">{m.quantity}</span>}
                      {m.material_unit && <span className="text-muted-foreground">{m.material_unit}</span>}
                      {m.material_name}
                      {m.quantity_type === 'per_person' && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          pro Person
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Zurück bearbeiten
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-8 py-4 gradient-primary text-white rounded-xl text-lg font-semibold hover:shadow-glow disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">save</span>
              {saving ? 'Wird gespeichert...' : 'Idee speichern'}
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Die Idee wird erst veröffentlicht, wenn du sie freigibst.
          </p>
        </div>
      )}
    </div>
  );
}
