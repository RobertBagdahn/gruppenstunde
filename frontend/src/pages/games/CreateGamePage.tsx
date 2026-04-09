/**
 * CreateGamePage — Game creation using the shared ContentStepper.
 * Adds game-specific fields: game_type, play_area, players, duration, rules.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateGame } from '@/api/games';
import { GAME_TYPE_OPTIONS, PLAY_AREA_OPTIONS } from '@/schemas/game';
import MarkdownEditor from '@/components/MarkdownEditor';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export default function CreateGamePage() {
  const navigate = useNavigate();
  const createGame = useCreateGame();

  // Game-specific state
  const [gameType, setGameType] = useState('');
  const [playArea, setPlayArea] = useState('');
  const [minPlayers, setMinPlayers] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [gameDuration, setGameDuration] = useState('');
  const [rules, setRules] = useState('');

  async function handleSave(formData: ContentFormData) {
    try {
      const result = await createGame.mutateAsync({
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        difficulty: formData.difficulty || undefined,
        costs_rating: formData.costsRating || undefined,
        execution_time: formData.executionTime || undefined,
        preparation_time: formData.preparationTime || undefined,
        game_type: gameType || undefined,
        play_area: playArea || undefined,
        min_players: minPlayers ? parseInt(minPlayers, 10) : null,
        max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
        game_duration_minutes: gameDuration ? parseInt(gameDuration, 10) : null,
        rules: rules || undefined,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
      });
      toast.success('Spiel erstellt!');
      navigate(`/games/${result.slug}`);
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <ContentStepper
      typeLabel="Spiel"
      typeIcon="sports_esports"
      typeGradient="from-emerald-500 to-green-600"
      isSaving={createGame.isPending}
      onSave={handleSave}
      renderTypeFields={() => (
        <div className="space-y-6">
          {/* Game details */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium">Spiel-Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Spielart</label>
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {GAME_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Spielfläche</label>
                <select
                  value={playArea}
                  onChange={(e) => setPlayArea(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {PLAY_AREA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min. Spieler</label>
                <input
                  type="number"
                  min={1}
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  placeholder="z.B. 4"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max. Spieler</label>
                <input
                  type="number"
                  min={1}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  placeholder="z.B. 20"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Spieldauer (Minuten)</label>
                <input
                  type="number"
                  min={1}
                  value={gameDuration}
                  onChange={(e) => setGameDuration(e.target.value)}
                  placeholder="z.B. 30"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-card rounded-xl border p-6">
            <label className="block text-sm font-medium mb-1.5">Spielregeln</label>
            <MarkdownEditor
              value={rules}
              onChange={(val) => setRules(val ?? '')}
              height={200}
            />
          </div>
        </div>
      )}
      renderPreviewExtras={() => (
        <>
          {(gameType || playArea || minPlayers || maxPlayers || gameDuration) && (
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              {gameType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">sports_esports</span>
                  {GAME_TYPE_OPTIONS.find((o) => o.value === gameType)?.label ?? gameType}
                </span>
              )}
              {playArea && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {PLAY_AREA_OPTIONS.find((o) => o.value === playArea)?.label ?? playArea}
                </span>
              )}
              {(minPlayers || maxPlayers) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">people</span>
                  {minPlayers && maxPlayers
                    ? `${minPlayers}–${maxPlayers} Spieler`
                    : minPlayers
                      ? `Ab ${minPlayers} Spieler`
                      : `Bis ${maxPlayers} Spieler`}
                </span>
              )}
              {gameDuration && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  {gameDuration} Min.
                </span>
              )}
            </div>
          )}
          {rules && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Spielregeln</h4>
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={rules} />
              </div>
            </div>
          )}
        </>
      )}
    />
  );
}
