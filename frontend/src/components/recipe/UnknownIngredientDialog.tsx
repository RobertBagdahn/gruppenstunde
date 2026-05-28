/**
 * Dialog that suggests existing ingredients when a user types an unknown ingredient name.
 * Uses fuzzy matching via pg_trgm to prevent duplicates.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';

const SuggestionSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  similarity: z.number(),
  matched_via: z.string().nullable(),
});

type Suggestion = z.infer<typeof SuggestionSchema>;

interface UnknownIngredientDialogProps {
  open: boolean;
  query: string;
  onSelect: (ingredientId: number, ingredientName: string) => void;
  onCreateNew: (name: string) => void;
  onClose: () => void;
}

export function UnknownIngredientDialog({
  open,
  query,
  onSelect,
  onCreateNew,
  onClose,
}: UnknownIngredientDialogProps) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['ingredient-suggest', query] as const,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/ingredients/suggest/?q=${encodeURIComponent(query)}&limit=5`, {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return z.array(SuggestionSchema).parse(json);
    },
    enabled: open && query.length >= 2,
    staleTime: 30_000,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zutat nicht gefunden</DialogTitle>
          <DialogDescription>
            &quot;{query}&quot; wurde nicht in der Datenbank gefunden. Meintest du eine dieser Zutaten?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {isLoading && <p className="text-sm text-muted-foreground">Suche...</p>}
          {suggestions && suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s.id}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-accent transition-colors"
                onClick={() => onSelect(s.id, s.name)}
              >
                <div>
                  <span className="font-medium">{s.name}</span>
                  {s.matched_via && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (auch: {s.matched_via})
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(s.similarity * 100)}%
                </span>
              </button>
            ))
          ) : (
            !isLoading && (
              <p className="text-sm text-muted-foreground">Keine ähnlichen Zutaten gefunden.</p>
            )
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="default" onClick={() => onCreateNew(query)}>
            &quot;{query}&quot; neu anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
