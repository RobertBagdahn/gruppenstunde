/** Explanations of the source badges shown on recipes and meal plans. */
export const SOURCE_BADGE_HELP = {
  verified: 'Inspi-verifiziert: vom Inspi-Team geprüft und freigegeben (kein privater Besitzer).',
  community: 'Community: von Nutzern erstellt und veröffentlicht. Nicht vom Inspi-Team geprüft.',
  personal: 'Persönlich: nur für dich sichtbar.',
  draft: 'Entwurf: noch nicht freigegeben, nur für dich sichtbar.',
} as const;

export type SourceBadgeKey = keyof typeof SOURCE_BADGE_HELP;

export function sourceBadgeHelp(key: string): string | undefined {
  return key in SOURCE_BADGE_HELP ? SOURCE_BADGE_HELP[key as SourceBadgeKey] : undefined;
}
