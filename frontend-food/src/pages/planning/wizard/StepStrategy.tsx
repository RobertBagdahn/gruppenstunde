import { Copy, FileText, LayoutGrid, Sparkles } from 'lucide-react';
import type { MealPlanWizardState, MealPlanWizardStrategy } from '@/schemas/mealPlan';
import WizardSectionHeading from './WizardSectionHeading';
import { WIZARD_INPUT_CLASS, WIZARD_LABEL_CLASS } from './wizardStyles';

interface StepStrategyProps {
  state: MealPlanWizardState;
  plans: { id: number; name: string; meals_count: number }[];
  onStrategyChange: (strategy: MealPlanWizardStrategy) => void;
  onReferencePlanChange: (planId: number | null, planName: string) => void;
}

const STRATEGIES: {
  key: MealPlanWizardStrategy;
  icon: typeof FileText;
  title: string;
  description: string;
}[] = [
  {
    key: 'empty',
    icon: FileText,
    title: 'Leeren Plan erstellen',
    description: 'Erstellt ein Grundgerüst mit Tagen und leeren Mahlzeiten. Du füllst später Rezepte ein.',
  },
  {
    key: 'reference',
    icon: Copy,
    title: 'Aus Referenz kopieren',
    description: 'Übernimmt alle Mahlzeiten und Rezepte eines bestehenden Plans als Vorlage.',
  },
  {
    key: 'ai',
    icon: Sparkles,
    title: 'KI generieren lassen',
    description: 'Beschreibe dein Lager und die KI schlägt passende Rezepte aus der Datenbank vor.',
  },
];

export default function StepStrategy({
  state,
  plans,
  onStrategyChange,
  onReferencePlanChange,
}: StepStrategyProps) {
  return (
    <div className="space-y-5">
      <div>
        <WizardSectionHeading icon={<LayoutGrid className="h-5 w-5" />}>Befüllung</WizardSectionHeading>
        <p className="text-body text-muted-foreground">
          Wie soll der neue Essensplan befüllt werden?
        </p>
      </div>

      <div className="space-y-3">
        {STRATEGIES.map(({ key, icon: Icon, title, description }) => {
          const selected = state.strategy === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStrategyChange(key)}
              aria-pressed={selected}
              className={`w-full min-h-11 rounded-xl border-2 p-4 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-card shadow-card hover:border-primary/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    selected ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-body text-foreground">{title}</h4>
                  <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {state.strategy === 'reference' && (
        <div>
          <label htmlFor="wiz-strategy-reference" className={WIZARD_LABEL_CLASS}>
            Vorlage auswählen
          </label>
          <select
            id="wiz-strategy-reference"
            value={state.reference_plan_id ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const plan = plans.find((p) => p.id === id);
              onReferencePlanChange(id, plan?.name ?? '');
            }}
            className={WIZARD_INPUT_CLASS}
          >
            <option value="">Plan auswählen...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.meals_count} Mahlzeiten)
              </option>
            ))}
          </select>
          {state.reference_plan_name && (
            <p className="mt-2 text-caption text-muted-foreground">
              Vorlage: <span className="text-foreground">{state.reference_plan_name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
