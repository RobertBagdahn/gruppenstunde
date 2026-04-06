import { useState } from 'react';
import { useRefurbish } from '@/api/ai';
import { useNavigate } from 'react-router-dom';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_OPTIONS,
  PREPARATION_TIME_OPTIONS,
} from '@/schemas/idea';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function RefurbishPage() {
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const refurbish = useRefurbish();
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim()) return;
    refurbish.mutate({ raw_text: rawText.trim() });
  }

  async function handleSave() {
    if (!refurbish.data) return;
    setSaving(true);
    const body = {
      title: refurbish.data.title,
      summary: refurbish.data.summary,
      description: refurbish.data.description,
      difficulty: refurbish.data.difficulty,
      costs_rating: refurbish.data.costs_rating,
      execution_time: refurbish.data.execution_time,
      preparation_time: refurbish.data.preparation_time,
      tag_ids: refurbish.data.suggested_tag_ids,
      scout_level_ids: refurbish.data.suggested_scout_level_ids ?? [],
      materials: (refurbish.data.suggested_materials ?? []).map((m) => ({
        quantity: m.quantity,
        material_name: m.material_name,
        material_unit: m.material_unit,
      })),
    };
    const res = await fetch('/api/ideas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      navigate(`/idea/${data.slug}`);
    }
  }

  const data = refurbish.data;

  const difficultyLabel = data
    ? (DIFFICULTY_OPTIONS.find((d) => d.value === data.difficulty)?.label ?? data.difficulty)
    : '';
  const timeLabel = data
    ? (EXECUTION_TIME_OPTIONS.find((t) => t.value === data.execution_time)?.label ?? data.execution_time)
    : '';
  const costsLabel = data
    ? (COSTS_OPTIONS.find((c) => c.value === data.costs_rating)?.label ?? data.costs_rating)
    : '';
  const prepTimeLabel = data
    ? (PREPARATION_TIME_OPTIONS.find((p) => p.value === data.preparation_time)?.label ?? data.preparation_time)
    : '';

  // Group suggested tags by parent category
  const tags = data?.suggested_tags ?? [];
  const activityTypeTags = tags.filter((t) => t.parent_name === 'Aktivitätstyp');
  const locationTags = tags.filter((t) => t.parent_name === 'Ort');
  const timePeriodTags = tags.filter((t) => t.parent_name === 'Jahreszeit');
  // Only tags without parent are Themen
  const topicTags = tags.filter((t) => t.parent_id === null);

  const activityTypeLabel = activityTypeTags.map((t) => t.name).join(', ') || '';
  const locationLabel = data?.location || locationTags.map((t) => t.name).join(', ') || '–';
  const timePeriodLabel = data?.season || timePeriodTags.map((t) => t.name).join(', ') || '–';

  // Scout level names from suggested IDs
  const SCOUT_LEVEL_NAMES: Record<number, string> = { 1: 'Wölflinge', 2: 'Jungpfadfinder', 3: 'Pfadfinder', 4: 'Rover' };
  const scoutLevelLabel = (data?.suggested_scout_level_ids ?? [])
    .map((id) => SCOUT_LEVEL_NAMES[id])
    .filter(Boolean)
    .join(', ') || 'Für alle';

  return (
    <div className="container py-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <img
          src="/images/inspi_laptop.png"
          alt="Aufbereiten"
          className="w-32 h-32 sm:w-48 sm:h-48 object-contain"
        />
        <h1 className="text-2xl font-bold">Idee aufbereiten</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Füge einen Rohtext ein – die KI erstellt daraus eine strukturierte Idee mit Titel,
        Beschreibung und passenden Tags.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Beschreibe deine Idee in eigenen Worten..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 rounded-lg border bg-background resize-none"
        />
        <button
          type="submit"
          disabled={!rawText.trim() || refurbish.isPending}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {refurbish.isPending ? 'KI arbeitet...' : 'Idee aufbereiten'}
        </button>
      </form>

      {data && (
        <article className="mt-8">
          {/* Activity Type */}
          {activityTypeLabel && (
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{activityTypeLabel}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{data.title}</h1>

          {/* Hero Image */}
          <div className="mt-6 rounded-xl overflow-hidden shadow-soft">
            <img
              src={data.image_url || '/images/inspi_flying.png'}
              alt={data.title}
              className="w-full object-cover max-h-96"
            />
          </div>

          {/* Info Boxes: Altersgruppe, Ort, Zeitraum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">groups</span>
              <span className="text-base font-bold">{scoutLevelLabel}</span>
              <span className="text-xs text-muted-foreground">Altersgruppe</span>
            </div>
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
          {data.summary && (
            <div className="mt-6 bg-card rounded-xl border p-5">
              <p className="text-lg font-semibold italic">{data.summary}</p>
            </div>
          )}

          {/* Themen Tags (only tags without parent) */}
          {topicTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {topicTags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border-2 border-primary text-primary px-4 py-1.5 text-sm font-medium"
                >
                  {tag.icon && <span className="mr-1">{tag.icon}</span>}
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* KPI Boxes: Schwierigkeit, Durchführungszeit, Kosten pro Person, Vorbereitungszeit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">signal_cellular_alt</span>
              <span className="text-base font-bold">{difficultyLabel}</span>
              <span className="text-xs text-muted-foreground">Schwierigkeit</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">timer</span>
              <span className="text-base font-bold">{timeLabel}</span>
              <span className="text-xs text-muted-foreground">Durchführungszeit</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">euro</span>
              <span className="text-base font-bold">{costsLabel}</span>
              <span className="text-xs text-muted-foreground">Kosten pro Person</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1 bg-card rounded-xl border p-5">
              <span className="material-symbols-outlined text-3xl text-muted-foreground">pending_actions</span>
              <span className="text-base font-bold">{prepTimeLabel}</span>
              <span className="text-xs text-muted-foreground">Vorbereitungszeit</span>
            </div>
          </div>

          {/* Description */}
          {data.description && (
            <div className="mt-6 bg-card rounded-xl border p-6">
              <MarkdownRenderer content={data.description} />
            </div>
          )}

          {/* Materials */}
          {(data.suggested_materials ?? []).length > 0 && (
            <section className="mt-6">
              <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
                Materialien
              </h2>
              <ul className="space-y-2">
                {data.suggested_materials!.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-muted-foreground text-[18px]">check_circle</span>
                    {m.quantity && <span className="font-semibold">{m.quantity}</span>}
                    {m.material_name}
                    {m.material_unit && <span className="text-muted-foreground">({m.material_unit})</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Save Button */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 gradient-primary text-white rounded-xl text-lg font-semibold hover:shadow-glow disabled:opacity-50 transition-all"
            >
              <span className="material-symbols-outlined text-[24px]">save</span>
              {saving ? 'Wird gespeichert...' : 'Idee speichern'}
            </button>
          </div>
        </article>
      )}

      {refurbish.error && (
        <p className="mt-4 text-destructive">
          Fehler bei der Aufbereitung: {refurbish.error.message}
        </p>
      )}
    </div>
  );
}
