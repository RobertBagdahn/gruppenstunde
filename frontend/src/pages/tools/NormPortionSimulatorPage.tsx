import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
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
  ComposedChart,
} from 'recharts';
import { useNormPersonCalculation, useNormPersonCurves } from '@/api/normPerson';
import { useNutritionSummary } from '@/api/mealEvents';
import { useMealEvent } from '@/api/mealEvents';
import type { DgeReferencePoint } from '@/schemas/normPerson';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAL_OPTIONS = [
  { value: 1.2, label: 'Ruhend', description: 'Kaum koerperliche Aktivitaet' },
  { value: 1.5, label: 'Moderat', description: 'Normale Pfadfinder-Aktivitaet' },
  { value: 1.75, label: 'Aktiv', description: 'Wanderung, Gelaendespiel' },
  { value: 2.0, label: 'Sehr aktiv', description: 'Hajk, intensives Lager' },
] as const;

const GENDER_OPTIONS = [
  { value: 'male', label: 'Maennlich' },
  { value: 'female', label: 'Weiblich' },
] as const;

const CHART_COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  reference: '#f59e0b',
  dge_male: '#93c5fd',
  dge_female: '#f9a8d4',
  protein: '#10b981',
  fat: '#f59e0b',
  carbohydrate: '#6366f1',
  fibre: '#8b5cf6',
  ist: '#ef4444',
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
              ? 'border-amber-400 bg-amber-50 shadow-sm'
              : 'border-border/60 bg-card hover:border-amber-300 hover:bg-amber-50/50',
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
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
          info
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900">
            Referenz-Normperson
          </p>
          <p className="text-sm text-amber-800 mt-1">
            15 Jahre, maennlich, PAL 1.5 (moderat). Ein Normfaktor von 1.0
            entspricht dem Energiebedarf dieser Referenzperson. Werte ueber 1.0
            bedeuten hoeheren Bedarf, Werte unter 1.0 geringeren.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DGE data helpers                                                   */
/* ------------------------------------------------------------------ */

/** Convert DGE reference points to per-age data for chart overlay. */
function buildDgeEnergyOverlay(
  dgePoints: DgeReferencePoint[],
  pal: number,
): { age: number; dge_male_kcal: number | null; dge_female_kcal: number | null }[] {
  if (!dgePoints.length) return [];

  const palScale = pal / DGE_BASE_PAL;
  const byAge: Record<number, { male?: number; female?: number }> = {};

  for (const pt of dgePoints) {
    const midAge = Math.round((pt.age_min + pt.age_max) / 2);
    const energyKcal = (pt.energy_kj / 4.184) * palScale;
    if (!byAge[midAge]) byAge[midAge] = {};
    if (pt.gender === 'male') byAge[midAge].male = energyKcal;
    else byAge[midAge].female = energyKcal;
  }

  return Object.entries(byAge)
    .map(([age, vals]) => ({
      age: Number(age),
      dge_male_kcal: vals.male ?? null,
      dge_female_kcal: vals.female ?? null,
    }))
    .sort((a, b) => a.age - b.age);
}

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
    <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">stacked_bar_chart</span>
          Makronaehrstoff-Verteilung (DGE-Empfehlung)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Empfohlene Tageszufuhr in Gramm nach Altersgruppe und Geschlecht (M=Maennlich, W=Weiblich)
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
/*  Ist vs. Soll Comparison (MealEvent context)                        */
/* ------------------------------------------------------------------ */

function IstVsSollComparison({
  mealEventId,
  dgePoints,
  pal,
}: {
  mealEventId: number;
  dgePoints: DgeReferencePoint[];
  pal: number;
}) {
  const { data: mealEvent } = useMealEvent(mealEventId);
  const { data: nutrition } = useNutritionSummary(mealEventId);

  if (!nutrition || !mealEvent) return null;

  // Calculate average daily values (divide total by number of days)
  // We approximate by dividing total nutrition by norm_portions to get per-person values
  const perPerson = {
    energy_kj: nutrition.energy_kj / (mealEvent.norm_portions || 1),
    protein_g: nutrition.protein_g / (mealEvent.norm_portions || 1),
    fat_g: nutrition.fat_g / (mealEvent.norm_portions || 1),
    carbohydrate_g: nutrition.carbohydrate_g / (mealEvent.norm_portions || 1),
    fibre_g: nutrition.fibre_g / (mealEvent.norm_portions || 1),
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
      name: 'Energie (kJ)',
      ist: Math.round(perPerson.energy_kj),
      soll: Math.round(avgDge.energy_kj),
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
    <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">compare_arrows</span>
          Ist vs. Soll - {mealEvent.name}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vergleich der tatsaechlichen Naehrwerte pro Normportion mit DGE-Empfehlung (Durchschnitt 7-19 J.)
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
  const [pal, setPal] = useState<number>(chartPal);

  const { data, isLoading, error } = useNormPersonCalculation(age, gender, pal);

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">calculate</span>
          Einzelperson berechnen
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Age input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Alter (Jahre)
            </label>
            <input
              type="number"
              min={0}
              max={99}
              value={age ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setAge(v === '' ? null : Math.min(99, Math.max(0, parseInt(v, 10))));
              }}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          {/* Gender select */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Geschlecht
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* PAL select */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Aktivitaetslevel (PAL)
            </label>
            <select
              value={pal}
              onChange={(e) => setPal(parseFloat(e.target.value))}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              {PAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.value})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            Berechne...
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
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
              label="Referenzgroesse"
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
        'rounded-xl border px-3 py-2.5 text-center',
        highlight
          ? 'border-amber-300 bg-amber-50'
          : 'border-border/60 bg-muted/20',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-bold mt-0.5',
          highlight ? 'text-amber-700' : 'text-foreground',
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

  const mealEventId = useMemo(() => {
    const raw = searchParams.get('meal-event-id');
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }, [searchParams]);

  const handlePalChange = (newPal: number) => {
    const params: Record<string, string> = { pal: String(newPal) };
    if (mealEventId) params['meal-event-id'] = String(mealEventId);
    setSearchParams(params, { replace: true });
  };

  const { data: curves, isLoading, error } = useNormPersonCurves(pal);

  const referencePointIndex = curves?.data_points.findIndex(
    (p: { age: number }) => p.age === 15,
  );

  // Merge DGE overlay data into curve data points for the energy chart
  const dgeOverlay = useMemo(() => {
    if (!curves?.dge_reference?.length) return [];
    return buildDgeEnergyOverlay(curves.dge_reference, pal);
  }, [curves?.dge_reference, pal]);

  // Merge dge overlay into the data_points for the composed chart
  const energyChartData = useMemo(() => {
    if (!curves) return [];
    const dgeMap = new Map(dgeOverlay.map((d) => [d.age, d]));
    return curves.data_points.map((dp: { age: number; male_tdee: number; female_tdee: number }) => ({
      ...dp,
      dge_male_kcal: dgeMap.get(dp.age)?.dge_male_kcal ?? null,
      dge_female_kcal: dgeMap.get(dp.age)?.dge_female_kcal ?? null,
    }));
  }, [curves, dgeOverlay]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-2xl">
            calculate
          </span>
          Normportion-Simulator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisiere den Energiebedarf und Normfaktor nach Alter, Geschlecht
          und Aktivitaetslevel. Die Normfaktoren helfen bei der
          Portionsberechnung fuer unterschiedliche Altersgruppen.
        </p>
      </div>

      {/* MealEvent context banner */}
      {mealEventId && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 text-xl shrink-0 mt-0.5">
              restaurant_menu
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Essensplan-Kontext aktiv
              </p>
              <p className="text-sm text-blue-800 mt-1">
                Ist vs. Soll Vergleich wird unten angezeigt basierend auf den
                tatsaechlichen Naehrwerten des Essensplans.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reference info */}
      <ReferenceInfoCard />

      {/* PAL Selector */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">
          Aktivitaetslevel (PAL)
        </h2>
        <PalSelector value={pal} onChange={handlePalChange} />
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-2xl text-amber-500">
            progress_activity
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Daten konnten nicht geladen werden.
        </div>
      )}

      {/* Charts */}
      {curves && (
        <div className="space-y-6">
          {/* TDEE Chart with DGE overlay */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">local_fire_department</span>
                Tagesenergiebedarf (TDEE) nach Alter
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gesamtenergiebedarf in kcal pro Tag bei PAL {pal}
                {dgeOverlay.length > 0 && ' — gepunktete Linien zeigen DGE-Empfehlung'}
              </p>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="min-w-[400px]">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={energyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="age"
                      label={{ value: 'Alter (Jahre)', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      label={{ value: 'kcal/Tag', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip unit="kcal" />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {/* DGE reference lines (dashed) */}
                    {dgeOverlay.length > 0 && (
                      <>
                        <Line
                          type="stepAfter"
                          dataKey="dge_male_kcal"
                          name="DGE Maennlich"
                          stroke={CHART_COLORS.dge_male}
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="stepAfter"
                          dataKey="dge_female_kcal"
                          name="DGE Weiblich"
                          stroke={CHART_COLORS.dge_female}
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={false}
                          connectNulls
                        />
                      </>
                    )}
                    {/* TDEE calculated lines */}
                    <Line
                      type="monotone"
                      dataKey="male_tdee"
                      name="Maennlich"
                      stroke={CHART_COLORS.male}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="female_tdee"
                      name="Weiblich"
                      stroke={CHART_COLORS.female}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    {referencePointIndex !== undefined && referencePointIndex >= 0 && (
                      <ReferenceDot
                        x={15}
                        y={curves.data_points[referencePointIndex].male_tdee}
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

          {/* Norm Factor Chart */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">balance</span>
                Normfaktor nach Alter
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faktor relativ zur Referenz-Normperson (1.0 = 15 J., maennlich, PAL 1.5)
              </p>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="min-w-[400px]">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={curves.data_points}>
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
                      name="Maennlich"
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
                  </LineChart>
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

      {/* Ist vs. Soll (only when MealEvent context is provided) */}
      {mealEventId && curves && curves.dge_reference.length > 0 && (
        <IstVsSollComparison
          mealEventId={mealEventId}
          dgePoints={curves.dge_reference}
          pal={pal}
        />
      )}

      {/* Single Person Calculator */}
      <SinglePersonCalculator chartPal={pal} />
    </div>
  );
}
