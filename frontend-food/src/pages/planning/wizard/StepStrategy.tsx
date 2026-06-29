import { Copy, FileText, Sparkles } from 'lucide-react';
import type { MealPlanWizardState, MealPlanWizardStrategy } from '@/schemas/mealPlan';

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
      <p className="text-sm text-muted-foreground font-medium">
        Wie soll der neue Essensplan befüllt werden?
      </p>

      <div className="space-y-3">
        {STRATEGIES.map(({ key, icon: Icon, title, description }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStrategyChange(key)}
            className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
              state.strategy === key
                ? 'border-primary bg-primary/5 shadow-soft'
                : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${state.strategy === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {state.strategy === 'reference' && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Vorlage auswählen
          </label>
          <select
            value={state.reference_plan_id ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              const plan = plans.find((p) => p.id === id);
              onReferencePlanChange(id, plan?.name ?? '');
            }}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
          >
            <option value="">Plan auswählen...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.meals_count} Mahlzeiten)
              </option>
            ))}
          </select>
          {state.reference_plan_name && (
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              Vorlage: <span className="text-foreground">{state.reference_plan_name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
