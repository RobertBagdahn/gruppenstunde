import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { NutritionalTagAutocomplete } from './NutritionalTagAutocomplete';
import type { GroupMemberCreate } from '@/schemas/mealPlan';
import type { NutritionalTag } from '@/schemas/supply';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GroupMemberCreate) => void;
  isPending: boolean;
}

export function AddPersonDialog({ open, onOpenChange, onSubmit, isPending }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(15);
  const [gender, setGender] = useState<'male' | 'female' | 'no_answer'>('no_answer');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [tagObjects, setTagObjects] = useState<NutritionalTag[]>([]);

  const handleTagsChange = (ids: number[], tags: NutritionalTag[]) => {
    setTagIds(ids);
    setTagObjects(tags);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age) return;

    onSubmit({
      name: name.trim() || null,
      age,
      gender,
      nutritional_tag_ids: tagIds,
    });

    // Reset form
    setName('');
    setAge(15);
    setGender('no_answer');
    setTagIds([]);
    setTagObjects([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Person hinzufügen
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Details der neuen Person an.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional, Pflicht bei Allergien"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">Alter *</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                min={0}
                max={120}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
              />
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">Geschlecht</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
              >
                <option value="no_answer">Keine Angabe</option>
                <option value="male">Männlich</option>
                <option value="female">Weiblich</option>
              </select>
            </div>
          </div>

          <NutritionalTagAutocomplete
            selectedTagIds={tagIds}
            selectedTags={tagObjects}
            onTagsChange={handleTagsChange}
          />

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending || !age}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
