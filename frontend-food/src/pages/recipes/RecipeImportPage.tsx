/**
 * Page for importing recipes from external URLs.
 * Shows URL input → fetches preview → allows user to confirm and save.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const ImportedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
});

const RecipeImportPreviewSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  ingredients: z.array(ImportedIngredientSchema),
  steps: z.array(z.string()),
  image_url: z.string(),
  source_url: z.string(),
  prep_time_minutes: z.number().nullable(),
  cook_time_minutes: z.number().nullable(),
});

type RecipeImportPreview = z.infer<typeof RecipeImportPreviewSchema>;

function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] ?? '';
}

export default function RecipeImportPage() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<RecipeImportPreview | null>(null);
  const navigate = useNavigate();

  const importMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const res = await fetch('/api/recipes/import-from-url/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ url: importUrl }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Import fehlgeschlagen' }));
        throw new Error(error.detail || 'Import fehlgeschlagen');
      }
      return RecipeImportPreviewSchema.parse(await res.json());
    },
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: (err: Error) => {
      toast.error('Import fehlgeschlagen', { description: err.message });
    },
  });

  const handleImport = () => {
    if (!url.trim()) return;
    importMutation.mutate(url.trim());
  };

  const handleCreateRecipe = () => {
    if (!preview) return;
    // Navigate to create page with pre-filled data via state
    navigate('/recipes/new', {
      state: {
        importedRecipe: preview,
      },
    });
  };

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <span className="material-symbols-outlined text-[24px]">download</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rezept importieren</h1>
          <p className="text-sm text-muted-foreground">
            Rezepte automatisch von externen Webseiten übernehmen
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>URL eingeben</CardTitle>
          <CardDescription>
            Füge die URL eines Rezepts ein (z.B. von Chefkoch, EatSmarter oder anderen Seiten mit
            strukturierten Daten).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.chefkoch.de/rezepte/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !url.trim()}
            >
              {importMutation.isPending ? 'Laden...' : 'Importieren'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{preview.title}</CardTitle>
            {preview.description && (
              <CardDescription className="line-clamp-3">{preview.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.image_url && (
              <img
                src={preview.image_url}
                alt={preview.title}
                className="w-full max-h-64 object-cover rounded-md"
              />
            )}

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{preview.servings} Portionen</span>
              {preview.prep_time_minutes && <span>{preview.prep_time_minutes} Min. Vorbereitung</span>}
              {preview.cook_time_minutes && <span>{preview.cook_time_minutes} Min. Kochen</span>}
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Zutaten ({preview.ingredients.length})
              </h3>
              <ul className="space-y-1 text-sm">
                {preview.ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-2">
                    {ing.quantity && <span className="font-medium">{ing.quantity} {ing.unit}</span>}
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {preview.steps.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">
                  Zubereitung ({preview.steps.length} Schritte)
                </h3>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  {preview.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateRecipe}>
                Rezept übernehmen
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Verwerfen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
