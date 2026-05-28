import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';
import {
  useAdminRecipeHints,
  useCreateRecipeHint,
  useUpdateRecipeHint,
  useDeleteRecipeHint,
} from '@/api/admin';
import { RecipeHintInSchema, type RecipeHintIn, type RecipeHint } from '@/schemas/supply';

const HINT_LEVELS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warnung' },
  { value: 'critical', label: 'Kritisch' },
];

const MIN_MAX_OPTIONS = [
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

export default function RecipeHintTab() {
  const { data, isLoading } = useAdminRecipeHints();
  const createMutation = useCreateRecipeHint();
  const updateMutation = useUpdateRecipeHint();
  const deleteMutation = useDeleteRecipeHint();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeHint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecipeHint | null>(null);

  const form = useForm<RecipeHintIn>({
    resolver: zodResolver(RecipeHintInSchema),
    defaultValues: {
      name: '', description: '', improvement_text: '', hint: '',
      parameter: '', value: 0, min_max: 'max', hint_level: 'info',
      recipe_type: '', recipe_objective: '',
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      name: '', description: '', improvement_text: '', hint: '',
      parameter: '', value: 0, min_max: 'max', hint_level: 'info',
      recipe_type: '', recipe_objective: '',
    });
    setDialogOpen(true);
  }

  function openEdit(hint: RecipeHint) {
    setEditing(hint);
    form.reset({
      name: hint.name,
      description: hint.description,
      improvement_text: hint.improvement_text,
      hint: '',
      parameter: hint.parameter,
      value: 0,
      min_max: hint.min_max,
      hint_level: hint.hint_level,
      recipe_type: hint.recipe_type,
      recipe_objective: hint.recipe_objective,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: RecipeHintIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Rezept-Hinweis aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Rezept-Hinweis erstellt');
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
      toast.success('Rezept-Hinweis gelöscht');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laden...</div>;

  const hints = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} Einträge</p>
        <Button onClick={openCreate}>Neu</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Parameter</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Regeltyp</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Stufe</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hints.map((h) => (
              <tr key={h.id} className="hover:bg-muted/30">
                <td className="px-4 py-2">{h.name}</td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{h.parameter}</td>
                <td className="px-4 py-2 hidden sm:table-cell">{h.min_max}</td>
                <td className="px-4 py-2 hidden sm:table-cell">{h.hint_level}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(h)} className="p-1 hover:bg-muted rounded">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(h)} className="p-1 hover:bg-muted rounded text-destructive">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Rezept-Hinweis bearbeiten' : 'Neuer Rezept-Hinweis'}</DialogTitle>
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
              <Label htmlFor="improvement_text">Verbesserungsvorschlag</Label>
              <Input id="improvement_text" {...form.register('improvement_text')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hint">Hinweis-Text</Label>
              <Input id="hint" {...form.register('hint')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parameter">Parameter</Label>
                <Input id="parameter" {...form.register('parameter')} placeholder="z.B. sugar_g" />
                {form.formState.errors.parameter && (
                  <p className="text-xs text-destructive">{form.formState.errors.parameter.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Schwellenwert</Label>
                <Input id="value" type="number" step="any" {...form.register('value', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Regeltyp</Label>
                <Select value={form.watch('min_max')} onValueChange={(v) => form.setValue('min_max', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MIN_MAX_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hinweis-Stufe</Label>
                <Select value={form.watch('hint_level')} onValueChange={(v) => form.setValue('hint_level', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HINT_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipe_type">Rezepttyp</Label>
                <Input id="recipe_type" {...form.register('recipe_type')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipe_objective">Bewertungsdimension</Label>
                <Input id="recipe_objective" {...form.register('recipe_objective')} />
              </div>
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={onDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
