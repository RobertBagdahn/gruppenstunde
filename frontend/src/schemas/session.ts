/**
 * Zod schemas for GroupSession.
 * MUST stay in sync with backend/session/schemas.py
 */
import { z } from 'zod';
import {
  ContentListItemSchema,
  ContentDetailSchema,
  ContentSimilarSchema,
} from './content';
import { ContentMaterialItemSchema } from './supply';

// --- Session-specific options ---

export const SESSION_TYPE_OPTIONS = [
  { value: 'scout_skills', label: 'Pfadfindertechnik' },
  { value: 'navigation', label: 'Navigation & Orientierung' },
  { value: 'nature_study', label: 'Naturkunde' },
  { value: 'crafts', label: 'Basteln & Werken' },
  { value: 'active_games', label: 'Bewegungsspiele' },
  { value: 'outdoor_cooking', label: 'Kochen & Backen' },
  { value: 'first_aid', label: 'Erste Hilfe' },
  { value: 'community', label: 'Gemeinschaft & Soziales' },
  { value: 'campfire_culture', label: 'Lagerfeuer & Singerunde' },
  { value: 'exploration', label: 'Erkundung & Abenteuer' },
] as const;

export const LOCATION_TYPE_OPTIONS = [
  { value: 'indoor', label: 'Drinnen' },
  { value: 'outdoor', label: 'Draussen' },
  { value: 'both', label: 'Drinnen & Draussen' },
] as const;

// --- List schema ---

export const GroupSessionListItemSchema = ContentListItemSchema.extend({
  session_type: z.string(),
  location_type: z.string(),
  min_participants: z.number().nullable(),
  max_participants: z.number().nullable(),
});
export type GroupSessionListItem = z.infer<typeof GroupSessionListItemSchema>;

// --- Detail schema ---

export const GroupSessionDetailSchema = ContentDetailSchema.extend({
  session_type: z.string(),
  location_type: z.string(),
  min_participants: z.number().nullable(),
  max_participants: z.number().nullable(),
  materials: z.array(ContentMaterialItemSchema).default([]),
  similar_sessions: z.array(ContentSimilarSchema).default([]),
});
export type GroupSessionDetail = z.infer<typeof GroupSessionDetailSchema>;

// --- Paginated response ---

export const PaginatedGroupSessionsSchema = z.object({
  items: z.array(GroupSessionListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedGroupSessions = z.infer<typeof PaginatedGroupSessionsSchema>;

// --- Filter type ---

export interface GroupSessionFilter {
  q?: string;
  session_type?: string;
  location_type?: string;
  scout_level_ids?: number[];
  tag_slugs?: string[];
  difficulty?: string;
  costs_rating?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}
