/**
 * Step 4 — Getränke: Kaffee / Kakao / Tee Anteile + Milch-Zusammenrechnung.
 */
import type { UseWizardStateReturn } from './useWizardState';
import { totalMilkMlPerPerson } from '@/lib/breakfastCalc';

interface StepGetraenkeProps {
  wiz: UseWizardStateReturn;
}

export default function StepGetraenke({ wiz }: StepGetraenkeProps) {
  const { state, setDrinks } = wiz;
  const { drinks } = state;

  const totalPercent = drinks.coffeePercent + drinks.cocoaPercent + drinks.teaPercent;
  const milkMl = totalMilkMlPerPerson(drinks);

  function setPercent(field: 'coffeePercent' | 'cocoaPercent' | 'teaPercent', value: number) {
    // Clamp and rebalance the other two proportionally
    const clamped = Math.max(0, Math.min(100, value));
    const others: Array<'coffeePercent' | 'cocoaPercent' | 'teaPercent'> = [
      'coffeePercent', 'cocoaPercent', 'teaPercent',
    ].filter((f) => f !== field) as Array<'coffeePercent' | 'cocoaPercent' | 'teaPercent'>;

    const remaining = Math.max(0, 100 - clamped);
    const otherTotal = others.reduce((s, f) => s + drinks[f], 0);

    const patch: Partial<typeof drinks> = { [field]: clamped };
    if (otherTotal > 0) {
      others.forEach((f) => {
        patch[f] = Math.round((drinks[f] / otherTotal) * remaining);
      });
      // Correct rounding error on last field
      const sum = clamped + others.reduce((s, f) => s + (patch[f] as number), 0);
      if (sum !== 100) {
        patch[others[others.length - 1]] = (patch[others[others.length - 1]] as number) + (100 - sum);
      }
    } else {
      others.forEach((f) => { patch[f] = Math.round(remaining / others.length); });
    }

    setDrinks(patch);
  }

  return (
    <div className="space-y-6">
      {/* ml pro Person */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Menge pro Person</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={100}
            max={1000}
            step={50}
            value={drinks.mlPerPerson}
            onChange={(e) => setDrinks({ mlPerPerson: Math.max(100, Number(e.target.value)) })}
            className="w-24 rounded-lg border px-3 py-2 text-base text-right"
          />
          <span className="text-sm text-muted-foreground">ml / Person</span>
        </div>
      </div>

      {/* Anteile */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base">Sortenverteilung</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            totalPercent === 100 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}>
            {totalPercent}%
          </span>
        </div>

        {[
          { label: 'Kaffee', field: 'coffeePercent' as const },
          { label: 'Kakao', field: 'cocoaPercent' as const },
          { label: 'Tee / Wasser', field: 'teaPercent' as const },
        ].map(({ label, field }) => (
          <div key={field} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="font-mono">{drinks[field]}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={drinks[field]}
              onChange={(e) => setPercent(field, Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              {Math.round(drinks.mlPerPerson * drinks[field] / 100)} ml / Person
            </p>
          </div>
        ))}
      </div>

      {/* Milch pro Heißgetränk */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="font-display font-semibold text-base">Milch in Heißgetränken</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Milch im Kaffee', field: 'coffeeMilkMlPerPerson' as const },
            { label: 'Milch im Kakao', field: 'cocoaMilkMlPerPerson' as const },
          ].map(({ label, field }) => (
            <div key={field} className="space-y-1">
              <label className="text-xs text-muted-foreground">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={drinks[field]}
                  onChange={(e) => setDrinks({ [field]: Math.max(0, Number(e.target.value)) })}
                  className="w-20 rounded-lg border px-2 py-1.5 text-sm text-right"
                />
                <span className="text-xs text-muted-foreground">ml</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Gesamt Milch: <span className="font-medium text-foreground">{Math.round(milkMl)} ml</span> / Person
          {' '}(wird in Einkaufsliste zusammengerechnet)
        </p>
      </div>
    </div>
  );
}
