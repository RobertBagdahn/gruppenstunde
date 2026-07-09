/**
 * TagManagement.tsx
 * Component for managing breakfast ingredient tags with create, edit, delete functionality.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorDisplay } from '../ErrorDisplay';
import { Badge } from '../ui/badge';
import { ApiClient } from '../../services/api';

interface Tag {
  id: number;
  name: string;
  slug: string;
  group: string;
  icon?: string;
  created_at: string;
}

interface TagManagementProps {
  group?: string;
  onTagsLoaded?: (tags: Tag[]) => void;
}

export function TagManagement({ group, onTagsLoaded }: TagManagementProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagGroup, setNewTagGroup] = useState(group || 'breakfast_wizard');

  // Fetch tags
  const { data: tags, isLoading, error } = useQuery({
    queryKey: ['tags', group],
    queryFn: async () => {
      const params = group ? `?group=${group}` : '';
      const response = await ApiClient.get(`/api/tags/${params}`);
      return response.data as Tag[];
    },
    onSuccess: (data) => {
      onTagsLoaded?.(data);
    },
  });

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; group: string }) => {
      const response = await ApiClient.post('/api/tags/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Tag erstellt ✓');
      setNewTagName('');
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Erstellen');
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (tagId: number) => {
      await ApiClient.delete(`/api/tags/${tagId}/`);
    },
    onSuccess: () => {
      toast.success('Tag gelöscht ✓');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Löschen');
    },
  });

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      toast.error('Tag-Name erforderlich');
      return;
    }
    createMutation.mutate({
      name: newTagName,
      group: newTagGroup,
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error as Error} />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tag-Verwaltung</h2>
        {!showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="outline"
          >
            + Neuer Tag
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Neuer Tag</h3>
          <form onSubmit={handleCreateTag} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tag-Name *</label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="z.B. Vegetarisch"
                disabled={createMutation.isPending}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Gruppe</label>
              <select
                value={newTagGroup}
                onChange={(e) => setNewTagGroup(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                disabled={createMutation.isPending}
              >
                <option value="breakfast_wizard">Breakfast Wizard</option>
                <option value="dietary">Diätisch</option>
                <option value="allergen">Allergen</option>
                <option value="seasonal">Saisonal</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={createMutation.isPending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                isLoading={createMutation.isPending}
              >
                Erstellen
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tags List */}
      <div className="space-y-3">
        {!tags || tags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Keine Tags vorhanden
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex justify-between items-center p-3 border rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{tag.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {tag.group}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Erstellt: {new Date(tag.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(tag.id)}
                disabled={deleteMutation.isPending}
              >
                Löschen
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {tags && tags.length > 0 && (
        <div className="text-sm text-gray-600 text-center pt-4 border-t">
          {tags.length} Tag{tags.length !== 1 ? 's' : ''} gesamt
        </div>
      )}
    </div>
  );
}
