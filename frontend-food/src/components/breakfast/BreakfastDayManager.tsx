/**
 * BreakfastDayManager — CRUD interface for breakfast day tags.
 */
import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useBreakfastDays, useCreateBreakfastDay, useUpdateBreakfastDay, useDeleteBreakfastDay } from '@/api/breakfast';
import type { BreakfastDay } from '@/schemas/breakfast';
import { toast } from 'sonner';

export default function BreakfastDayManager() {
  const { data: breakfastDays = [], isLoading } = useBreakfastDays();
  const createMutation = useCreateBreakfastDay();
  const updateMutation = useUpdateBreakfastDay();
  const deleteMutation = useDeleteBreakfastDay();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate(name, {
      onSuccess: () => {
        setNewName('');
        toast.success(`Tag "${name}" angelegt`);
      },
      onError: (err) => toast.error(`Fehler: ${err.message}`),
    });
  }

  function handleRename(day: BreakfastDay) {
    const name = editingName.trim();
    if (!name || name === day.name) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate(
      { tagId: day.id, name },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success(`Tag umbenannt in "${name}"`);
        },
        onError: (err) => toast.error(`Fehler: ${err.message}`),
      },
    );
  }

  function handleDelete(day: BreakfastDay) {
    deleteMutation.mutate(
      { tagId: day.id, force: deletingId === day.id },
      {
        onSuccess: (result) => {
          setDeletingId(null);
          if (result.deleted) {
            toast.success(`Tag "${day.name}" gelöscht`);
          } else if (result.recipe_count > 0) {
            toast.warning(
              `"${day.name}" wird von ${result.recipe_count} Rezept(en) verwendet. Nochmal klicken zum Löschen.`,
            );
            setDeletingId(day.id);
          }
        },
        onError: (err) => toast.error(`Fehler: ${err.message}`),
      },
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-lg">Frühstückstage verwalten</h2>

      {/* Create new */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neuen Tag anlegen (z.B. Tag 6)"
          className="flex-1 px-3 py-2 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim() || createMutation.isPending}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Anlegen
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lädt...</p>
      ) : breakfastDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Frühstückstage vorhanden.</p>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl">
          {breakfastDays.map((day) => (
            <div key={day.id} className="flex items-center justify-between px-4 py-3">
              {editingId === day.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 px-2 py-1 rounded border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(day);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(day)}
                    className="text-xs text-primary hover:underline"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{day.name}</span>
                    {day.recipe_count != null && day.recipe_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {day.recipe_count} Rezept{day.recipe_count !== 1 ? 'e' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingId(day.id); setEditingName(day.name); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(day)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}