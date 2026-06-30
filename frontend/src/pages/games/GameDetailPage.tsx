/**
 * GameDetailPage — Detail page for a single Game.
 * Supports slug-based routing (/games/:slug).
 * Features: rules section, player count, play area, materials, duration.
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { EntityLink } from '@/components/shared/EntityLink';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import {
  useGameBySlug,
  useGameComments,
  useToggleGameEmotion,
  useCreateGameComment,
  useUpdateGame,
  useDeleteGame,
  useUploadGameImage,
  useDeleteGameImage,
  useSetGameImageFromUrl,
} from '@/api/games';
import { useCurrentUser } from '@/api/auth';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
} from '@/schemas/content';
import { GAME_TYPE_OPTIONS, PLAY_AREA_OPTIONS } from '@/schemas/game';
import ContentStatusBadge from '@/components/content/ContentStatusBadge';
import ContentEmotions from '@/components/content/ContentEmotions';
import ContentComments from '@/components/content/ContentComments';
import { ContentLinkSection } from '@/components/content/ContentLinkSection';
import InlineEditor from '@/components/content/InlineEditor';
import ContentAuthorSection from '@/components/content/ContentAuthorSection';
import MaterialList from '@/components/supply/MaterialList';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import Breadcrumb from '@/components/Breadcrumb';
import TitleImageEditor from '@/components/content/TitleImageEditor';
import { toast } from 'sonner';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

// Scout level colors
const SCOUT_LEVEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Wölflinge': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700' },
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
  label: string | null;
  sublabel: string;
}) {
  if (label === null) return null;
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

function formatPlayerCount(min: number | null, max: number | null): string {
  if (min && max) return `${min} – ${max}`;
  if (min) return `mind. ${min}`;
  if (max) return `max. ${max}`;
  return 'Beliebig';
}

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: game, isLoading, error, refetch } = useGameBySlug(slug ?? '');
  const gameId = game?.id ?? 0;

  const { data: comments = [] } = useGameComments(gameId);
  const toggleEmotion = useToggleGameEmotion(gameId);
  const createComment = useCreateGameComment(gameId);
  const updateGame = useUpdateGame(gameId);
  const deleteGame = useDeleteGame(gameId);
  const uploadImage = useUploadGameImage(gameId);
  const deleteImage = useDeleteGameImage(gameId);
  const setImageFromUrl = useSetGameImageFromUrl(gameId);
  const { data: user } = useCurrentUser();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useDocumentMeta({
    title: game?.title,
    description: game?.summary,
    url: slug ? `/games/${slug}` : undefined,
    image: game?.image_url,
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

  if (!game) return null;

  const difficultyLabel =
    DIFFICULTY_OPTIONS.find((d) => d.value === game.difficulty)?.label ?? game.difficulty;
  const timeLabel =
    EXECUTION_TIME_OPTIONS.find((t) => t.value === game.execution_time)?.label ??
    game.execution_time;
  const costsLabel = null;
  const gameTypeLabel =
    GAME_TYPE_OPTIONS.find((g) => g.value === game.game_type)?.label ??
    game.game_type;
  const playAreaLabel =
    PLAY_AREA_OPTIONS.find((p) => p.value === game.play_area)?.label ??
    game.play_area;

  return (
    <EntityLinkContext.Provider value="detail">
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deleteGame.mutate(undefined, {
            onSuccess: () => {
              toast.success('Spiel gelöscht');
              setShowDeleteConfirm(false);
              navigate('/games');
            },
            onError: (err) => {
              toast.error('Fehler beim Löschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Spiel löschen?"
        description="Das Spiel wird gelöscht und ist nicht mehr sichtbar."
        confirmLabel="Löschen"
        loading={deleteGame.isPending}
      />

      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Startseite', href: '/' },
          { label: 'Spiele', href: '/games' },
          { label: game.title },
        ]}
        action={game.can_delete ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
            title="Spiel löschen"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="hidden sm:inline">Löschen</span>
          </button>
        ) : undefined}
      />

      {/* Hero Image */}
      <TitleImageEditor
        contentType="game"
        imageUrl={game.image_url}
        canEdit={game.can_edit}
        title={game.title}
        summary={game.summary}
        fallbackImage="/images/inspi_flying.png"
        uploadMutation={uploadImage}
        deleteMutation={deleteImage}
        setFromUrlMutation={setImageFromUrl}
      >
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <ContentStatusBadge status={game.status} />
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-orange-600 shadow-sm">
              <span className="material-symbols-outlined text-[14px]">sports_esports</span>
              {gameTypeLabel}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
            {game.title}
          </h1>
        </div>
      </TitleImageEditor>

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <InfoCard
          icon="group"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label={formatPlayerCount(game.min_players, game.max_players)}
          sublabel="Spieler"
        />
        <InfoCard
          icon="timer"
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          label={game.game_duration_minutes ? `${game.game_duration_minutes} Min.` : timeLabel}
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
          sublabel="Kosten"
        />
        <InfoCard
          icon="location_on"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label={playAreaLabel}
          sublabel="Spielort"
        />
      </div>

      {/* Scout Levels */}
      {game.scout_levels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {game.scout_levels.map((level) => {
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
      {game.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {game.tags.map((tag) => (
            <EntityLink
              key={tag.id}
              type="tag"
              slug={tag.slug}
              name={tag.name}
              variant="chip"
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {game.summary && (
        <InlineEditor
          mode="textarea"
          label="Kurzbeschreibung"
          value={game.summary}
          canEdit={game.can_edit ?? false}
          aiField="summary"
          onSave={(val) => updateGame.mutateAsync({ summary: val })}
          isSaving={updateGame.isPending}
          className="mb-8"
        >
          <div className="bg-muted/30 rounded-xl border border-border/50 p-5">
            <p className="text-base text-foreground leading-relaxed">{game.summary}</p>
          </div>
        </InlineEditor>
      )}

      {/* Description */}
      {game.description && (
        <InlineEditor
          mode="markdown"
          label="Beschreibung"
          value={game.description}
          canEdit={game.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateGame.mutateAsync({ description: val })}
          isSaving={updateGame.isPending}
          className="mb-8"
        >
          <div className="prose prose-sm max-w-none">
            <h2 className="text-lg font-bold mb-3">Beschreibung</h2>
            <MarkdownRenderer content={game.description} />
          </div>
        </InlineEditor>
      )}

      {/* Rules */}
      {game.rules && (
        <InlineEditor
          mode="markdown"
          label="Spielregeln"
          value={game.rules}
          canEdit={game.can_edit ?? false}
          aiField="description"
          onSave={(val) => updateGame.mutateAsync({ rules: val })}
          isSaving={updateGame.isPending}
          className="mb-8"
        >
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">gavel</span>
              Spielregeln
            </h2>
            <div className="prose prose-sm max-w-none bg-orange-50/50 rounded-xl border border-orange-200/50 p-5">
              <MarkdownRenderer content={game.rules} />
            </div>
          </div>
        </InlineEditor>
      )}

      {/* Materials */}
      <MaterialList materials={game.materials ?? []} className="mb-8" />

      {/* Emotions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3">Wie findest du dieses Spiel?</h3>
        <ContentEmotions
          emotionCounts={game.emotion_counts ?? {}}
          userEmotion={game.user_emotion ?? null}
          onToggle={(emotionType) => toggleEmotion.mutate({ emotion_type: emotionType })}
          isPending={toggleEmotion.isPending}
        />
      </div>

      {/* Similar Games */}
      {(game.similar_games?.length ?? 0) > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-3">Ähnliche Spiele</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {game.similar_games!.map((similar) => (
              <Link
                key={similar.id}
                to={`/games/${similar.slug}`}
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
      <ContentLinkSection contentType="game" objectId={gameId} />

      {/* Author Section */}
      <ContentAuthorSection
        authors={game.authors ?? []}
        createdAt={game.created_at}
        className="mb-8"
      />

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
    </EntityLinkContext.Provider>
  );
}
