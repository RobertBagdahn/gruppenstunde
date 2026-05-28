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
  useAdminHealthRules,
  useCreateHealthRule,
  useUpdateHealthRule,
  useDeleteHealthRule,
} from '@/api/admin';
import { HealthRuleInSchema, type HealthRuleIn, type HealthRule } from '@/schemas/cockpit';

const SCOPE_OPTIONS = [
  { value: 'meal_event', label: 'Essensplan' },
  { value: 'day', label: 'Tag' },
  { value: 'meal', label: 'Mahlzeit' },
  { value: 'recipe', label: 'Rezept' },
  { value: 'ingredient', label: 'Zutat' },
];

export default function HealthRuleTab() {
  const { data: rules, isLoading } = useAdminHealthRules();
  const createMutation = useCreateHealthRule();
  const updateMutation = useUpdateHealthRule();
  const deleteMutation = useDeleteHealthRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HealthRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthRule | null>(null);

  const form = useForm<HealthRuleIn>({
    resolver: zodResolver(HealthRuleInSchema),
    defaultValues: {
      name: '', description: '', parameter: '', scope: 'day',
      min_green: null, min_yellow: null, max_green: null, max_yellow: null,
      unit: '', tip_text: '', is_active: true, sort_order: 0,
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      name: '', description: '', parameter: '', scope: 'day',
      min_green: null, min_yellow: null, max_green: null, max_yellow: null,
      unit: '', tip_text: '', is_active: true, sort_order: 0,
    });
    setDialogOpen(true);
  }

  function openEdit(rule: HealthRule) {
    setEditing(rule);
    form.reset({
      name: rule.name,
      description: rule.description,
      parameter: rule.parameter,
      scope: rule.scope,
      min_green: rule.min_green,
      min_yellow: rule.min_yellow,
      max_green: rule.max_green,
      max_yellow: rule.max_yellow,
      unit: rule.unit,
      tip_text: rule.tip_text,
      is_active: rule.is_active,
      sort_order: rule.sort_order,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: HealthRuleIn) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data });
        toast.success('Gesundheitsregel aktualisiert');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Gesundheitsregel erstellt');
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
      toast.success('Gesundheitsregel gelöscht');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Laden...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{rules?.length ?? 0} Einträge</p>
        <Button onClick={openCreate}>Neu</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Parameter</th>
              <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Scope</th>
              <th className="text-left px-4 py-2 font-medium w-20">Aktiv</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules?.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{r.parameter}</td>
                <td className="px-4 py-2 hidden sm:table-cell">
                  {SCOPE_OPTIONS.find((s) => s.value === r.scope)?.label ?? r.scope}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1 hover:bg-muted rounded">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1 hover:bg-muted rounded text-destructive">
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
            <DialogTitle>{editing ? 'Gesundheitsregel bearbeiten' : 'Neue Gesundheitsregel'}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parameter">Parameter</Label>
                <Input id="parameter" {...form.register('parameter')} placeholder="z.B. sugar_g" />
                {form.formState.errors.parameter && (
                  <p className="text-xs text-destructive">{form.formState.errors.parameter.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Geltungsbereich</Label>
                <Select value={form.watch('scope')} onValueChange={(v) => form.setValue('scope', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_green">Min Grün</Label>
                <Input id="min_green" type="number" step="any" {...form.register('min_green', { setValueAs: (v) => v === '' ? null : Number(v) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_green">Max Grün</Label>
                <Input id="max_green" type="number" step="any" {...form.register('max_green', { setValueAs: (v) => v === '' ? null : Number(v) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_yellow">Min Gelb</Label>
                <Input id="min_yellow" type="number" step="any" {...form.register('min_yellow', { setValueAs: (v) => v === '' ? null : Number(v) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_yellow">Max Gelb</Label>
                <Input id="max_yellow" type="number" step="any" {...form.register('max_yellow', { setValueAs: (v) => v === '' ? null : Number(v) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Einheit</Label>
                <Input id="unit" {...form.register('unit')} placeholder="g, kJ, EUR" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sortierung</Label>
                <Input id="sort_order" type="number" {...form.register('sort_order', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tip_text">Tipp-Text</Label>
              <Input id="tip_text" {...form.register('tip_text')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active" className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  {...form.register('is_active')}
                  className="rounded border-border"
                />
                Aktiv
              </Label>
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
