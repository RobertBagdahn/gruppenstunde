import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
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

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laden...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{sections?.length ?? 0} Einträge</p>
        <Button onClick={openCreate}>Neu</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Beschreibung</th>
              <th className="text-left px-4 py-2 font-medium w-20">Rang</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sections?.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">{s.description}</td>
                <td className="px-4 py-2">{s.rank}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1 hover:bg-muted rounded">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="p-1 hover:bg-muted rounded text-destructive">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Abteilung bearbeiten' : 'Neue Abteilung'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input id="description" {...form.register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank">Rang</Label>
              <Input id="rank" type="number" {...form.register('rank', { valueAsNumber: true })} />
            </div>
            <div className="flex justify-end gap-2">
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
