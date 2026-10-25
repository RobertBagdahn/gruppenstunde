import DetailHeader from '@/components/shared/DetailHeader';
import { useState, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Calculator, Info, BarChart3, ArrowLeftRight, Loader2, Scale, Utensils } from 'lucide-react';
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
import { formatNumber } from '@/lib/format';
import { WIZARD_INPUT_CLASS, WIZARD_LABEL_CLASS } from '@/pages/planning/wizard/wizardStyles';

/* ------------------------------------------------------------------ */
/*  Section heading (icon plaque + uppercase label, Canvas layout)     */
/* ------------------------------------------------------------------ */

function SectionHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-body font-semibold uppercase tracking-wide text-muted-foreground">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      {children}
    </h2>
  );
}

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
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
      <p className="text-body font-semibold text-foreground mb-1">
        {typeof label === 'number' ? `Alter: ${label} Jahre` : label}
      </p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-body" style={{ color: item.color }}>
          {item.name}: {typeof item.value === 'number' ? formatNumber(item.value, { maxDecimals: 1 }) : item.value} {unit}
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
          aria-pressed={value === option.value}
          className={cn(
            'press min-h-11 rounded-xl border px-3 py-2.5 text-left transition-colors',
            value === option.value
              ? 'border-primary bg-primary-soft text-primary-dark'
              : 'border-border bg-card hover:border-primary-soft-border hover:bg-primary-soft',
          )}
        >
          <span className="block text-body font-semibold text-foreground">
            {option.label} ({option.value})
          </span>
          <span className="block text-caption text-muted-foreground mt-0.5">
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
    <div className="rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Info className="w-5 h-5" />
        </span>
        <div>
          <h4 className="text-emphasis font-bold text-foreground font-display">
            Referenz-Normperson
          </h4>
          <p className="text-body text-muted-foreground mt-1 leading-relaxed">
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
    <div className="rounded-xl bg-card p-4 md:p-6 shadow-card">
      <div className="mb-4">
        <SectionHeading icon={<BarChart3 className="w-5 h-5" />}>
          Makronährstoff-Verteilung (DGE-Empfehlung)
        </SectionHeading>
        <p className="text-caption text-muted-foreground mt-2">
          Empfohlene Tageszufuhr in Gramm nach Altersgruppe und Geschlecht (M=Männlich, W=Weiblich)
        </p>
      </div>
      <div className="overflow-x-auto">
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
    energy_kcal: nutrition.per_portion_energy_kcal,
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
    energy_kcal: (relevantDge.reduce((s, p) => s + p.energy_kcal, 0) / relevantDge.length) * palScale,
    protein_g: relevantDge.reduce((s, p) => s + p.protein_g, 0) / relevantDge.length,
    fat_g: relevantDge.reduce((s, p) => s + p.fat_g, 0) / relevantDge.length,
    carbohydrate_g: relevantDge.reduce((s, p) => s + p.carbohydrate_g, 0) / relevantDge.length,
    fibre_g: relevantDge.reduce((s, p) => s + p.fibre_g, 0) / relevantDge.length,
  };

  const comparisonData = [
    {
      name: 'Energie (kcal)',
      ist: Math.round(perPerson.energy_kcal),
      soll: Math.round(avgDge.energy_kcal),
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
    <div className="rounded-xl bg-card p-4 md:p-6 shadow-card">
      <div className="mb-4">
        <SectionHeading icon={<ArrowLeftRight className="w-5 h-5" />}>
          Ist vs. Soll - {mealPlan.name}
        </SectionHeading>
        <p className="text-caption text-muted-foreground mt-2">
          Vergleich der tatsächlichen Nährwerte pro Normportion mit DGE-Empfehlung (Durchschnitt 7-19 J.)
        </p>
      </div>
      <div className="overflow-x-auto">
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
  const [searchParams] = useSearchParams();
  const initialAge = useMemo(() => {
    const raw = searchParams.get('age');
    if (!raw) return 12;
    const p = parseInt(raw, 10);
    return isNaN(p) || p < 0 || p > 99 ? 12 : p;
  }, [searchParams]);
  const initialGender = useMemo(() => {
    const raw = searchParams.get('gender');
    if (raw === 'male' || raw === 'female') return raw;
    return 'male';
  }, [searchParams]);

  const [age, setAge] = useState<number | null>(initialAge);
  const [gender, setGender] = useState<string>(initialGender);

  const { data, isLoading, error } = useNormPersonCalculation(age, gender, chartPal);

  return (
    <div className="rounded-xl bg-card p-4 md:p-6 shadow-card">
      <div className="mb-4">
        <SectionHeading icon={<Calculator className="w-5 h-5" />}>
          Einzelperson berechnen
        </SectionHeading>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Age input */}
          <div>
            <Label htmlFor="calculator-age" className={WIZARD_LABEL_CLASS}>
              Alter (Jahre)
            </Label>
            <Input
              id="calculator-age"
              className={WIZARD_INPUT_CLASS}
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
          <div>
            <Label htmlFor="calculator-gender" className={WIZARD_LABEL_CLASS}>
              Geschlecht
            </Label>
            <select
              id="calculator-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={WIZARD_INPUT_CLASS}
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
          <div className="flex items-center gap-2 text-body text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Berechne...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-danger-soft border border-danger-border p-3 text-body text-danger-foreground">
            Fehler bei der Berechnung.
          </div>
        )}

        {data && !isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <ResultCard
              label="Normfaktor"
              value={formatNumber(data.norm_factor, { maxDecimals: 2 })}
              highlight
            />
            <ResultCard
              label="Grundumsatz"
              value={`${formatNumber(data.bmr, { maxDecimals: 0 })} kcal`}
            />
            <ResultCard
              label="Tagesbedarf"
              value={`${formatNumber(data.tdee, { maxDecimals: 0 })} kcal`}
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
        'rounded-xl px-3 py-2.5 text-center shadow-card',
        highlight ? 'bg-primary-soft' : 'bg-card',
      )}
    >
      <p className="text-caption uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-section font-bold mt-0.5',
          highlight ? 'text-primary-dark' : 'text-foreground',
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
    <div className="pb-8">
    <DetailHeader
      title="Normportion-Simulator"
      description="Visualisiere den Energiebedarf und Normfaktor nach Alter, Geschlecht und Aktivitätslevel. Die Normfaktoren helfen bei der Portionsberechnung für unterschiedliche Altersgruppen."
    />
    <div className="max-w-5xl mx-auto px-4 space-y-6">

      {/* MealPlan context banner */}
      {mealPlanId && (
        <div className="rounded-xl bg-primary-soft p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
              <Utensils className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-emphasis font-semibold text-primary-dark font-display">
                Essensplan-Kontext aktiv
              </h4>
              <p className="text-body text-muted-foreground mt-1">
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
      <div className="rounded-xl bg-card p-4 md:p-6 shadow-card space-y-4">
        <SectionHeading icon={<Activity className="w-5 h-5" />}>
          Aktivitätslevel (PAL)
        </SectionHeading>
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
        <div className="rounded-xl bg-danger-soft border border-danger-border p-4 text-body text-danger-foreground">
          Daten konnten nicht geladen werden.
        </div>
      )}

      {/* Charts */}
      {curves && (
        <div className="space-y-6">
          {/* Norm Factor Chart */}
          <div className="rounded-xl bg-card p-4 md:p-6 shadow-card">
            <div className="mb-4">
              <SectionHeading icon={<Scale className="w-5 h-5" />}>
                Normfaktor nach Alter
              </SectionHeading>
              <p className="text-caption text-muted-foreground mt-2">
                Faktor relativ zur Referenz-Normperson (1.0 = 15 J., männlich, PAL 1.5)
              </p>
            </div>
            <div className="overflow-x-auto">
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
                        stroke="hsl(var(--card))"
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
    </div>
  );
}
