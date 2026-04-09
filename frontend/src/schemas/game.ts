/**
 * Zod schemas for Game.
 * MUST stay in sync with backend/game/schemas.py
 */
import { z } from 'zod';
import {
  ContentListItemSchema,
  ContentDetailSchema,
  ContentSimilarSchema,
} from './content';
import { ContentMaterialItemSchema } from './supply';

// --- Game-specific options ---

export const GAME_TYPE_OPTIONS = [
  { value: 'field_game', label: 'Gelaendespiel' },
  { value: 'group_game', label: 'Gruppenspiel' },
  { value: 'icebreaker', label: 'Kennenlernspiel' },
  { value: 'cooperation', label: 'Kooperationsspiel' },
  { value: 'night_game', label: 'Nachtspiel' },
  { value: 'board_game', label: 'Brettspiel' },
  { value: 'running_game', label: 'Laufspiel' },
  { value: 'skill_game', label: 'Geschicklichkeitsspiel' },
] as const;

export const PLAY_AREA_OPTIONS = [
  { value: 'indoor', label: 'Drinnen' },
  { value: 'outdoor', label: 'Draussen' },
  { value: 'field', label: 'Wiese / Feld' },
  { value: 'forest', label: 'Wald' },
  { value: 'gym', label: 'Turnhalle' },
  { value: 'any', label: 'Ueberall' },
] as const;

// --- List schema ---

export const GameListItemSchema = ContentListItemSchema.extend({
  game_type: z.string(),
  play_area: z.string(),
  min_players: z.number().nullable(),
  max_players: z.number().nullable(),
  game_duration_minutes: z.number().nullable(),
});
export type GameListItem = z.infer<typeof GameListItemSchema>;

// --- Detail schema ---

export const GameDetailSchema = ContentDetailSchema.extend({
  game_type: z.string(),
  play_area: z.string(),
  min_players: z.number().nullable(),
  max_players: z.number().nullable(),
  game_duration_minutes: z.number().nullable(),
  rules: z.string(),
  materials: z.array(ContentMaterialItemSchema).default([]),
  similar_games: z.array(ContentSimilarSchema).default([]),
});
export type GameDetail = z.infer<typeof GameDetailSchema>;

// --- Paginated response ---

export const PaginatedGamesSchema = z.object({
  items: z.array(GameListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedGames = z.infer<typeof PaginatedGamesSchema>;

// --- Filter type ---

export interface GameFilter {
  q?: string;
  game_type?: string;
  play_area?: string;
  scout_level_ids?: number[];
  tag_slugs?: string[];
  difficulty?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}
