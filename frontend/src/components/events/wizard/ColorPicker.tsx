/**
 * ColorPicker — 15 predefined Tailwind colors as selectable circles.
 * Matches EventColorChoices from the backend.
 */
import { cn } from '@/lib/utils';

const EVENT_COLORS = [
  { value: 'slate', bg: 'bg-slate-500', ring: 'ring-slate-400', label: 'Schiefergrau' },
  { value: 'red', bg: 'bg-red-500', ring: 'ring-red-400', label: 'Rot' },
  { value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-400', label: 'Orange' },
  { value: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-400', label: 'Bernstein' },
  { value: 'yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-400', label: 'Gelb' },
  { value: 'lime', bg: 'bg-lime-500', ring: 'ring-lime-400', label: 'Limette' },
  { value: 'green', bg: 'bg-green-500', ring: 'ring-green-400', label: 'Grün' },
  { value: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-400', label: 'Smaragd' },
  { value: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-400', label: 'Türkis' },
  { value: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-400', label: 'Cyan' },
  { value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-400', label: 'Blau' },
  { value: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-400', label: 'Violett' },
  { value: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-400', label: 'Lila' },
  { value: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400', label: 'Pink' },
  { value: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-400', label: 'Rosa' },
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Farbe</label>
      <div className="flex flex-wrap gap-2">
        {EVENT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            title={c.label}
            className={cn(
              'w-8 h-8 rounded-full transition-all',
              c.bg,
              value === c.value
                ? `ring-2 ring-offset-2 ${c.ring} scale-110`
                : 'hover:scale-110',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Utility: get Tailwind bg class for a color value */
export function getColorBgClass(color: string): string {
  return EVENT_COLORS.find((c) => c.value === color)?.bg ?? 'bg-blue-500';
}

/** Utility: get lighter Tailwind bg class for a color value (for cards/banners) */
export function getColorBgLightClass(color: string): string {
  const map: Record<string, string> = {
    slate: 'bg-slate-100', red: 'bg-red-100', orange: 'bg-orange-100',
    amber: 'bg-amber-100', yellow: 'bg-yellow-100', lime: 'bg-lime-100',
    green: 'bg-green-100', emerald: 'bg-emerald-100', teal: 'bg-teal-100',
    cyan: 'bg-cyan-100', blue: 'bg-blue-100', violet: 'bg-violet-100',
    purple: 'bg-purple-100', pink: 'bg-pink-100', rose: 'bg-rose-100',
  };
  return map[color] ?? 'bg-blue-100';
}
