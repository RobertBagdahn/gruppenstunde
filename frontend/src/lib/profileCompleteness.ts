/**
 * Utility to calculate profile completeness percentage.
 * Purely client-side — no additional API calls needed.
 */
import type { UserProfile, UserPreference } from '@/schemas/profile';

interface CompletenessResult {
  percentage: number;
  missingFields: string[];
}

const WEIGHTS = {
  name: 15,
  scoutName: 15,
  profilePicture: 20,
  gender: 10,
  birthday: 10,
  aboutMe: 15,
  preferences: 15,
} as const;

export function calculateProfileCompleteness(
  profile: UserProfile | undefined,
  preferences: UserPreference | undefined,
): CompletenessResult {
  if (!profile) return { percentage: 0, missingFields: ['Profil laden...'] };

  const missing: string[] = [];
  let earned = 0;

  if (profile.first_name && profile.last_name) {
    earned += WEIGHTS.name;
  } else {
    missing.push('Vor- und Nachname');
  }

  if (profile.scout_name) {
    earned += WEIGHTS.scoutName;
  } else {
    missing.push('Pfadfindername');
  }

  if (profile.profile_picture_url) {
    earned += WEIGHTS.profilePicture;
  } else {
    missing.push('Profilbild');
  }

  if (profile.gender && profile.gender !== 'no_answer') {
    earned += WEIGHTS.gender;
  } else {
    missing.push('Geschlecht');
  }

  if (profile.birthday) {
    earned += WEIGHTS.birthday;
  } else {
    missing.push('Geburtstag');
  }

  if (profile.about_me) {
    earned += WEIGHTS.aboutMe;
  } else {
    missing.push('Über mich');
  }

  if (
    preferences &&
    (preferences.preferred_difficulty ||
      preferences.preferred_location ||
      preferences.preferred_group_size_min !== null ||
      preferences.preferred_group_size_max !== null ||
      preferences.preferred_scout_level_id !== null)
  ) {
    earned += WEIGHTS.preferences;
  } else {
    missing.push('Suchpräferenzen');
  }

  return { percentage: earned, missingFields: missing };
}
