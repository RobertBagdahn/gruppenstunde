/**
 * RuleEditDialog — Create/edit dialog for Rules with live AmpelRangePreview.
 */
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import AmpelRangePreview from './AmpelRangePreview';
import type { Rule, RuleIn } from '@/schemas/suggestions';

const SCOPE_OPTIONS = [
  { value: 'day', label: 'Tag' },
  { value: 'meal_event', label: 'Essensplan' },
  { value: 'meal', label: 'Mahlzeit' },
  { value: 'recipe', label: 'Rezept' },
];

const PARAMETER_OPTIONS = [
  { value: 'energy_kj', label: 'Energie (kJ)', unit: 'kJ' },
  { value: 'protein_g', label: 'Eiweiß (g)', unit: 'g' },
  { value: 'fat_g', label: 'Fett (g)', unit: 'g' },
  { value: 'fat_sat_g', label: 'Gesättigte Fettsäuren (g)', unit: 'g' },
  { value: 'carbohydrate_g', label: 'Kohlenhydrate (g)', unit: 'g' },
  { value: 'sugar_g', label: 'Zucker (g)', unit: 'g' },
  { value: 'fibre_g', label: 'Ballaststoffe (g)', unit: 'g' },
  { value: 'salt_g', label: 'Salz (g)', unit: 'g' },
  { value: 'sodium_mg', label: 'Natrium (mg)', unit: 'mg' },
  { value: 'calcium_mg', label: 'Calcium (mg)', unit: 'mg' },
  { value: 'iron_mg', label: 'Eisen (mg)', unit: 'mg' },
  { value: 'vitamin_c_mg', label: 'Vitamin C (mg)', unit: 'mg' },
];

interface RuleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null; // null = create mode
  onSave: (data: RuleIn) => void;
  isPending: boolean;
}

export default function RuleEditDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  isPending,
}: RuleEditDialogProps) {
  const [name, setName] = useState('');
  const [parameter, setParameter] = useState('energy_kj');
  const [scope, setScope] = useState('day');
  const [minYellow, setMinYellow] = useState<string>('');
  const [minGreen, setMinGreen] = useState<string>('');
  const [maxGreen, setMaxGreen] = useState<string>('');
  const [maxYellow, setMaxYellow] = useState<string>('');
  const [unit, setUnit] = useState('');
  const [tipText, setTipText] = useState('');
  const [improvementText, setImprovementText] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setParameter(rule.parameter);
      setScope(rule.scope);
      setMinYellow(rule.min_yellow != null ? String(rule.min_yellow) : '');
      setMinGreen(rule.min_green != null ? String(rule.min_green) : '');
      setMaxGreen(rule.max_green != null ? String(rule.max_green) : '');
      setMaxYellow(rule.max_yellow != null ? String(rule.max_yellow) : '');
      setUnit(rule.unit);
      setTipText(rule.tip_text);
      setImprovementText(rule.improvement_text);
      setIsActive(rule.is_active);
    } else {
      setName('');
      setParameter('energy_kj');
      setScope('day');
      setMinYellow('');
      setMinGreen('');
      setMaxGreen('');
      setMaxYellow('');
      setUnit('kJ');
      setTipText('');
      setImprovementText('');
      setIsActive(true);
    }
  }, [rule, open]);

  const handleParameterChange = (p: string) => {
    setParameter(p);
    const opt = PARAMETER_OPTIONS.find((o) => o.value === p);
    if (opt) setUnit(opt.unit);
  };

  const handleSubmit = () => {
    onSave({
      name,
      parameter,
      scope,
      rule_type: 'nutrition',
      min_yellow: minYellow ? Number(minYellow) : null,
      min_green: minGreen ? Number(minGreen) : null,
      max_green: maxGreen ? Number(maxGreen) : null,
      max_yellow: maxYellow ? Number(maxYellow) : null,
      unit,
      hint_level: 'warn',
      tip_text: tipText,
      improvement_text: improvementText,
      is_active: isActive,
      sort_order: 0,
      description: '',
    });
  };

  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rule ? 'Regel bearbeiten' : 'Neue Regel'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="z.B. Zucker (Tag)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Parameter</label>
              <select value={parameter} onChange={(e) => handleParameterChange(e.target.value)} className={inputCls}>
                {PARAMETER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls}>
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Schwellwerte ({unit})</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5">Min Gelb (rot darunter)</label>
                <input type="number" value={minYellow} onChange={(e) => setMinYellow(e.target.value)} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5">Min Grün</label>
                <input type="number" value={minGreen} onChange={(e) => setMinGreen(e.target.value)} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5">Max Grün</label>
                <input type="number" value={maxGreen} onChange={(e) => setMaxGreen(e.target.value)} className={inputCls} placeholder="—" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-0.5">Max Gelb (rot darüber)</label>
                <input type="number" value={maxYellow} onChange={(e) => setMaxYellow(e.target.value)} className={inputCls} placeholder="—" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vorschau</label>
            <AmpelRangePreview
              minYellow={minYellow ? Number(minYellow) : null}
              minGreen={minGreen ? Number(minGreen) : null}
              maxGreen={maxGreen ? Number(maxGreen) : null}
              maxYellow={maxYellow ? Number(maxYellow) : null}
              unit={unit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipp-Text</label>
            <textarea value={tipText} onChange={(e) => setTipText(e.target.value)} rows={2} className={inputCls} placeholder="Empfehlung bei Gelb/Rot" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Verbesserungsvorschlag</label>
            <textarea value={improvementText} onChange={(e) => setImprovementText(e.target.value)} rows={2} className={inputCls} placeholder="Konkreter Verbesserungsvorschlag" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Aktiv
          </label>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={isPending || !name || !parameter}>
              {isPending ? 'Speichern...' : 'Speichern'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
