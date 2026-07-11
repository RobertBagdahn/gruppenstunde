import { useState } from 'react';
import { Users } from 'lucide-react';
import type { GroupMemberBulkCreate } from '@/schemas/mealPlan';

const STUFEN = [
  { key: 'woelflinge' as const, label: 'Wölflinge', defaultAge: 8, emoji: '🐺' },
  { key: 'jungpfadfinder' as const, label: 'Jungpfadfinder', defaultAge: 11, emoji: '🌿' },
  { key: 'pfadfinder' as const, label: 'Pfadfinder', defaultAge: 14, emoji: '🧭' },
  { key: 'rover' as const, label: 'Rover', defaultAge: 18, emoji: '🏕️' },
];

interface Props {
  onBulkCreate: (data: GroupMemberBulkCreate) => void;
  isPending: boolean;
}

export function QuickAddStufenDialog({ onBulkCreate, isPending }: Props) {
  const [activeStufe, setActiveStufe] = useState<string | null>(null);
  const [count, setCount] = useState(3);

  const handleStufeClick = (stufeKey: string) => {
    setActiveStufe(activeStufe === stufeKey ? null : stufeKey);
    setCount(3);
  };

  const handleConfirm = () => {
    if (!activeStufe || count < 1) return;
    const stufe = STUFEN.find((s) => s.key === activeStufe);
    onBulkCreate({
      count,
      stufe: activeStufe as GroupMemberBulkCreate['stufe'],
      default_age: stufe?.defaultAge,
      gender: 'no_answer',
    });
    setActiveStufe(null);
  };

  return (
    <div className="space-y-3">
      <h4 className="font-display font-semibold text-sm text-foreground">Schnell hinzufügen</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STUFEN.map((stufe) => (
          <button
            key={stufe.key}
            type="button"
            onClick={() => handleStufeClick(stufe.key)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm font-medium transition-all ${
              activeStufe === stufe.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card hover:bg-muted/50 text-foreground'
            }`}
          >
            <span className="text-lg">{stufe.emoji}</span>
            <span>{stufe.label}</span>
          </button>
        ))}
      </div>

      {activeStufe && (
        <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/5">
          <Users className="w-4 h-4 text-primary" />
          <div className="flex items-center gap-2">
            <label className="text-sm">Anzahl:</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              min={1}
              max={50}
              className="w-16 rounded-lg border border-border px-2 py-1 text-sm text-center"
            />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {count}× hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
