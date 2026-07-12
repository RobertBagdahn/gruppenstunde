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
  useAdminEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
} from '@/api/admin';
import { EquipmentInSchema, type EquipmentIn, type Equipment } from '@/schemas/supply';

export default function EquipmentTab() {
  const { data: equipment, isLoading } = useAdminEquipment();
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const deleteMutation = useDeleteEquipment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

  const form = useForm<EquipmentIn>({
    resolver: zodResolver(EquipmentInSchema),
    defaultValues: { name: '', sort_order: 0 },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', sort_order: 0 });
    setDialogOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    form.reset({ name: item.name, sort_order: item.sort_order });
    setDialogOpen(true);
  }

  async function onSubmit(data: EquipmentIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Equipment aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Equipment erstellt');
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
      toast.success('Equipment gelöscht');
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
        <p className="text-sm text-muted-foreground">{equipment?.length ?? 0} Einträge</p>
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
                <th className="text-left px-5 py-3 font-semibold w-24">Sortierung</th>
                <th className="w-24 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {equipment?.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{e.name}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground">{e.slug}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{e.sort_order}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(e)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(e)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!equipment?.length && (
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? 'Equipment bearbeiten' : 'Neues Equipment'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} placeholder="z.B. Topf, Pfanne" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
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
