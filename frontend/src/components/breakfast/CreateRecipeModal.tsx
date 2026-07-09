/**
 * CreateRecipeModal.tsx
 * Modal dialog for creating custom breakfast recipes with visibility & tagging.
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { RecipeCreate } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recipe: any) => void;
  groupId?: number;
}

export function CreateRecipeModal({
  isOpen,
  onClose,
  onSuccess,
  groupId,
}: CreateRecipeModalProps) {
  const [formData, setFormData] = useState<Partial<RecipeCreate>>({
    title: '',
    summary: '',
    description: '',
    recipe_type: 'breakfast',
    shared_group_ids: groupId ? [groupId] : [],
    tag_ids: [],
    recipe_items: [],
    website: '',
    form_loaded_at: 0,
  });

  // Record when form was loaded for bot protection
  React.useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        form_loaded_at: Date.now() / 1000,
      }));
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: RecipeCreate) => {
      const response = await ApiClient.post('/api/recipes/', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Rezept erstellt ✓');
      setFormData({
        title: '',
        summary: '',
        description: '',
        recipe_type: 'breakfast',
        shared_group_ids: groupId ? [groupId] : [],
        tag_ids: [],
        recipe_items: [],
        website: '',
        form_loaded_at: 0,
      });
      onSuccess?.(data);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Erstellen des Rezepts');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error('Rezepttitel erforderlich');
      return;
    }
    if (formData.website) {
      toast.error('Ungültige Anfrage');
      return;
    }
    if (formData.form_loaded_at && Date.now() / 1000 - formData.form_loaded_at < 5) {
      toast.error('Bitte warten Sie einen Moment');
      return;
    }

    createMutation.mutate(formData as RecipeCreate);
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Neues Rezept erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Rezepttitel *</label>
            <Input
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="z.B. Spiegelei mit Spargel"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Kurzbeschreibung</label>
            <Input
              value={formData.summary || ''}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Kurze Zusammenfassung des Rezepts"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Zutaten und Anleitung"
              className="w-full px-3 py-2 border rounded-md text-sm"
              disabled={createMutation.isPending}
              rows={4}
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
                  checked={
                    formData.shared_group_ids?.length === 0 ||
                    formData.shared_group_ids === undefined
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shared_group_ids: [],
                    })
                  }
                  disabled={createMutation.isPending}
                />
                <span className="text-sm">Privat</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={
                    formData.shared_group_ids && formData.shared_group_ids.length > 0
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shared_group_ids: groupId ? [groupId] : [],
                    })
                  }
                  disabled={createMutation.isPending}
                />
                <span className="text-sm">Mit Gruppen teilen</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
      </DialogContent>
    </Dialog>
  );
}
