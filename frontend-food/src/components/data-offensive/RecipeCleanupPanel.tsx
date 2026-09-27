import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Loader2, Sparkles } from 'lucide-react';
import { useJunkRecipes, useOffensiveBulkAction } from '@/api/dataOffensive';
import { Button } from '@/components/ui/button';

interface RecipeCleanupPanelProps {
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

export default function RecipeCleanupPanel({ onNotify }: RecipeCleanupPanelProps) {
  const { data: junk = [], isLoading, error, refetch } = useJunkRecipes();
  const archive = useOffensiveBulkAction('/recipes/archive/');
  const recategorize = useOffensiveBulkAction('/recipes/recategorize/');
  const [changes, setChanges] = useState<string[]>([]);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold">Rezepte aufräumen</h2>
        <p className="text-sm text-muted-foreground">
          Testdaten und leere Entwürfe werden archiviert (umkehrbar). Die Kategorie-Prüfung ordnet Rezepte per KI
          Frühstück, warmen/kalten Mahlzeiten, Desserts, Snacks, Getränken oder Rezeptteilen zu.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{junk.length} unsinnige Rezepte</p>
            <Button
              size="sm"
              variant="outline"
              disabled={archive.isPending || junk.length === 0}
              onClick={() =>
                archive.mutate(
                  junk.map((recipe) => recipe.id),
                  {
                    onSuccess: (result) => onNotify('success', `${result.changed} Rezepte archiviert.`),
                    onError: (err) => onNotify('error', err.message),
                  }
                )
              }
            >
              {archive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Alle archivieren
            </Button>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : error ? (
            <p className="text-sm text-destructive">
              {error.message}{' '}
              <button type="button" className="underline" onClick={() => refetch()}>
                Erneut versuchen
              </button>
            </p>
          ) : (
            <ul className="max-h-60 overflow-y-auto divide-y text-sm">
              {junk.map((recipe) => (
                <li key={recipe.id} className="flex items-center justify-between gap-2 py-1.5">
                  <Link to={`/recipes/${recipe.slug}`} target="_blank" className="truncate hover:text-primary">
                    {recipe.title}
                  </Link>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{recipe.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Rezeptkategorien prüfen</p>
            <Button
              size="sm"
              variant="outline"
              disabled={recategorize.isPending}
              onClick={() =>
                recategorize.mutate([], {
                  onSuccess: (result) => {
                    setChanges(result.messages);
                    onNotify('success', `${result.changed} Rezepte neu kategorisiert.`);
                  },
                  onError: (err) => onNotify('error', err.message),
                })
              }
            >
              {recategorize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Mit KI prüfen
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Nur eindeutige Änderungen (Sicherheit ≥ 75 %) werden übernommen. ≈ 1 Cent pro 25 Rezepte.
          </p>
          {changes.length > 0 && (
            <ul className="max-h-60 overflow-y-auto space-y-1 text-xs">
              {changes.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
