/**
 * IconPicker — 36 verified Lucide icons in grid layout.
 * Matches EventIconChoices from the backend.
 * Uses `flame` (NOT `campfire`) and `tree-pine` (NOT `tree`).
 */
import { cn } from '@/lib/utils';
import {
  Tent, Flame, Compass, Map, Mountain, TreePine,
  Sun, Moon, Star, Heart, Flag, Users,
  Music, Book, Utensils, Backpack, Flashlight, Binoculars,
  Anchor, Shield, Award, Crown, Zap, Cloud,
  Snowflake, Umbrella, Leaf, Fish, Bird, MapPin,
  Calendar, Home, Coffee, Palette, Sparkles, Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface IconDef {
  value: string;
  Icon: LucideIcon;
  label: string;
}

const EVENT_ICONS: IconDef[] = [
  { value: 'tent', Icon: Tent, label: 'Zelt' },
  { value: 'flame', Icon: Flame, label: 'Feuer' },
  { value: 'compass', Icon: Compass, label: 'Kompass' },
  { value: 'map', Icon: Map, label: 'Karte' },
  { value: 'mountain', Icon: Mountain, label: 'Berg' },
  { value: 'tree-pine', Icon: TreePine, label: 'Baum' },
  { value: 'sun', Icon: Sun, label: 'Sonne' },
  { value: 'moon', Icon: Moon, label: 'Mond' },
  { value: 'star', Icon: Star, label: 'Stern' },
  { value: 'heart', Icon: Heart, label: 'Herz' },
  { value: 'flag', Icon: Flag, label: 'Flagge' },
  { value: 'users', Icon: Users, label: 'Gruppe' },
  { value: 'music', Icon: Music, label: 'Musik' },
  { value: 'book', Icon: Book, label: 'Buch' },
  { value: 'utensils', Icon: Utensils, label: 'Besteck' },
  { value: 'backpack', Icon: Backpack, label: 'Rucksack' },
  { value: 'flashlight', Icon: Flashlight, label: 'Taschenlampe' },
  { value: 'binoculars', Icon: Binoculars, label: 'Fernglas' },
  { value: 'anchor', Icon: Anchor, label: 'Anker' },
  { value: 'shield', Icon: Shield, label: 'Schild' },
  { value: 'award', Icon: Award, label: 'Auszeichnung' },
  { value: 'crown', Icon: Crown, label: 'Krone' },
  { value: 'zap', Icon: Zap, label: 'Blitz' },
  { value: 'cloud', Icon: Cloud, label: 'Wolke' },
  { value: 'snowflake', Icon: Snowflake, label: 'Schneeflocke' },
  { value: 'umbrella', Icon: Umbrella, label: 'Regenschirm' },
  { value: 'leaf', Icon: Leaf, label: 'Blatt' },
  { value: 'fish', Icon: Fish, label: 'Fisch' },
  { value: 'bird', Icon: Bird, label: 'Vogel' },
  { value: 'map-pin', Icon: MapPin, label: 'Kartennadel' },
  { value: 'calendar', Icon: Calendar, label: 'Kalender' },
  { value: 'home', Icon: Home, label: 'Haus' },
  { value: 'coffee', Icon: Coffee, label: 'Kaffee' },
  { value: 'palette', Icon: Palette, label: 'Palette' },
  { value: 'sparkles', Icon: Sparkles, label: 'Funken' },
  { value: 'rocket', Icon: Rocket, label: 'Rakete' },
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Icon</label>
      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
        {EVENT_ICONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            title={item.label}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-all',
              value === item.value
                ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105',
            )}
          >
            <item.Icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Get Lucide component by icon value string */
export function getEventIcon(iconValue: string): LucideIcon {
  return EVENT_ICONS.find((i) => i.value === iconValue)?.Icon ?? Tent;
}
