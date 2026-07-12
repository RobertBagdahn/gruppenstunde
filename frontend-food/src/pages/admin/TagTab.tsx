import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
import { Pencil, Trash2, Plus, ExternalLink } from 'lucide-react';
import {
  useAdminTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from '@/api/admin';
import { TagAdminInSchema, type TagAdminIn, type TagAdmin } from '@/schemas/supply';

export default function TagTab() {
  const navigate = useNavigate();
  const [page] = useState(1);
  const { data: paginated, isLoading } = useAdminTags(page, 50);
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagAdmin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagAdmin | null>(null);

  const form = useForm<TagAdminIn>({
    resolver: zodResolver(TagAdminInSchema),
    defaultValues: { name: '', description: '', parent_id: null, group: 'general', icon: '', sort_order: 0 },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', description: '', parent_id: null, group: 'general', icon: '', sort_order: 0 });
    setDialogOpen(true);
  }

  function openEdit(tag: TagAdmin) {
    setEditing(tag);
    form.reset({
      name: tag.name,
      description: tag.description,
      parent_id: tag.parent_id,
      group: tag.group,
      icon: tag.icon,
      sort_order: tag.sort_order,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: TagAdminIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Tag aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Tag erstellt');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Tag gelöscht');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  const tags = paginated?.items ?? [];

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{paginated?.total ?? tags.length} Einträge</p>
        <Button onClick={openCreate} className="gap-1.5" size="sm">
          <Plus className="h-4 w-4" />
          Neu
        </Button>
      </div>

      <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-medium text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Slug</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Gruppe</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Icon</th>
                <th className="text-left px-5 py-3 font-semibold w-16">Sort.</th>
                <th className="w-24 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tags.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium">
                    <button
                      onClick={() => navigate(`/admin/tag/${t.id}`)}
                      className="text-foreground hover:text-primary hover:underline flex items-center gap-1"
                    >
                      {t.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground">{t.slug}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{t.group}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{t.icon || '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.sort_order}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(t)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(t)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!tags.length && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Keine Einträge gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Tag bearbeiten' : 'Neuer Tag'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} placeholder="z.B. Lagerfeuer" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input id="description" {...form.register('description')} placeholder="Optionale Beschreibung..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">Gruppe</Label>
                <Input id="group" {...form.register('group')} placeholder="general" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input id="icon" {...form.register('icon')} placeholder="star" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sortierung</Label>
              <Input id="sort_order" type="number" {...form.register('sort_order', { valueAsNumber: true })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={onDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
