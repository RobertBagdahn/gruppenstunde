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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AmpelRangePreview from './AmpelRangePreview';
import type { Rule, RuleIn } from '@/schemas/suggestions';

const SCOPE_OPTIONS = [
  { value: 'day', label: 'Tag' },
  { value: 'meal_event', label: 'Essensplan' },
  { value: 'meal', label: 'Mahlzeit' },
  { value: 'recipe', label: 'Rezept' },
];

const PARAMETER_OPTIONS = [
  { value: 'energy_kj', label: 'Energie (kcal)', unit: 'kcal' },
  { value: 'protein_g', label: 'Eiweiß (g)', unit: 'g' },
  { value: 'fat_g', label: 'Fett (g)', unit: 'g' },
  { value: 'fat_sat_g', label: 'Gesättigte Fettsäuren (g)', unit: 'g' },
  { value: 'carbohydrate_g', label: 'Kohlenhydrate (g)', unit: 'g' },
  { value: 'sugar_g', label: 'Zucker (g)', unit: 'g' },
  { value: 'fibre_g', label: 'Ballaststoffe (g)', unit: 'g' },
  { value: 'salt_g', label: 'Salz (g)', unit: 'g' },
  { value: 'sodium_mg', label: 'Natrium (mg)', unit: 'mg' },
  { value: 'price_total', label: 'Preis (€)', unit: '€' },
  { value: 'weight_g', label: 'Gewicht (g)', unit: 'g' },
  { value: 'nutri_class', label: 'Nutri-Score (A=1 bis E=5)', unit: '' },
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
      setUnit('kcal');
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

  const selectCls = 'w-full rounded-lg border border-input bg-background px-3 h-10 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">{rule ? 'Regel bearbeiten' : 'Neue Regel'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input id="rule-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Zucker (Tag)" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-parameter">Parameter</Label>
              <select id="rule-parameter" value={parameter} onChange={(e) => handleParameterChange(e.target.value)} className={selectCls}>
                {PARAMETER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-scope">Scope</Label>
              <select id="rule-scope" value={scope} onChange={(e) => setScope(e.target.value)} className={selectCls}>
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {scope === 'recipe' ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground/85 leading-relaxed">
              Rezeptregeln gelten nur für Kalte und Warme Mahlzeit. Für Frühstück, Snacks, Nachtisch und Getränke werden diese Regeln im Planer auf die gesamte Mahlzeit angewandt.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed">
              Planer-Regeln werden aggregiert auf alle Mahlzeittypen angewandt.
            </div>
          )}

          <div className="space-y-3">
            <Label className="block text-sm font-medium">Schwellwerte ({unit})</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="min-yellow" className="text-xs text-muted-foreground">Min Gelb (rot darunter)</Label>
                <Input id="min-yellow" type="number" value={minYellow} onChange={(e) => setMinYellow(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="min-green" className="text-xs text-muted-foreground">Min Grün</Label>
                <Input id="min-green" type="number" value={minGreen} onChange={(e) => setMinGreen(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-green" className="text-xs text-muted-foreground">Max Grün</Label>
                <Input id="max-green" type="number" value={maxGreen} onChange={(e) => setMaxGreen(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-yellow" className="text-xs text-muted-foreground">Max Gelb (rot darüber)</Label>
                <Input id="max-yellow" type="number" value={maxYellow} onChange={(e) => setMaxYellow(e.target.value)} placeholder="—" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vorschau</Label>
            <div className="p-1">
              <AmpelRangePreview
                minYellow={minYellow ? Number(minYellow) : null}
                minGreen={minGreen ? Number(minGreen) : null}
                maxGreen={maxGreen ? Number(maxGreen) : null}
                maxYellow={maxYellow ? Number(maxYellow) : null}
                unit={unit}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tip-text">Tipp-Text</Label>
            <Textarea id="tip-text" value={tipText} onChange={(e) => setTipText(e.target.value)} rows={2} placeholder="Empfehlung bei Gelb/Rot" className="resize-none" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="improvement-text">Verbesserungsvorschlag</Label>
            <Textarea id="improvement-text" value={improvementText} onChange={(e) => setImprovementText(e.target.value)} rows={2} placeholder="Konkreter Verbesserungsvorschlag" className="resize-none" />
          </div>

          <div className="flex items-center pt-1">
            <Label htmlFor="rule-is-active" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="rule-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              Aktiv
            </Label>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSubmit} disabled={isPending || !name || !parameter} className="flex-1">
              {isPending ? 'Speichern...' : 'Speichern'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Abbrechen
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
