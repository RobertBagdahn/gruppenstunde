import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Info, BarChart3, ArrowLeftRight, Loader2, Scale, Utensils } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  BarChart,
  Bar,
  Line,
  ComposedChart,
} from 'recharts';
import { useNormPersonCalculation, useNormPersonCurves } from '@/api/normPerson';
import { useNutritionSummary } from '@/api/mealPlans';
import { useMealPlan } from '@/api/mealPlans';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DgeReferencePoint } from '@/schemas/normPerson';
import { cn } from '@/lib/utils';
import { kjToKcal } from '@/utils/nutritionUnits';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAL_OPTIONS = [
  { value: 1.2, label: 'Ruhend', description: 'Kaum körperliche Aktivität' },
  { value: 1.5, label: 'Moderat', description: 'Normale Pfadfinder-Aktivität' },
  { value: 1.75, label: 'Aktiv', description: 'Wanderung, Geländespiel' },
  { value: 2.0, label: 'Sehr aktiv', description: 'Hajk, intensives Lager' },
] as const;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
 ] as const;

const CHART_COLORS = {
  male: 'hsl(var(--chart-2))',
  female: 'hsl(var(--chart-4))',
  reference: 'hsl(var(--chart-3))',
  dge_male: 'hsl(var(--chart-2))',
  dge_female: 'hsl(var(--chart-4))',
  protein: 'hsl(var(--chart-1))',
  fat: 'hsl(var(--chart-3))',
  carbohydrate: 'hsl(var(--chart-5))',
  fibre: 'hsl(var(--chart-2))',
  ist: 'hsl(var(--chart-1))',
} as const;

const DGE_BASE_PAL = 1.4;

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number | string;
  unit?: string;
}

function ChartTooltip({ active, payload, label, unit = '' }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-1">
        {typeof label === 'number' ? `Alter: ${label} Jahre` : label}
      </p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-sm" style={{ color: item.color }}>
          {item.name}: {typeof item.value === 'number' ? item.value.toFixed(1) : item.value} {unit}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAL Selector                                                       */
/* ------------------------------------------------------------------ */

interface PalSelectorProps {
  value: number;
  onChange: (pal: number) => void;
}

function PalSelector({ value, onChange }: PalSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PAL_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xl border px-3 py-2.5 text-left transition-all',
            value === option.value
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
          )}
        >
          <span className="block text-sm font-semibold text-foreground">
            {option.label} ({option.value})
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {option.description}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reference Info Card                                                */
/* ------------------------------------------------------------------ */

function ReferenceInfoCard() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-foreground font-display">
            Referenz-Normperson
          </h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            15 Jahre, männlich, PAL 1.5 (moderat). Ein Normfaktor von 1.0
            entspricht dem Energiebedarf dieser Referenzperson. Werte über 1.0
            bedeuten höheren Bedarf, Werte unter 1.0 geringeren.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DGE data helpers                                                   */
/* ------------------------------------------------------------------ */

/** Build macronutrient breakdown data for bar chart. */
function buildMacroBreakdownData(dgePoints: DgeReferencePoint[]) {
  if (!dgePoints.length) return [];

  // Group by age range
  const groups: Record<string, { male?: DgeReferencePoint; female?: DgeReferencePoint }> = {};
  for (const pt of dgePoints) {
    const key = `${pt.age_min}-${pt.age_max}`;
    if (!groups[key]) groups[key] = {};
    if (pt.gender === 'male') groups[key].male = pt;
    else groups[key].female = pt;
  }

  return Object.entries(groups)
    .sort(([a], [b]) => {
      const aMin = parseInt(a.split('-')[0], 10);
      const bMin = parseInt(b.split('-')[0], 10);
      return aMin - bMin;
    })
    .flatMap(([range, vals]) => {
      const result: {
        label: string;
        protein_g: number;
        fat_g: number;
        carbohydrate_g: number;
      }[] = [];
      if (vals.male) {
        result.push({
          label: `${range} M`,
          protein_g: vals.male.protein_g,
          fat_g: vals.male.fat_g,
          carbohydrate_g: vals.male.carbohydrate_g,
        });
      }
      if (vals.female) {
        result.push({
          label: `${range} W`,
          protein_g: vals.female.protein_g,
          fat_g: vals.female.fat_g,
          carbohydrate_g: vals.female.carbohydrate_g,
        });
      }
      return result;
    });
}

/* ------------------------------------------------------------------ */
/*  Macronutrient Breakdown Chart                                      */
/* ------------------------------------------------------------------ */

function MacroBreakdownChart({ dgePoints }: { dgePoints: DgeReferencePoint[] }) {
  const data = useMemo(() => buildMacroBreakdownData(dgePoints), [dgePoints]);

  if (!data.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2 font-display">
          <BarChart3 className="w-5 h-5 text-primary" />
          Makronährstoff-Verteilung (DGE-Empfehlung)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Empfohlene Tageszufuhr in Gramm nach Altersgruppe und Geschlecht (M=Männlich, W=Weiblich)
        </p>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[500px]">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                label={{ value: 'Gramm/Tag', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<ChartTooltip unit="g" />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="protein_g" name="Protein" fill={CHART_COLORS.protein} stackId="macro" />
              <Bar dataKey="fat_g" name="Fett" fill={CHART_COLORS.fat} stackId="macro" />
              <Bar dataKey="carbohydrate_g" name="Kohlenhydrate" fill={CHART_COLORS.carbohydrate} stackId="macro" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ist vs. Soll Comparison (MealPlan context)                        */
/* ------------------------------------------------------------------ */

function IstVsSollComparison({
  mealPlanId,
  dgePoints,
  pal,
}: {
  mealPlanId: number;
  dgePoints: DgeReferencePoint[];
  pal: number;
}) {
  const { data: mealPlan } = useMealPlan(mealPlanId);
  const { data: nutrition } = useNutritionSummary(mealPlanId);

  if (!nutrition || !mealPlan) return null;

  // Use backend-calculated per-portion values directly
  const perPerson = {
    energy_kj: nutrition.per_portion_energy_kj,
    protein_g: nutrition.per_portion_protein_g,
    fat_g: nutrition.per_portion_fat_g,
    carbohydrate_g: nutrition.per_portion_carbohydrate_g,
    fibre_g: nutrition.per_portion_fibre_g,
  };

  // Get a representative DGE reference (average male+female for age 10-15)
  const palScale = pal / DGE_BASE_PAL;
  const relevantDge = dgePoints.filter(
    (pt) => pt.age_min >= 7 && pt.age_max <= 19,
  );
  if (relevantDge.length === 0) return null;

  const avgDge = {
    energy_kj: (relevantDge.reduce((s, p) => s + p.energy_kj, 0) / relevantDge.length) * palScale,
    protein_g: relevantDge.reduce((s, p) => s + p.protein_g, 0) / relevantDge.length,
    fat_g: relevantDge.reduce((s, p) => s + p.fat_g, 0) / relevantDge.length,
    carbohydrate_g: relevantDge.reduce((s, p) => s + p.carbohydrate_g, 0) / relevantDge.length,
    fibre_g: relevantDge.reduce((s, p) => s + p.fibre_g, 0) / relevantDge.length,
  };

  const comparisonData = [
    {
      name: 'Energie (kcal)',
      ist: Math.round(kjToKcal(perPerson.energy_kj)),
      soll: Math.round(kjToKcal(avgDge.energy_kj)),
    },
    {
      name: 'Protein (g)',
      ist: Math.round(perPerson.protein_g * 10) / 10,
      soll: Math.round(avgDge.protein_g * 10) / 10,
    },
    {
      name: 'Fett (g)',
      ist: Math.round(perPerson.fat_g * 10) / 10,
      soll: Math.round(avgDge.fat_g * 10) / 10,
    },
    {
      name: 'Kohlenhydrate (g)',
      ist: Math.round(perPerson.carbohydrate_g * 10) / 10,
      soll: Math.round(avgDge.carbohydrate_g * 10) / 10,
    },
    {
      name: 'Ballaststoffe (g)',
      ist: Math.round(perPerson.fibre_g * 10) / 10,
      soll: Math.round(avgDge.fibre_g * 10) / 10,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2 font-display">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          Ist vs. Soll - {mealPlan.name}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vergleich der tatsächlichen Nährwerte pro Normportion mit DGE-Empfehlung (Durchschnitt 7-19 J.)
        </p>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[400px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="ist" name="Ist (pro Person)" fill={CHART_COLORS.ist} barSize={16} />
              <Bar dataKey="soll" name="Soll (DGE)" fill={CHART_COLORS.protein} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Person Calculator                                           */
/* ------------------------------------------------------------------ */

interface CalculatorProps {
  chartPal: number;
}

function SinglePersonCalculator({ chartPal }: CalculatorProps) {
  const [age, setAge] = useState<number | null>(12);
  const [gender, setGender] = useState<string>('male');

  const { data, isLoading, error } = useNormPersonCalculation(age, gender, chartPal);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 font-display">
          <Calculator className="w-5 h-5 text-primary" />
          Einzelperson berechnen
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Age input */}
          <div className="space-y-1.5">
            <Label htmlFor="calculator-age" className="text-sm font-medium text-foreground">
              Alter (Jahre)
            </Label>
            <Input
              id="calculator-age"
              type="number"
              min={0}
              max={99}
              value={age ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                setAge(v === '' ? null : Math.min(99, Math.max(0, parseInt(v, 10))));
              }}
            />
          </div>

          {/* Gender select */}
          <div className="space-y-1.5">
            <Label htmlFor="calculator-gender" className="text-sm font-medium text-foreground">
              Geschlecht
            </Label>
            <select
              id="calculator-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 h-10 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Berechne...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            Fehler bei der Berechnung.
          </div>
        )}

        {data && !isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ResultCard
              label="Normfaktor"
              value={data.norm_factor.toFixed(2)}
              highlight
            />
            <ResultCard
              label="Grundumsatz"
              value={`${data.bmr.toFixed(0)} kcal`}
            />
            <ResultCard
              label="Tagesbedarf"
              value={`${data.tdee.toFixed(0)} kcal`}
            />
            <ResultCard
              label="Referenzgewicht"
              value={`${data.weight_kg} kg`}
            />
            <ResultCard
              label="Referenzgröße"
              value={`${data.height_cm} cm`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function ResultCard({ label, value, highlight }: ResultCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5 text-center transition-all',
        highlight
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-muted/20',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-bold mt-0.5',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function NormPortionSimulatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const pal = useMemo(() => {
    const raw = searchParams.get('pal');
    if (!raw) return 1.5;
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed < 1.0 || parsed > 2.5) return 1.5;
    return parsed;
  }, [searchParams]);

  const mealPlanId = useMemo(() => {
    const raw = searchParams.get('meal-plan-id');
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }, [searchParams]);

  const handlePalChange = (newPal: number) => {
    const params: Record<string, string> = { pal: String(newPal) };
    if (mealPlanId) params['meal-plan-id'] = String(mealPlanId);
    setSearchParams(params, { replace: true });
  };

  const { data: curves, isLoading, error } = useNormPersonCurves(pal);

  const referencePointIndex = curves?.data_points.findIndex(
    (p: { age: number }) => p.age === 15,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 font-display">
          <Calculator className="w-6 h-6 text-primary" />
          Normportion-Simulator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisiere den Energiebedarf und Normfaktor nach Alter, Geschlecht
          und Aktivitätslevel. Die Normfaktoren helfen bei der
          Portionsberechnung für unterschiedliche Altersgruppen.
        </p>
      </div>

      {/* MealPlan context banner */}
      {mealPlanId && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Utensils className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground font-display">
                Essensplan-Kontext aktiv
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Ist vs. Soll Vergleich wird unten angezeigt basierend auf den
                tatsächlichen Nährwerten des Essensplans.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reference info */}
      <ReferenceInfoCard />

      {/* PAL Selector */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-foreground font-display">
          Aktivitätslevel (PAL)
        </h2>
        <PalSelector value={pal} onChange={handlePalChange} />
      </div>

      {/* Single Person Calculator */}
      <SinglePersonCalculator chartPal={pal} />

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          Daten konnten nicht geladen werden.
        </div>
      )}

      {/* Charts */}
      {curves && (
        <div className="space-y-6">
          {/* Norm Factor Chart */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2 font-display">
                <Scale className="w-5 h-5 text-primary" />
                Normfaktor nach Alter
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faktor relativ zur Referenz-Normperson (1.0 = 15 J., männlich, PAL 1.5)
              </p>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="min-w-[400px]">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={curves.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="age"
                      label={{ value: 'Alter (Jahre)', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      label={{ value: 'Normfaktor', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <ReferenceLine
                      y={1.0}
                      stroke={CHART_COLORS.reference}
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: 'Referenz (1.0)',
                        position: 'right',
                        fontSize: 11,
                        fill: CHART_COLORS.reference,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="male_norm_factor"
                      name="Männlich"
                      stroke={CHART_COLORS.male}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="female_norm_factor"
                      name="Weiblich"
                      stroke={CHART_COLORS.female}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    {referencePointIndex !== undefined && referencePointIndex >= 0 && (
                      <ReferenceDot
                        x={15}
                        y={1.0}
                        r={6}
                        fill={CHART_COLORS.reference}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Macronutrient Breakdown Chart */}
          {curves.dge_reference.length > 0 && (
            <MacroBreakdownChart dgePoints={curves.dge_reference} />
          )}
        </div>
      )}

      {/* Ist vs. Soll (only when MealPlan context is provided) */}
      {mealPlanId && curves && curves.dge_reference.length > 0 && (
        <IstVsSollComparison
          mealPlanId={mealPlanId}
          dgePoints={curves.dge_reference}
          pal={pal}
        />
      )}

    </div>
  );
}
