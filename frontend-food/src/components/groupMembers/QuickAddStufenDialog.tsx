import { useState } from 'react';
import { Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { GroupMemberBulkCreate } from '@/schemas/mealPlan';

const STUFEN = [
  { key: 'woelflinge' as const, label: 'Wölflinge', defaultAge: 8, emoji: '🐺' },
  { key: 'jungpfadfinder' as const, label: 'Jungpfadfinder', defaultAge: 11, emoji: '🌿' },
  { key: 'pfadfinder' as const, label: 'Pfadfinder', defaultAge: 14, emoji: '🧭' },
  { key: 'rover' as const, label: 'Rover', defaultAge: 18, emoji: '🏕️' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBulkCreate: (data: GroupMemberBulkCreate) => void;
  isPending: boolean;
}

export function QuickAddStufenDialog({ open, onOpenChange, onBulkCreate, isPending }: Props) {
  const [selectedStufe, setSelectedStufe] = useState<string | null>(null);
  const [count, setCount] = useState(3);

  const handleConfirm = () => {
    if (!selectedStufe || count < 1) return;
    const stufe = STUFEN.find((s) => s.key === selectedStufe);
    onBulkCreate({
      count,
      stufe: selectedStufe as GroupMemberBulkCreate['stufe'],
      default_age: stufe?.defaultAge,
      gender: 'no_answer',
    });
    setSelectedStufe(null);
    setCount(3);
    onOpenChange(false);
  };

  const selectedStufeData = STUFEN.find((s) => s.key === selectedStufe);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Schnell Personen hinzufügen
          </DialogTitle>
          <DialogDescription>
            Wähle eine Pfadfinder-Stufe und die Anzahl der Personen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STUFEN.map((stufe) => (
              <button
                key={stufe.key}
                type="button"
                onClick={() => {
                  setSelectedStufe(stufe.key);
                  setCount(3);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedStufe === stufe.key
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <span className="text-3xl">{stufe.emoji}</span>
                <span className="text-sm font-medium text-foreground">{stufe.label}</span>
                {selectedStufe === stufe.key && (
                  <span className="text-xs text-primary font-semibold">↓ Anzahl wählen</span>
                )}
              </button>
            ))}
          </div>

          {selectedStufeData && (
            <div className="p-4 border border-primary/30 rounded-xl bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedStufeData.label} ({selectedStufeData.defaultAge} Jahre)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Standardalter für diese Stufe
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Anzahl:</label>
                <button
                  type="button"
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="px-3 py-1 rounded border border-border hover:bg-muted text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                  min={1}
                  max={50}
                  className="w-20 rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setCount(Math.min(50, count + 1))}
                  className="px-3 py-1 rounded border border-border hover:bg-muted text-sm"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

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
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !selectedStufe || count < 1}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            {count}× {selectedStufeData?.label} hinzufügen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
