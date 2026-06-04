import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
import { Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react';
import {
  useAdminNutritionalTags,
  useCreateNutritionalTag,
  useUpdateNutritionalTag,
  useDeleteNutritionalTag,
} from '@/api/admin';
import { NutritionalTagInSchema, type NutritionalTagIn, type NutritionalTag } from '@/schemas/supply';

export default function NutritionalTagTab() {
  const { data: tags, isLoading } = useAdminNutritionalTags();
  const createMutation = useCreateNutritionalTag();
  const updateMutation = useUpdateNutritionalTag();
  const deleteMutation = useDeleteNutritionalTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NutritionalTag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NutritionalTag | null>(null);

  const form = useForm<NutritionalTagIn>({
    resolver: zodResolver(NutritionalTagInSchema),
    defaultValues: { name: '', name_opposite: '', description: '', rank: 1, is_dangerous: false },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: '', name_opposite: '', description: '', rank: 1, is_dangerous: false });
    setDialogOpen(true);
  }

  function openEdit(tag: NutritionalTag) {
    setEditing(tag);
    form.reset({
      name: tag.name,
      name_opposite: tag.name_opposite,
      description: tag.description,
      rank: tag.rank,
      is_dangerous: tag.is_dangerous,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: NutritionalTagIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Ernährungstag aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Ernährungstag erstellt');
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
      toast.success('Ernährungstag gelöscht');
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
        <p className="text-sm text-muted-foreground">{tags?.length ?? 0} Einträge</p>
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
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Gegenname</th>
                <th className="text-left px-5 py-3 font-semibold w-24">Rang</th>
                <th className="text-left px-5 py-3 font-semibold w-28">Gefährlich</th>
                <th className="w-24 px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tags?.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{t.name}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground">{t.name_opposite || '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{t.rank}</td>
                  <td className="px-5 py-3.5">
                    {t.is_dangerous ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/25">
                        <AlertTriangle className="h-3 w-3" />
                        Allergen
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </td>
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
              {!tags?.length && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
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
              {editing ? 'Ernährungstag bearbeiten' : 'Neuer Ernährungstag'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} placeholder="z.B. Fleisch, Nüsse" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_opposite">Gegenbezeichnung</Label>
              <Input id="name_opposite" {...form.register('name_opposite')} placeholder="z.B. Vegan, Nussfrei" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input id="description" {...form.register('description')} placeholder="Optionale Beschreibung..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rank">Rang</Label>
                <Input id="rank" type="number" {...form.register('rank', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2 flex items-center pt-6">
                <Label htmlFor="is_dangerous" className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="is_dangerous"
                    {...form.register('is_dangerous')}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  Gefährlich (Allergen)
                </Label>
              </div>
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
