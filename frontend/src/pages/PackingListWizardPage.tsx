import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import {
  useGeneratePackingList,
  usePreviewPackingList,
  usePresets,
} from '@/api/packingLists';
import type { GenerateContext, Preset } from '@/schemas/packingList';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Constants for context options
// ---------------------------------------------------------------------------

const ACTIVITY_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'zeltlager', label: 'Zeltlager', icon: 'camping' },
  { value: 'hausfahrt', label: 'Hausfahrt', icon: 'cottage' },
  { value: 'tageswanderung', label: 'Tageswanderung', icon: 'hiking' },
  { value: 'wanderung', label: 'Wanderung', icon: 'terrain' },
  { value: 'hajk', label: 'Hajk', icon: 'backpack' },
  { value: 'radtour', label: 'Radtour', icon: 'directions_bike' },
  { value: 'kanutour', label: 'Kanutour', icon: 'kayaking' },
  { value: 'stadtfahrt', label: 'Stadtfahrt', icon: 'location_city' },
  { value: 'gruppenstunde', label: 'Gruppenstunde', icon: 'group' },
];

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'tagesfahrt', label: 'Tagesfahrt' },
  { value: 'wochenende', label: 'Wochenende' },
  { value: 'long-wochenende', label: 'Langes WE' },
  { value: '1-woche', label: '1 Woche' },
  { value: '2-wochen', label: '2+ Wochen' },
];

const SEASON_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'sommer', label: 'Sommer', icon: 'wb_sunny' },
  { value: 'winter', label: 'Winter', icon: 'ac_unit' },
];

const AGE_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'woelflinge', label: 'Wölflinge' },
  { value: 'jufis', label: 'Jungpfadfinder' },
  { value: 'pfadfinder', label: 'Pfadfinder' },
  { value: 'leiter', label: 'Leiter' },
];

// ---------------------------------------------------------------------------
// Helper: auto-generate title
// ---------------------------------------------------------------------------

function generateTitle(context: Partial<GenerateContext>): string {
  const parts: string[] = [];
  const activity = ACTIVITY_OPTIONS.find((a) => a.value === context.activity);
  const duration = DURATION_OPTIONS.find((d) => d.value === context.duration);
  const season = SEASON_OPTIONS.find((s) => s.value === context.season);

  if (activity) parts.push(activity.label);
  if (season) parts.push(season.label);
  if (duration) parts.push(`(${duration.label})`);

  return parts.join(' ') || 'Neue Packliste';
}

// ---------------------------------------------------------------------------
// Chip components
// ---------------------------------------------------------------------------

function SelectionChip({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
        selected
          ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
          : 'border-border bg-card text-foreground hover:border-teal-300 hover:bg-teal-50/50'
      }`}
    >
      {icon && (
        <span className="material-symbols-outlined text-base">{icon}</span>
      )}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preset cards
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  onClick,
}: {
  preset: Preset;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full"
    >
      <span className="material-symbols-outlined text-2xl text-teal-600">
        {preset.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{preset.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {preset.description}
        </div>
      </div>
      <span className="material-symbols-outlined text-muted-foreground text-base shrink-0">
        arrow_forward
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preview panel
// ---------------------------------------------------------------------------

function PreviewPanel({
  categories,
  totalItems,
  isLoading,
}: {
  categories: { name: string; item_count: number }[];
  totalItems: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-28 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-teal-600 text-lg">
          preview
        </span>
        <span className="font-semibold text-sm">Vorschau</span>
        <span className="text-xs text-muted-foreground ml-auto">
          ~{totalItems} Gegenstände in {categories.length} Kategorien
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <span
            key={cat.name}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
          >
            {cat.name}
            <span className="text-muted-foreground">({cat.item_count})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PackingListWizardPage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: presets } = usePresets();
  const generateMutation = useGeneratePackingList();
  const previewMutation = usePreviewPackingList();

  const [activity, setActivity] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleManuallySet, setTitleManuallySet] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-generate title when context changes (unless manually set)
  useEffect(() => {
    if (!titleManuallySet) {
      setTitle(generateTitle({ activity: activity ?? undefined, duration: duration ?? undefined, season: season ?? undefined }));
    }
  }, [activity, duration, season, titleManuallySet]);

  // Debounced preview
  const triggerPreview = useCallback(() => {
    if (!activity || !duration || !season) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      previewMutation.mutate({
        activity,
        duration,
        season,
        age_group: ageGroup,
      });
    }, 300);
  }, [activity, duration, season, ageGroup]);

  useEffect(() => {
    triggerPreview();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [triggerPreview]);

  const handlePresetClick = (preset: Preset) => {
    setActivity(preset.context.activity);
    setDuration(preset.context.duration);
    setSeason(preset.context.season);
    setAgeGroup(preset.context.age_group ?? null);
    setTitle(preset.name);
    setTitleManuallySet(true);
  };

  const handleSubmit = () => {
    if (!activity || !duration || !season) return;

    const finalTitle = title.trim() || generateTitle({ activity, duration, season });

    generateMutation.mutate(
      {
        title: finalTitle,
        context: {
          activity,
          duration,
          season,
          age_group: ageGroup,
        },
      },
      {
        onSuccess: (data) => {
          toast.success('Packliste erstellt!', {
            description: `${finalTitle} wurde mit ${data.categories.length} Kategorien angelegt.`,
          });
          navigate(`/packing-lists/${data.id}`);
        },
        onError: (err) => {
          toast.error('Fehler beim Erstellen', {
            description: err.message,
          });
        },
      },
    );
  };

  // Auth check
  if (userLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="animate-pulse h-32 bg-muted rounded-xl" />
          <div className="animate-pulse h-32 bg-muted rounded-xl" />
          <div className="animate-pulse h-32 bg-muted rounded-xl" />
          <div className="animate-pulse h-32 bg-muted rounded-xl" />
        </div>
        <div className="animate-pulse h-12 w-full bg-muted rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
          backpack
        </span>
        <h1 className="text-2xl font-bold mb-2">Neue Packliste</h1>
        <p className="text-muted-foreground mb-4">
          Melde dich an, um eine Packliste zu erstellen.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm hover:opacity-90 transition"
        >
          Anmelden
        </button>
      </div>
    );
  }

  const isPhase2 = activity !== null;
  const canSubmit = activity && duration && season && title.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/packing-lists/app')}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold">Neue Packliste</h1>
          <p className="text-sm text-muted-foreground">
            Wähle Aktivität und Details, um eine passende Packliste zu generieren.
          </p>
        </div>
      </div>

      {/* Presets quick selection */}
      {presets && presets.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Schnellwahl
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.slice(0, 6).map((preset) => (
              <PresetCard
                key={preset.name}
                preset={preset}
                onClick={() => handlePresetClick(preset)}
              />
            ))}
          </div>
          {presets.length > 6 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition">
                Alle {presets.length} Vorlagen anzeigen
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {presets.slice(6).map((preset) => (
                  <PresetCard
                    key={preset.name}
                    preset={preset}
                    onClick={() => handlePresetClick(preset)}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            oder individuell zusammenstellen
          </span>
        </div>
      </div>

      {/* Phase 1: Activity selection */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold mb-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
            1
          </span>
          Aktivitätstyp
        </h2>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <SelectionChip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={activity === opt.value}
              onClick={() => setActivity(opt.value)}
            />
          ))}
        </div>
      </div>

      {/* Phase 2: Details (animated in) */}
      <div
        className={`space-y-6 transition-all duration-300 ${
          isPhase2
            ? 'opacity-100 max-h-[2000px]'
            : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
        }`}
      >
        {/* Duration */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
              2
            </span>
            Dauer
          </h2>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <SelectionChip
                key={opt.value}
                label={opt.label}
                selected={duration === opt.value}
                onClick={() => setDuration(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Season */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
              3
            </span>
            Jahreszeit
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEASON_OPTIONS.map((opt) => (
              <SelectionChip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={season === opt.value}
                onClick={() => setSeason(opt.value)}
              />
            ))}
          </div>
        </div>

        {/* Age group (optional) */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
              4
            </span>
            Altersstufe
            <span className="text-xs text-muted-foreground font-normal ml-2">(optional)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUP_OPTIONS.map((opt) => (
              <SelectionChip
                key={opt.value}
                label={opt.label}
                selected={ageGroup === opt.value}
                onClick={() =>
                  setAgeGroup(ageGroup === opt.value ? null : opt.value)
                }
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-sm font-semibold mb-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold mr-2">
              5
            </span>
            Titel
          </h2>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleManuallySet(true);
            }}
            placeholder="z.B. Sommerlager 2026"
            className="max-w-md"
          />
        </div>

        {/* Preview */}
        {activity && duration && season && (
          <PreviewPanel
            categories={previewMutation.data?.categories ?? []}
            totalItems={previewMutation.data?.total_items ?? 0}
            isLoading={previewMutation.isPending}
          />
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || generateMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generateMutation.isPending ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">
                  progress_activity
                </span>
                Wird erstellt...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  add_circle
                </span>
                Packliste erstellen
              </>
            )}
          </button>
          <Link
            to="/packing-lists/app"
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Abbrechen
          </Link>
        </div>
      </div>

      {/* Escape hatch */}
      <div className="mt-8 pt-4 border-t">
        <Link
          to="/packing-lists/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          onClick={(e) => {
            e.preventDefault();
            navigate('/packing-lists/app', { state: { openCreate: true } });
          }}
        >
          <span className="material-symbols-outlined text-base">
            draft
          </span>
          Leere Liste erstellen
        </Link>
      </div>
    </div>
  );
}
