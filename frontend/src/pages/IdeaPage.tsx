import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useIdea, useIdeaBySlug, useComments, useCreateEmotion, useUpdateIdea } from '@/api/ideas';
import { useGenerateImage } from '@/api/ai';
import { useTags, useScoutLevels } from '@/api/tags';
import type { IdeaDetail } from '@/schemas/idea';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_OPTIONS,
  PREPARATION_TIME_OPTIONS,
  EMOTION_OPTIONS,
} from '@/schemas/idea';
import CommentSection from '@/components/CommentSection';
import SimilarIdeas from '@/components/SimilarIdeas';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MarkdownEditor from '@/components/MarkdownEditor';
import { exportToPdf } from '@/lib/pdfExport';
import ErrorDisplay from '@/components/ErrorDisplay';
import { toast } from 'sonner';

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

// Reusable info card with colored circle icon
function InfoCard({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  children,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label?: string;
  sublabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
      </div>
      {children ?? <span className="text-sm font-bold text-foreground leading-tight">{label}</span>}
      <span className="text-xs font-medium text-muted-foreground">{sublabel}</span>
    </div>
  );
}

// Edit button for owner inline editing
function EditButton({ onClick, editing }: { onClick: () => void; editing?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
        editing
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{editing ? 'close' : 'edit'}</span>
      {editing ? 'Abbrechen' : 'Bearbeiten'}
    </button>
  );
}

export default function IdeaPage() {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const navigate = useNavigate();
  const [personCount, setPersonCount] = useState(6);
  const [materialMultiplier, setMaterialMultiplier] = useState(1);
  const [exporting, setExporting] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Support both slug-based (/idea/:slug) and legacy ID-based routes
  const slugQuery = useIdeaBySlug(slug ?? '');
  const idQuery = useIdea(!slug && id ? Number(id) : 0);
  const activeQuery = slug ? slugQuery : idQuery;
  const idea = activeQuery.data as IdeaDetail | undefined;
  const { isLoading, error } = activeQuery;

  const ideaId = idea?.id ?? 0;
  const { data: comments } = useComments(ideaId);
  const createEmotion = useCreateEmotion(ideaId);
  const updateIdea = useUpdateIdea(ideaId);
  const generateImage = useGenerateImage();
  const { data: allTags } = useTags();
  const { data: allScoutLevels } = useScoutLevels();

  // Inline editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [editCostsRating, setEditCostsRating] = useState('');
  const [editExecutionTime, setEditExecutionTime] = useState('');
  const [editPreparationTime, setEditPreparationTime] = useState('');
  const [editTagIds, setEditTagIds] = useState<number[]>([]);
  const [editScoutLevelIds, setEditScoutLevelIds] = useState<number[]>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [customImagePrompt, setCustomImagePrompt] = useState('');
  const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);

  function startEditing(section: string) {
    if (!idea) return;
    setEditTitle(idea.title);
    setEditSummary(idea.summary);
    setEditDescription(idea.description);
    setEditDifficulty(idea.difficulty);
    setEditCostsRating(idea.costs_rating);
    setEditExecutionTime(idea.execution_time);
    setEditPreparationTime(idea.preparation_time);
    setEditTagIds(idea.tags.map((t) => t.id));
    setEditScoutLevelIds(idea.scout_levels.map((s) => s.id));
    setEditingSection(section);
  }

  function cancelEditing() {
    setEditingSection(null);
  }

  function saveField(payload: Record<string, unknown>) {
    updateIdea.mutate(payload as any, {
      onSuccess: () => {
        toast.success('Gespeichert');
        setEditingSection(null);
        activeQuery.refetch();
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  useDocumentMeta(idea?.title ?? '', idea?.summary ?? '');

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-6">
          <div className="h-72 bg-muted rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="container py-8">
        <ErrorDisplay
          error={error}
          title="Idee nicht gefunden"
          onRetry={() => activeQuery.refetch()}
          onBack={() => navigate(-1)}
          backLabel="Zurueck"
        />
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

  // Group tags by parent category
  const activityTypeTags = idea.tags.filter((t) => t.parent_name === 'Aktivitätstyp');
  const locationTags = idea.tags.filter((t) => t.parent_name === 'Ort');
  const timePeriodTags = idea.tags.filter((t) => t.parent_name === 'Jahreszeit');
  const topicTags = idea.tags.filter((t) => t.parent_name === 'Themen');

  const activityTypeLabel = activityTypeTags.map((t) => t.name).join(', ') || '';
  const locationLabel = locationTags.map((t) => t.name).join(', ') || '–';
  const timePeriodLabel = timePeriodTags.map((t) => t.name).join(', ') || '–';

  const isKnowledge = idea.idea_type === 'knowledge';

  return (
    <article className="container py-6 max-w-3xl space-y-6">
      {/* ═══════════════════════════════════════════
          HERO: Title overlay on image
          ═══════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg group">
        {/* Title bar overlay */}
        <div className="relative z-10 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-center">
          {editingSection === 'title' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-foreground text-lg font-bold"
              />
              <button onClick={() => saveField({ title: editTitle })} disabled={updateIdea.isPending} className="px-3 py-2 bg-white rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">
                {updateIdea.isPending ? '...' : 'Speichern'}
              </button>
              <button onClick={cancelEditing} className="px-3 py-2 bg-white/50 rounded-lg text-sm font-medium text-white hover:bg-white/70">
                Abbrechen
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {idea.title}
              </h1>
              {activityTypeLabel && (
                <p className="text-blue-100 text-sm font-medium mt-1">{activityTypeLabel}</p>
              )}
              {idea.can_edit && (
                <button onClick={() => startEditing('title')} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition-colors opacity-0 group-hover:opacity-100">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Hero image */}
        <img
          src={idea.image_url || '/images/inspi_flying.png'}
          alt={idea.title}
          className="w-full object-cover h-52 sm:h-64 md:h-80"
        />

        {/* Buttons overlay */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
          {idea.can_edit && (
            <button
              onClick={() => setImageDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-white/50 text-sm font-medium text-gray-700 hover:bg-white shadow-md transition-all opacity-0 group-hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="hidden sm:inline">Bild generieren</span>
            </button>
          )}
          <button
            onClick={async () => {
              setExporting(true);
              try {
                await exportToPdf({
                  title: idea.title,
                  element: pdfContentRef.current ?? undefined,
                });
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-white/50 text-sm font-medium text-gray-700 hover:bg-white shadow-md transition-all disabled:opacity-50"
            title="Als PDF exportieren"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            <span className="hidden sm:inline">{exporting ? 'Exportiert...' : 'PDF'}</span>
          </button>
        </div>
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
                <p className="text-sm text-muted-foreground">Ergänze optional eine Beschreibung – der Inhalt der Idee wird automatisch mitgesendet</p>
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
              <button type="button" onClick={() => setImageDialogOpen(false)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                Abbrechen
              </button>
              <button
                type="button"
                disabled={generateImage.isPending}
                onClick={() => {
                  generateImage.mutate(
                    {
                      prompt: customImagePrompt.trim() || idea.title,
                      title: idea.title,
                      summary: idea.summary,
                      description: idea.description,
                    },
                    {
                      onSuccess: (data) => {
                        setGeneratedImageUrls(data.image_urls);
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

            {generatedImageUrls.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Wähle ein Bild aus:</p>
                <div className="grid grid-cols-2 gap-3">
                  {generatedImageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        saveField({ image_url: url });
                        setImageDialogOpen(false);
                        setCustomImagePrompt('');
                        setGeneratedImageUrls([]);
                      }}
                      className={`rounded-xl overflow-hidden border-2 transition-all hover:shadow-lg ${
                        idea.image_url === url
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

      {/* PDF-exportable content wrapper */}
      <div ref={pdfContentRef} data-pdf-content className="space-y-6">

      {/* ═══════════════════════════════════════════
          INFO CARDS: Altersgruppe, Ort, Zeitraum, Views
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard
          icon="groups"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          sublabel="Altersgruppe"
        >
          {idea.scout_levels.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {idea.scout_levels.map((level) => {
                const colors = SCOUT_LEVEL_COLORS[level.name] ?? {
                  bg: 'bg-muted',
                  border: 'border-border',
                  text: 'text-foreground',
                };
                return (
                  <span
                    key={level.id}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.border} ${colors.text} border`}
                  >
                    {level.name}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-sm font-bold text-foreground">Für alle</span>
          )}
        </InfoCard>

        <InfoCard
          icon="calendar_month"
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={locationLabel}
          sublabel="Ort"
        />

        <InfoCard
          icon="location_on"
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label={timePeriodLabel}
          sublabel="Zeitraum"
        />

        <InfoCard
          icon="visibility"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label={String(idea.view_count)}
          sublabel="Views"
        />
      </div>

      {/* ═══════════════════════════════════════════
          SUMMARY: Colored blockquote
          ═══════════════════════════════════════════ */}
      {(idea.summary || idea.can_edit) && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zusammenfassung</span>
            {idea.can_edit && <EditButton onClick={() => editingSection === 'summary' ? cancelEditing() : startEditing('summary')} editing={editingSection === 'summary'} />}
          </div>
          {editingSection === 'summary' ? (
            <div className="space-y-3">
              <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <button onClick={() => saveField({ summary: editSummary })} disabled={updateIdea.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {updateIdea.isPending ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          ) : idea.summary ? (
            <div className="border-l-4 border-amber-400 pl-4">
              <MarkdownRenderer content={idea.summary} className="text-base sm:text-lg font-semibold italic text-gray-700 leading-relaxed" />
            </div>
          ) : null}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          AUTHORS
          ═══════════════════════════════════════════ */}
      {idea.authors && idea.authors.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-500 text-[20px]">person</span>
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
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={idx} className="flex items-center gap-3 rounded-xl px-3 py-2">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          TOPIC TAGS
          ═══════════════════════════════════════════ */}
      {(topicTags.length > 0 || idea.can_edit) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">label</span>
              Themen
            </h2>
            {idea.can_edit && <EditButton onClick={() => editingSection === 'tags' ? cancelEditing() : startEditing('tags')} editing={editingSection === 'tags'} />}
          </div>
          {editingSection === 'tags' && allTags ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button key={tag.id} type="button" onClick={() => setEditTagIds((prev) => prev.includes(tag.id) ? prev.filter((x) => x !== tag.id) : [...prev, tag.id])}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${editTagIds.includes(tag.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-background hover:bg-muted'}`}>
                    {tag.icon && <span className="material-symbols-outlined text-[14px] mr-1">{tag.icon}</span>}
                    {tag.name}
                  </button>
                ))}
              </div>
              <button onClick={() => saveField({ tag_ids: editTagIds })} disabled={updateIdea.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {updateIdea.isPending ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {topicTags.map((tag, idx) => {
              const colorSets = [
                'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
                'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
                'bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200',
                'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
                'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
                'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200',
                'bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200',
                'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
              ];
              const colorIdx = idx % colorSets.length;
              return (
                <Link
                  key={tag.id}
                  to={`/search?tag_slugs=${tag.slug}`}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-all duration-200 cursor-pointer hover:shadow-sm ${colorSets[colorIdx]}`}
                >
                  {tag.icon && (
                    <span className="material-symbols-outlined text-[14px] mr-1 align-middle">
                      {tag.icon}
                    </span>
                  )}
                  {tag.name}
                </Link>
              );
            })}
          </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          KPI CARDS: Schwierigkeit, Zeit, Kosten, Vorbereitung
          ═══════════════════════════════════════════ */}
      {editingSection === 'kpi' ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details bearbeiten</h2>
            <EditButton onClick={cancelEditing} editing />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Schwierigkeit</label>
              <select value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                {DIFFICULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Durchführungszeit</label>
              <select value={editExecutionTime} onChange={(e) => setEditExecutionTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                {EXECUTION_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kosten</label>
              <select value={editCostsRating} onChange={(e) => setEditCostsRating(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                {COSTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vorbereitungszeit</label>
              <select value={editPreparationTime} onChange={(e) => setEditPreparationTime(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                {PREPARATION_TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {idea.can_edit && allScoutLevels && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Stufen</label>
              <div className="flex flex-wrap gap-2">
                {allScoutLevels.map((level) => (
                  <button key={level.id} type="button" onClick={() => setEditScoutLevelIds((prev) => prev.includes(level.id) ? prev.filter((x) => x !== level.id) : [...prev, level.id])}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${editScoutLevelIds.includes(level.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-background hover:bg-muted'}`}>
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => saveField({ difficulty: editDifficulty, costs_rating: editCostsRating, execution_time: editExecutionTime, preparation_time: editPreparationTime, scout_level_ids: editScoutLevelIds })} disabled={updateIdea.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {updateIdea.isPending ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      ) : (
        <div className="relative">
          {idea.can_edit && (
            <div className="absolute -top-2 right-0 z-10">
              <EditButton onClick={() => startEditing('kpi')} />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard
          icon="signal_cellular_alt"
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label={difficultyLabel}
          sublabel="Schwierigkeit"
        />
        <InfoCard
          icon="timer"
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
          label={timeLabel}
          sublabel="Durchführungszeit"
        />
        <InfoCard
          icon="euro"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          label={costsLabel}
          sublabel="Kosten pro Person"
        />
        <InfoCard
          icon="pending_actions"
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          label={prepTimeLabel}
          sublabel="Vorbereitungszeit"
        />
      </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          DESCRIPTION
          ═══════════════════════════════════════════ */}
      {(idea.description || idea.can_edit) && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <span className="material-symbols-outlined text-blue-500">description</span>
              {isKnowledge ? 'Inhalt' : 'Durchführung'}
            </h2>
            {idea.can_edit && <EditButton onClick={() => editingSection === 'description' ? cancelEditing() : startEditing('description')} editing={editingSection === 'description'} />}
          </div>
          {editingSection === 'description' ? (
            <div className="space-y-3">
              <MarkdownEditor value={editDescription} onChange={setEditDescription} placeholder="Beschreibung..." />
              <button onClick={() => saveField({ description: editDescription })} disabled={updateIdea.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {updateIdea.isPending ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          ) : idea.description ? (
            <MarkdownRenderer content={idea.description} />
          ) : (
            <p className="text-muted-foreground italic">Noch keine Beschreibung vorhanden.</p>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════
          MATERIALS (only for idea type, not knowledge)
          ═══════════════════════════════════════════ */}
      {!isKnowledge && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
            <span className="material-symbols-outlined text-amber-500">inventory_2</span>
            Materialien
          </h2>

          {idea.materials.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground bg-gray-50 rounded-xl p-4">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
              <p className="italic">Kein Material nötig – einfach loslegen!</p>
            </div>
          ) : (
            <>
              {/* Multiplier */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="material-symbols-outlined text-blue-400">close</span>
                <span className="text-sm font-medium text-blue-800">Anzahl:</span>
                <button
                  onClick={() => setMaterialMultiplier(Math.max(1, materialMultiplier - 1))}
                  className="w-8 h-8 rounded-lg border border-blue-200 bg-white flex items-center justify-center hover:bg-blue-100 transition-colors"
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
                  className="w-16 h-8 text-center rounded-lg border border-blue-200 bg-white text-sm font-bold"
                />
                <button
                  onClick={() => setMaterialMultiplier(materialMultiplier + 1)}
                  className="w-8 h-8 rounded-lg border border-blue-200 bg-white flex items-center justify-center hover:bg-blue-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>

              {/* Person count adjuster */}
              {idea.materials.some((m) => m.quantity_type === 'per_person') && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="material-symbols-outlined text-purple-400">groups</span>
                  <span className="text-sm font-medium text-purple-800">Personenanzahl:</span>
                  <button
                    onClick={() => setPersonCount(Math.max(1, personCount - 1))}
                    className="w-8 h-8 rounded-lg border border-purple-200 bg-white flex items-center justify-center hover:bg-purple-100 transition-colors"
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
                    className="w-16 h-8 text-center rounded-lg border border-purple-200 bg-white text-sm font-bold"
                  />
                  <button
                    onClick={() => setPersonCount(personCount + 1)}
                    className="w-8 h-8 rounded-lg border border-purple-200 bg-white flex items-center justify-center hover:bg-purple-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              )}

              <ul className="space-y-2">
                {idea.materials.map((m) => {
                  const isPerPerson = m.quantity_type === 'per_person';
                  const rawQty = parseFloat(m.quantity);
                  const baseQty =
                    isPerPerson && !isNaN(rawQty) ? rawQty * personCount : rawQty;
                  const calculatedQty = !isNaN(baseQty)
                    ? (baseQty * materialMultiplier).toString().replace(/\.?0+$/, '')
                    : m.quantity;

                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-emerald-500 text-[20px]">
                        check_circle
                      </span>
                      {calculatedQty && (
                        <span className="font-bold text-foreground">{calculatedQty}</span>
                      )}
                      {m.material_unit && (
                        <span className="text-muted-foreground">{m.material_unit}</span>
                      )}
                      {m.material_name_slug ? (
                        <Link
                          to={`/material/${m.material_name_slug}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {m.material_name}
                        </Link>
                      ) : (
                        <span className="text-foreground">{m.material_name}</span>
                      )}
                      {isPerPerson && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full font-medium">
                          pro Person
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {/* End PDF content wrapper */}
      </div>

      {/* ═══════════════════════════════════════════
          EMOTIONS
          ═══════════════════════════════════════════ */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-4">
          <span className="material-symbols-outlined text-rose-400">mood</span>
          Wie findest du diese Idee?
        </h2>
        <div className="flex flex-wrap gap-3">
          {EMOTION_OPTIONS.map((opt) => {
            const count = idea.emotion_counts?.[opt.value] ?? 0;
            const isSelected = idea.user_emotion === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => createEmotion.mutate({ emotion_type: opt.value })}
                disabled={createEmotion.isPending}
                className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span
                  className={`text-3xl ${createEmotion.isPending ? 'opacity-50' : ''}`}
                >
                  {opt.emoji}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{opt.label}</span>
                {count > 0 && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
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
