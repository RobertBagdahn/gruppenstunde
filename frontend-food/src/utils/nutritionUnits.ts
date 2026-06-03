/**
 * Convert Kilojoules (kJ) to Kilocalories (kcal).
 */
export function kjToKcal(kj: number): number {
  return kj / 4.184;
}

export interface PalOption {
  value: number;
  label: string;
  description: string;
}

export const PAL_OPTIONS: readonly PalOption[] = [
  { value: 1.2, label: 'Ruhend', description: 'Kaum körperliche Aktivität' },
  { value: 1.5, label: 'Moderat', description: 'Normale Pfadfinder-Aktivität' },
  { value: 1.75, label: 'Aktiv', description: 'Wanderung, Geländespiel' },
  { value: 2.0, label: 'Sehr aktiv', description: 'Hajk, intensives Lager' },
] as const;

/**
 * Maps a PAL value to a human-readable German label.
 */
export function getPalLabel(pal: number): string {
  if (pal <= 1.29) return 'Ruhend';
  if (pal <= 1.59) return 'Moderat';
  if (pal <= 1.89) return 'Aktiv';
  return 'Sehr aktiv';
}
