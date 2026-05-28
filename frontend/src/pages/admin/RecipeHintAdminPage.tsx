import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useRecipeHints,
  useCreateRecipeHint,
  useUpdateRecipeHint,
  useDeleteRecipeHint,
  type RecipeHintFilters,
  type RecipeHintInput,
} from '@/api/recipeHints';
import type { RecipeHint } from '@/schemas/recipe';

const PARAMETERS = [
  { value: 'energy_kj', label: 'Energie (kJ)' },
  { value: 'sugar_g', label: 'Zucker (g)' },
  { value: 'sodium_mg', label: 'Natrium (mg)' },
  { value: 'fibre_g', label: 'Ballaststoffe (g)' },
  { value: 'fat_g', label: 'Fett (g)' },
  { value: 'fat_sat_g', label: 'Gesätt. Fettsäuren (g)' },
  { value: 'protein_g', label: 'Eiweiß (g)' },
  { value: 'carbohydrate_g', label: 'Kohlenhydrate (g)' },
  { value: 'salt_g', label: 'Salz (g)' },
  { value: 'weight_g', label: 'Gewicht (g)' },
  { value: 'nutri_class', label: 'Nutri-Score Klasse' },
];

const HINT_LEVELS = [
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warnung' },
  { value: 'error', label: 'Fehler' },
];

const RECIPE_TYPES = [
  { value: 'warm_meal', label: 'Warme Mahlzeit' },
  { value: 'cold_meal', label: 'Kalte Mahlzeit' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Getränk' },
  { value: 'baked_goods', label: 'Backwaren' },
  { value: 'simple_meal', label: 'Einfache Mahlzeit' },
];

const OBJECTIVES = [
  { value: 'health', label: 'Gesundheit' },
  { value: 'taste', label: 'Geschmack' },
  { value: 'cost', label: 'Kosten' },
  { value: 'fulfillment', label: 'Sättigung' },
];

const LEVEL_BADGE: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warn: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

function emptyForm(): RecipeHintInput {
  return {
    name: '',
    description: '',
    improvement_text: '',
    hint: '',
    parameter: 'weight_g',
    value: 0,
    min_max: 'max',
    hint_level: 'warn',
    recipe_type: 'warm_meal',
    recipe_objective: 'health',
  };
}

export default function RecipeHintAdminPage() {
  const [filters, setFilters] = useState<RecipeHintFilters>({ page: 1, page_size: 20 });
  const { data, isLoading } = useRecipeHints(filters);
  const createMutation = useCreateRecipeHint();
  const updateMutation = useUpdateRecipeHint();
  const deleteMutation = useDeleteRecipeHint();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingHint, setEditingHint] = useState<RecipeHint | null>(null);
  const [form, setForm] = useState<RecipeHintInput>(emptyForm());
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function openCreate() {
    setEditingHint(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(hint: RecipeHint) {
    setEditingHint(hint);
    setForm({
      name: hint.name,
      description: hint.description,
      improvement_text: hint.improvement_text,
      hint: hint.hint,
      parameter: hint.parameter,
      value: hint.value,
      min_max: hint.min_max,
      hint_level: hint.hint_level,
      recipe_type: hint.recipe_type,
      recipe_objective: hint.recipe_objective,
    });
    setSheetOpen(true);
  }

  function handleSave() {
    if (editingHint) {
      updateMutation.mutate(
        { id: editingHint.id, ...form },
        {
          onSuccess: () => { toast.success('Hinweis aktualisiert'); setSheetOpen(false); },
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => { toast.success('Hinweis erstellt'); setSheetOpen(false); },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      });
    }
  }

  function handleDelete() {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { toast.success('Hinweis gelöscht'); setDeleteId(null); },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezept-Hinweise verwalten</h1>
        <Button onClick={openCreate}>
          <span className="material-symbols-outlined text-sm mr-1">add</span>
          Neue Regel
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.parameter || ''}
          onValueChange={(v) => setFilters({ ...filters, parameter: v || undefined, page: 1 })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Parameter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Parameter</SelectItem>
            {PARAMETERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.hint_level || ''}
          onValueChange={(v) => setFilters({ ...filters, hint_level: v || undefined, page: 1 })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Level</SelectItem>
            {HINT_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.recipe_type || ''}
          onValueChange={(v) => setFilters({ ...filters, recipe_type: v || undefined, page: 1 })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Rezepttyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle Typen</SelectItem>
            {RECIPE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.recipe_objective || ''}
          onValueChange={(v) => setFilters({ ...filters, recipe_objective: v || undefined, page: 1 })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Objective" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Alle</SelectItem>
            {OBJECTIVES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="h-12 bg-muted animate-pulse rounded" />
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hinweis-Text</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((hint) => (
                <TableRow key={hint.id}>
                  <TableCell className="font-medium">{hint.hint}</TableCell>
                  <TableCell>{hint.parameter}</TableCell>
                  <TableCell>{hint.value}</TableCell>
                  <TableCell>{hint.min_max}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_BADGE[hint.hint_level] || ''}`}>
                      {hint.hint_level}
                    </span>
                  </TableCell>
                  <TableCell>{hint.recipe_type}</TableCell>
                  <TableCell>{hint.recipe_objective}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(hint)}>
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(hint.id)}>
                        <span className="material-symbols-outlined text-sm text-red-500">delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Keine Hinweise gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
          >
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Seite {data.page} / {data.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.total_pages}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
          >
            Weiter
          </Button>
        </div>
      )}

      {/* Edit/Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingHint ? 'Hinweis bearbeiten' : 'Neuer Hinweis'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Hinweis-Text (wird angezeigt)</Label>
              <Input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} />
            </div>
            <div>
              <Label>Parameter</Label>
              <Select value={form.parameter} onValueChange={(v) => setForm({ ...form, parameter: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARAMETERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schwellenwert</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Regeltyp</Label>
              <Select value={form.min_max} onValueChange={(v) => setForm({ ...form, min_max: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">Mindestens</SelectItem>
                  <SelectItem value="max">Höchstens</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level</Label>
              <Select value={form.hint_level} onValueChange={(v) => setForm({ ...form, hint_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HINT_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rezepttyp</Label>
              <Select value={form.recipe_type} onValueChange={(v) => setForm({ ...form, recipe_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECIPE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bewertungsdimension</Label>
              <Select value={form.recipe_objective} onValueChange={(v) => setForm({ ...form, recipe_objective: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beschreibung (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Verbesserungsvorschlag (optional)</Label>
              <Input value={form.improvement_text} onChange={(e) => setForm({ ...form, improvement_text: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                Speichern
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hinweis löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
