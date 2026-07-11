import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NutritionalTagAutocomplete } from './NutritionalTagAutocomplete';
import type { GroupMemberCreate } from '@/schemas/mealPlan';
import type { NutritionalTag } from '@/schemas/supply';

interface Props {
  onSubmit: (data: GroupMemberCreate) => void;
  isPending: boolean;
}

export function AddPersonForm({ onSubmit, isPending }: Props) {
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

    setName('');
    setAge(15);
    setGender('no_answer');
    setTagIds([]);
    setTagObjects([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-border rounded-xl bg-muted/20">
      <h4 className="font-display font-semibold text-sm text-foreground">Person hinzufügen</h4>

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

      <button
        type="submit"
        disabled={isPending || !age}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Hinzufügen
      </button>
    </form>
  );
}
