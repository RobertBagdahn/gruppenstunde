import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIdea, useIdeaBySlug, useComments, useCreateEmotion } from '@/api/ideas';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_OPTIONS,
  PREPARATION_TIME_OPTIONS,
  EMOTION_OPTIONS,
} from '@/schemas/idea';
import CommentSection from '@/components/CommentSection';
import SimilarIdeas from '@/components/SimilarIdeas';

// Scout level colors (Pfadfinder tradition)
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Wölflinge: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  Jungpfadfinder: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  Pfadfinder: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  Rover: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} – Inspi` : 'Inspi – Gruppenstunden-Inspirator';

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute('content', prevDesc);
    };
  }, [title, description]);
}

export default function IdeaPage() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const [personCount, setPersonCount] = useState(6);
  const [materialMultiplier, setMaterialMultiplier] = useState(1);

  // Support both slug-based (/idea/:slug) and legacy ID-based routes
  const slugQuery = useIdeaBySlug(slug ?? '');
  const idQuery = useIdea(!slug && id ? Number(id) : 0);
  const { data: idea, isLoading, error } = slug ? slugQuery : idQuery;

  const ideaId = idea?.id ?? 0;
  const { data: comments } = useComments(ideaId);
  const createEmotion = useCreateEmotion(ideaId);

  useDocumentMeta(idea?.title ?? '', idea?.summary ?? '');

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="container py-8">
        <p className="text-destructive">Idee nicht gefunden.</p>
      </div>
    );
  }

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === idea.difficulty)?.label ?? idea.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === idea.execution_time)?.label ??
    idea.execution_time;
  const costsLabel =
    COSTS_OPTIONS.find((c) => c.value === idea.costs_rating)?.label ?? idea.costs_rating;
  const prepTimeLabel =
    PREPARATION_TIME_OPTIONS.find((p) => p.value === idea.preparation_time)?.label ??
    idea.preparation_time;

  // Derive scout level names for the info row
  const scoutLevelNames = idea.scout_levels.map((l) => l.name).join(', ') || 'Für alle';

  // Group tags by parent category
  const activityTypeTags = idea.tags.filter((t) => t.parent_name === 'Aktivitätstyp');
  const locationTags = idea.tags.filter((t) => t.parent_name === 'Ort');
  const timePeriodTags = idea.tags.filter((t) => t.parent_name === 'Jahreszeit');
  // Themen tags are children of the "Themen" parent
  const topicTags = idea.tags.filter((t) => t.parent_name === 'Themen');

  const activityTypeLabel = activityTypeTags.map((t) => t.name).join(', ') || '';
  const locationLabel = locationTags.map((t) => t.name).join(', ') || '–';
  const timePeriodLabel = timePeriodTags.map((t) => t.name).join(', ') || '–';

  return (
    <article className="container py-8 max-w-3xl">
      {/* Activity Type */}
      {activityTypeLabel && (
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{activityTypeLabel}</p>
      )}
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{idea.title}</h1>

      {/* Hero Image */}
      <div className="mt-6 rounded-xl overflow-hidden shadow-soft">
        <img
          src={idea.image_url || '/images/inspi_flying.png'}
          alt={idea.title}
          className="w-full object-cover max-h-96"
        />
      </div>

      {/* Info Boxes: Altersgruppe, Ort, Zeitraum, Views */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        {idea.scout_levels.length > 0 ? (
          <div className="flex flex-col items-center text-center gap-2 bg-amber-50 rounded-xl border border-amber-200 p-5">
            <span className="material-symbols-outlined text-3xl text-amber-600">groups</span>
            <div className="flex flex-wrap justify-center gap-1">
              {idea.scout_levels.map((level) => {
                const colors = SCOUT_LEVEL_COLORS[level.name] ?? { bg: 'bg-muted', border: 'border-border', text: 'text-foreground' };
                return (
                  <span
                    key={level.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.bg} ${colors.border} ${colors.text} border`}
                  >
                    {level.name}
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1 bg-amber-50 rounded-xl border border-amber-200 p-5">
            <span className="material-symbols-outlined text-3xl text-amber-600">groups</span>
            <span className="text-base font-bold">Für alle</span>
            <span className="text-xs text-muted-foreground">Altersgruppe</span>
          </div>
        )}
        <div className="flex flex-col items-center text-center gap-1 bg-emerald-50 rounded-xl border border-emerald-200 p-5">
          <span className="material-symbols-outlined text-3xl text-emerald-600">location_on</span>
          <span className="text-base font-bold">{locationLabel}</span>
          <span className="text-xs text-muted-foreground">Ort</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-sky-50 rounded-xl border border-sky-200 p-5">
          <span className="material-symbols-outlined text-3xl text-sky-600">calendar_month</span>
          <span className="text-base font-bold">{timePeriodLabel}</span>
          <span className="text-xs text-muted-foreground">Zeitraum</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-violet-50 rounded-xl border border-violet-200 p-5">
          <span className="material-symbols-outlined text-3xl text-violet-600">visibility</span>
          <span className="text-base font-bold">{idea.view_count}</span>
          <span className="text-xs text-muted-foreground">Aufrufe</span>
        </div>
      </div>

      {/* Summary */}
      {idea.summary && (
        <div className="mt-6 bg-card rounded-xl border p-5">
          <p className="text-lg font-semibold italic" dangerouslySetInnerHTML={{ __html: idea.summary }} />
        </div>
      )}

      {/* Authors */}
      {idea.authors && idea.authors.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <span className="material-symbols-outlined text-[18px]">person</span>
            {idea.authors.length === 1 ? 'Autor' : 'Autoren'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {idea.authors.map((author, idx) => {
              const inner = (
                <div className="flex items-center gap-3">
                  {author.profile_picture_url ? (
                    <img
                      src={author.profile_picture_url}
                      alt={author.display_name}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 border flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{author.display_name}</span>
                </div>
              );

              if (author.is_registered && author.id) {
                return (
                  <Link
                    key={author.id}
                    to={`/user/${author.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={idx} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Themen Tag Cloud */}
      {topicTags.length > 0 && (
        <section className="mt-6 bg-card rounded-xl border p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            <span className="material-symbols-outlined text-[18px]">label</span>
            Themen
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {topicTags.map((tag, idx) => {
              const colors = [
                'bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-white',
                'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white',
                'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-600 hover:text-white',
                'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white',
                'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white',
                'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-600 hover:text-white',
                'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-600 hover:text-white',
                'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white',
              ];
              const sizes = ['text-sm px-3 py-1', 'text-base px-4 py-1.5', 'text-lg px-5 py-2'];
              const sizeIdx = (tag.name.length + idx) % sizes.length;
              const colorIdx = idx % colors.length;
              return (
                <Link
                  key={tag.id}
                  to={`/search?tag_slugs=${tag.slug}`}
                  className={`rounded-full border font-medium transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-105 ${sizes[sizeIdx]} ${colors[colorIdx]}`}
                >
                  {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1 align-middle">{tag.icon}</span>}
                  {tag.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* KPI Boxes: Schwierigkeit, Durchführungszeit, Kosten pro Person, Vorbereitungszeit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div className="flex flex-col items-center text-center gap-1 bg-rose-50 rounded-xl border border-rose-200 p-5">
          <span className="material-symbols-outlined text-3xl text-rose-600">signal_cellular_alt</span>
          <span className="text-base font-bold">{difficultyLabel}</span>
          <span className="text-xs text-muted-foreground">Schwierigkeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-teal-50 rounded-xl border border-teal-200 p-5">
          <span className="material-symbols-outlined text-3xl text-teal-600">timer</span>
          <span className="text-base font-bold">{timeLabel}</span>
          <span className="text-xs text-muted-foreground">Durchführungszeit</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-yellow-50 rounded-xl border border-yellow-200 p-5">
          <span className="material-symbols-outlined text-3xl text-yellow-600">euro</span>
          <span className="text-base font-bold">{costsLabel}</span>
          <span className="text-xs text-muted-foreground">Kosten pro Person</span>
        </div>
        <div className="flex flex-col items-center text-center gap-1 bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <span className="material-symbols-outlined text-3xl text-indigo-600">pending_actions</span>
          <span className="text-base font-bold">{prepTimeLabel}</span>
          <span className="text-xs text-muted-foreground">Vorbereitungszeit</span>
        </div>
      </div>

      {/* Description */}
      {idea.description && (
        <div
          className="prose prose-green max-w-none mt-6 bg-card rounded-xl border p-6"
          dangerouslySetInnerHTML={{ __html: idea.description }}
        />
      )}

      {/* Materials */}
      <section className="mt-8 bg-card rounded-xl border p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-primary">inventory_2</span>
          Materialien
        </h2>

        {idea.materials.length === 0 ? (
          <p className="text-muted-foreground italic">Kein Material nötig</p>
        ) : (
          <>
          {/* Multiplier */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
            <span className="material-symbols-outlined text-muted-foreground">close</span>
            <span className="text-sm font-medium">Anzahl:</span>
            <button
              onClick={() => setMaterialMultiplier(Math.max(1, materialMultiplier - 1))}
              className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <input
              type="number"
              min={1}
              max={999}
              value={materialMultiplier}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1) setMaterialMultiplier(v);
              }}
              className="w-16 h-8 text-center rounded-lg border bg-background text-sm font-bold"
            />
            <button
              onClick={() => setMaterialMultiplier(materialMultiplier + 1)}
              className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>

          {/* Person count adjuster */}
          {idea.materials.some((m) => m.quantity_type === 'per_person') && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
              <span className="material-symbols-outlined text-muted-foreground">groups</span>
              <span className="text-sm font-medium">Personenanzahl:</span>
              <button
                onClick={() => setPersonCount(Math.max(1, personCount - 1))}
                className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={personCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setPersonCount(v);
                }}
                className="w-16 h-8 text-center rounded-lg border bg-background text-sm font-bold"
              />
              <button
                onClick={() => setPersonCount(personCount + 1)}
                className="w-8 h-8 rounded-lg border bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          )}

          <ul className="space-y-2">
            {idea.materials.map((m) => {
              const isPerPerson = m.quantity_type === 'per_person';
              const rawQty = parseFloat(m.quantity);
              const baseQty = isPerPerson && !isNaN(rawQty)
                ? rawQty * personCount
                : rawQty;
              const calculatedQty = !isNaN(baseQty)
                ? (baseQty * materialMultiplier).toString().replace(/\.?0+$/, '')
                : m.quantity;

              const materialContent = (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-muted-foreground text-[18px]">check_circle</span>
                  {calculatedQty && <span className="font-semibold">{calculatedQty}</span>}
                  {m.material_unit && <span className="text-muted-foreground">{m.material_unit}</span>}
                  {m.material_name_slug ? (
                    <Link
                      to={`/material/${m.material_name_slug}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {m.material_name}
                    </Link>
                  ) : (
                    <span>{m.material_name}</span>
                  )}
                  {isPerPerson && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      pro Person
                    </span>
                  )}
                </li>
              );
              return materialContent;
            })}
          </ul>
          </>
        )}
      </section>

      {/* Emotions */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-accent">mood</span>
          Wie findest du diese Idee?
        </h2>
        <div className="flex gap-3">
          {EMOTION_OPTIONS.map((opt) => {
            const count = idea.emotion_counts?.[opt.value] ?? 0;
            const isSelected = idea.user_emotion === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => createEmotion.mutate({ emotion_type: opt.value })}
                disabled={createEmotion.isPending}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border cursor-pointer hover:border-primary hover:shadow-glow active:scale-95 transition-all ${
                  isSelected
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                    : 'bg-card'
                }`}
              >
                <span className={`text-3xl ${createEmotion.isPending ? 'opacity-50' : ''}`}>{opt.emoji}</span>
                <span className="text-xs font-medium text-muted-foreground">{opt.label}</span>
                {count > 0 && (
                  <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Similar Ideas */}
      <SimilarIdeas ideaId={ideaId} />

      {/* Comments */}
      <CommentSection ideaId={ideaId} comments={comments} />
    </article>
  );
}
