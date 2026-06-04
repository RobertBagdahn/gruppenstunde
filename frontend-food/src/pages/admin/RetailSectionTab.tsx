import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  useAdminRetailSections,
  useCreateRetailSection,
  useUpdateRetailSection,
  useDeleteRetailSection,
} from '@/api/admin';
import { RetailSectionInSchema, type RetailSectionIn, type RetailSection } from '@/schemas/supply';

export default function RetailSectionTab() {
  const { data: sections, isLoading } = useAdminRetailSections();
  const createMutation = useCreateRetailSection();
  const updateMutation = useUpdateRetailSection();
  const deleteMutation = useDeleteRetailSection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RetailSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RetailSection | null>(null);

  const form = useForm<RetailSectionIn>({
    resolver: zodResolver(RetailSectionInSchema),
    defaultValues: { name: '', description: '', rank: 0 },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', description: '', rank: 0 });
    setDialogOpen(true);
  }

  function openEdit(section: RetailSection) {
    setEditing(section);
    form.reset({ name: section.name, description: section.description, rank: section.rank });
    setDialogOpen(true);
  }

  async function onSubmit(data: RetailSectionIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Abteilung aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Abteilung erstellt');
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
      toast.success('Abteilung gelöscht');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{sections?.length ?? 0} Einträge</p>
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
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Beschreibung</th>
                <th className="text-left px-5 py-3 font-semibold w-24">Rang</th>
                <th className="w-24 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sections?.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{s.name}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground">{s.description || '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{s.rank}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(s)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(s)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!sections?.length && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    Keine Einträge gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Abteilung bearbeiten' : 'Neue Abteilung'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} placeholder="z.B. Obst & Gemüse" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input id="description" {...form.register('description')} placeholder="Optionale Beschreibung..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank">Rang</Label>
              <Input id="rank" type="number" {...form.register('rank', { valueAsNumber: true })} />
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

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={onDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
