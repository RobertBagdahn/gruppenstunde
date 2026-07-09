/**
 * IngredientDetailView.tsx
 * Full-page detail view for a breakfast ingredient with edit capability.
 */
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { IngredientDetail, IngredientUpdateSchema } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';
import { Button } from '../ui/button';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { Badge } from '../ui/badge';

interface IngredientDetailViewProps {
  slug: string;
  onBack?: () => void;
  onUpdated?: (ingredient: IngredientDetail) => void;
}

export function IngredientDetailView({
  slug,
  onBack,
  onUpdated,
}: IngredientDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<IngredientDetail>>({});

  // Fetch ingredient detail
  const { data: ingredient, isLoading, error, refetch } = useQuery({
    queryKey: ['ingredient', slug],
    queryFn: async () => {
      const response = await ApiClient.get(
        `/api/supplies/ingredients/${slug}/`
      );
      return response.data as IngredientDetail;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ApiClient.patch(
        `/api/supplies/ingredients/${slug}/`,
        data
      );
      return response.data as IngredientDetail;
    },
    onSuccess: (data) => {
      toast.success('Zutat aktualisiert ✓');
      setIsEditing(false);
      onUpdated?.(data);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Aktualisieren');
    },
  });

  const handleEdit = () => {
    setFormData(ingredient || {});
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
  if (!ingredient) return <div>Zutat nicht gefunden</div>;

  const isSystemItem = ingredient.owner_id === null;
  const isShared =
    ingredient.visibility === 'shared' && ingredient.shared_groups.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{ingredient.name}</h1>
            {isShared && <Badge className="bg-blue-500">👥 Geteilt</Badge>}
            {isSystemItem && <Badge variant="outline">✓ System</Badge>}
          </div>
          <p className="text-gray-600">{ingredient.description}</p>
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
      {ingredient.owner_name && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold">Erstellt von:</span> {ingredient.owner_name}
          </p>
          {isShared && ingredient.shared_groups.length > 0 && (
            <p className="text-sm mt-2">
              <span className="font-semibold">Geteilt mit:</span>{' '}
              {ingredient.shared_groups.map((g) => g.name).join(', ')}
            </p>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              rows={3}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ingredient.energy_kcal && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Energie</p>
                <p className="text-lg font-semibold">
                  {ingredient.energy_kcal} kcal
                </p>
              </div>
            )}
            {ingredient.protein_g && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Protein</p>
                <p className="text-lg font-semibold">{ingredient.protein_g}g</p>
              </div>
            )}
            {ingredient.fat_g && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Fett</p>
                <p className="text-lg font-semibold">{ingredient.fat_g}g</p>
              </div>
            )}
            {ingredient.carbohydrate_g && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">Kohlenhydrate</p>
                <p className="text-lg font-semibold">{ingredient.carbohydrate_g}g</p>
              </div>
            )}
          </div>

          {/* Portions */}
          {ingredient.portions && ingredient.portions.length > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold mb-3">Portionen</h2>
              <div className="space-y-2">
                {ingredient.portions.map((portion) => (
                  <div key={portion.id} className="flex justify-between text-sm">
                    <span>{portion.name}</span>
                    <span className="text-gray-600">
                      {portion.quantity} {portion.measuring_unit_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
