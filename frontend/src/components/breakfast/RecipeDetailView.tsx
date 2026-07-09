/**
 * RecipeDetailView.tsx
 * Full-page detail view for a breakfast recipe with edit capability.
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { RecipeDetail, RecipeUpdateSchema } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { Badge } from '../ui/badge';

interface RecipeDetailViewProps {
  id: number;
  onBack?: () => void;
  onUpdated?: (recipe: RecipeDetail) => void;
}

export function RecipeDetailView({
  id,
  onBack,
  onUpdated,
}: RecipeDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<RecipeDetail>>({});

  // Fetch recipe detail
  const { data: recipe, isLoading, error, refetch } = useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const response = await ApiClient.get(`/api/recipes/${id}/`);
      return response.data as RecipeDetail;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ApiClient.patch(`/api/recipes/${id}/`, data);
      return response.data as RecipeDetail;
    },
    onSuccess: (data) => {
      toast.success('Rezept aktualisiert ✓');
      setIsEditing(false);
      onUpdated?.(data);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Aktualisieren');
    },
  });

  const handleEdit = () => {
    setFormData(recipe || {});
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error as Error} />;
  if (!recipe) return <div>Rezept nicht gefunden</div>;

  const isSystemItem = recipe.owner_id === null;
  const isShared =
    recipe.visibility === 'shared' && recipe.shared_groups.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{recipe.title}</h1>
            {isShared && <Badge className="bg-blue-500">👥 Geteilt</Badge>}
            {isSystemItem && <Badge variant="outline">✓ System</Badge>}
          </div>
          <p className="text-gray-600">{recipe.description}</p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            {!isSystemItem && (
              <Button onClick={handleEdit} variant="outline">
                Bearbeiten
              </Button>
            )}
            {onBack && (
              <Button onClick={onBack} variant="outline">
                Zurück
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Owner Info */}
      {recipe.owner_name && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold">Erstellt von:</span> {recipe.owner_name}
          </p>
          {isShared && recipe.shared_groups.length > 0 && (
            <p className="text-sm mt-2">
              <span className="font-semibold">Geteilt mit:</span>{' '}
              {recipe.shared_groups.map((g) => g.name).join(', ')}
            </p>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <label className="text-sm font-medium">Titel</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              disabled={updateMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              disabled={updateMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Portionen</label>
            <input
              type="number"
              value={formData.portions || 1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  portions: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-md"
              disabled={updateMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Sichtbarkeit</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: 'private' as const,
                    })
                  }
                  disabled={updateMutation.isPending}
                />
                <span className="text-sm">Privat</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={formData.visibility === 'shared'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: 'shared' as const,
                    })
                  }
                  disabled={updateMutation.isPending}
                />
                <span className="text-sm">Mit Gruppen teilen</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              isLoading={updateMutation.isPending}
            >
              Speichern
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Nutrition Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recipe.portions && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Portionen</p>
                <p className="text-lg font-semibold">{recipe.portions}</p>
              </div>
            )}
            {recipe.cached_energy_kcal && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Energie</p>
                <p className="text-lg font-semibold">
                  {recipe.cached_energy_kcal} kcal
                </p>
              </div>
            )}
            {recipe.cached_protein_g && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Protein</p>
                <p className="text-lg font-semibold">{recipe.cached_protein_g}g</p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {recipe.status && (
            <div>
              <p className="text-sm text-gray-600">
                Status: <Badge>{recipe.status}</Badge>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
