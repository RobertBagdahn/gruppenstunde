/**
 * SessionDetailPage — Detail page for a single GroupSession.
 * Supports slug-based routing (/sessions/:slug).
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useSessionBySlug,
  useSessionComments,
  useToggleSessionEmotion,
  useCreateSessionComment,
  useUpdateSession,
  useDeleteSession,
} from '@/api/sessions';
import { useCurrentUser } from '@/api/auth';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_RATING_OPTIONS,
} from '@/schemas/content';
import { SESSION_TYPE_OPTIONS, LOCATION_TYPE_OPTIONS } from '@/schemas/session';
import ContentStatusBadge from '@/components/content/ContentStatusBadge';
import ContentEmotions from '@/components/content/ContentEmotions';
import ContentComments from '@/components/content/ContentComments';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import InlineEditor from '@/components/content/InlineEditor';
import AuthorInfo from '@/components/content/AuthorInfo';
import MaterialList from '@/components/supply/MaterialList';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// Scout level colors
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Woelflinge': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
  'Jungpfadfinder': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  'Pfadfinder': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  'Rover': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700' },
};

function InfoCard({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
      </div>
      <span className="text-sm font-bold text-foreground leading-tight">{label}</span>
      <span className="text-xs font-medium text-muted-foreground">{sublabel}</span>
    </div>
  );
}

export default function SessionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, error, refetch } = useSessionBySlug(slug ?? '');
  const sessionId = session?.id ?? 0;

  const { data: comments = [] } = useSessionComments(sessionId);
  const toggleEmotion = useToggleSessionEmotion(sessionId);
  const createComment = useCreateSessionComment(sessionId);
  const updateSession = useUpdateSession(sessionId);
  const deleteSession = useDeleteSession(sessionId);
  const { data: user } = useCurrentUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useDocumentMeta({
    title: session?.title,
    description: session?.summary,
    url: slug ? `/sessions/${slug}` : undefined,
    image: session?.image_url,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!session) return null;

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === session.difficulty)?.label ?? session.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === session.execution_time)?.label ??
    session.execution_time;
  const costsLabel =
    COSTS_RATING_OPTIONS.find((c) => c.value === session.costs_rating)?.label ??
    session.costs_rating;
  const sessionTypeLabel =
    SESSION_TYPE_OPTIONS.find((s) => s.value === session.session_type)?.label ??
    session.session_type;
  const locationLabel =
    LOCATION_TYPE_OPTIONS.find((l) => l.value === session.location_type)?.label ??
    session.location_type;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteSession.mutate(undefined, {
            onSuccess: () => {
              toast.success('Gruppenstunde geloescht');
              setShowDeleteConfirm(false);
              navigate('/sessions');
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Gruppenstunde loeschen?"
        description="Die Gruppenstunde wird geloescht und ist nicht mehr sichtbar."
        confirmLabel="Loeschen"
        loading={deleteSession.isPending}
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">Startseite</Link>
        <span>/</span>
        <Link to="/sessions" className="hover:text-primary">Gruppenstunden</Link>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{session.title}</span>
        {session.can_delete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            title="Gruppenstunde loeschen"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden sm:inline">Loeschen</span>
          </button>
        )}
      </nav>

      {/* Hero Image */}
      <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg max-w-lg mx-auto aspect-square">
        <img
          src={session.image_url || '/images/inspi_flying.png'}
          alt={session.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ContentStatusBadge status={session.status} />
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-emerald-600 shadow-sm">
              <span className="material-symbols-outlined text-[14px]">groups</span>
              {sessionTypeLabel}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            {session.title}
          </h1>
        </div>
      </div>

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <InfoCard
          icon="schedule"
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          label={timeLabel}
          sublabel="Dauer"
        />
        <InfoCard
          icon="signal_cellular_alt"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label={difficultyLabel}
          sublabel="Schwierigkeit"
        />
        <InfoCard
          icon="payments"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label={costsLabel}
          sublabel="Kosten / Person"
        />
        <InfoCard
          icon="location_on"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label={locationLabel}
          sublabel="Ort"
        />
      </div>

      {/* Participants */}
      {(session.min_participants || session.max_participants) && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>
            {session.min_participants && session.max_participants
              ? `${session.min_participants} – ${session.max_participants} Teilnehmer`
              : session.min_participants
                ? `mind. ${session.min_participants} Teilnehmer`
                : `max. ${session.max_participants} Teilnehmer`}
          </span>
        </div>
      )}

      {/* Scout Levels */}
      {session.scout_levels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {session.scout_levels.map((level) => {
            const colors = SCOUT_LEVEL_COLORS[level.name] ?? {
              bg: 'bg-muted',
              border: 'border-border',
              text: 'text-foreground',
            };
            return (
              <span
                key={level.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${colors.bg} ${colors.border} ${colors.text}`}
              >
                {level.icon && (
                  <span className="material-symbols-outlined text-[14px]">{level.icon}</span>
                )}
                {level.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {session.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {session.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-bold"
            >
              {tag.icon && (
                <span className="material-symbols-outlined text-[14px]">{tag.icon}</span>
              )}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      {session.summary && (
        <InlineEditor
          mode="textarea"
          label="Kurzbeschreibung"
          value={session.summary}
          canEdit={session.can_edit ?? false}
          aiField="summary"
          onSave={(val) => updateSession.mutateAsync({ summary: val })}
          isSaving={updateSession.isPending}
          className="mb-8"
        >
          <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
            <p className="text-base text-foreground leading-relaxed">{session.summary}</p>
          </div>
        </InlineEditor>
      )}

      {/* Description */}
      {session.description && (
        <InlineEditor
          mode="markdown"
          label="Beschreibung"
          value={session.description}
          canEdit={session.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateSession.mutateAsync({ description: val })}
          isSaving={updateSession.isPending}
          className="mb-8"
        >
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={session.description} />
          </div>
        </InlineEditor>
      )}

      {/* Materials */}
      <MaterialList materials={session.materials ?? []} className="mb-8" />

      {/* Authors */}
      <AuthorInfo
        authors={session.authors ?? []}
        createdAt={session.created_at}
        className="mb-8 p-4 bg-muted/30 rounded-xl border border-border/50"
      />

      {/* Emotions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3">Wie findest du diese Gruppenstunde?</h3>
        <ContentEmotions
          emotionCounts={session.emotion_counts ?? {}}
          userEmotion={session.user_emotion ?? null}
          onToggle={(emotionType) => toggleEmotion.mutate({ emotion_type: emotionType })}
          isPending={toggleEmotion.isPending}
        />
      </div>

      {/* Similar Sessions */}
      {(session.similar_sessions?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">Aehnliche Gruppenstunden</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.similar_sessions!.map((similar) => (
              <Link
                key={similar.id}
                to={`/sessions/${similar.slug}`}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {similar.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{similar.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Content */}
      <ContentLinkSection contentType="groupsession" objectId={sessionId} />

      {/* Comments */}
      <div className="border-t border-border pt-8">
        <ContentComments
          comments={comments}
          onSubmit={(data) => createComment.mutate(data)}
          isPending={createComment.isPending}
          isAuthenticated={!!user}
        />
      </div>
    </div>
  );
}
