/**
 * Zod schemas for Planner API.
 * MUST stay in sync with backend/planner/schemas.py
 */
import { z } from 'zod';

export const PlannerSchema = z.object({
  id: z.number(),
  title: z.string(),
  group_id: z.number().nullable(),
  group_name: z.string(),
  weekday: z.number(),
  time: z.string(), // HH:MM:SS from backend
  created_at: z.string(),
  updated_at: z.string(),
});
export type Planner = z.infer<typeof PlannerSchema>;

export const PlannerEntrySchema = z.object({
  id: z.number(),
  session_id: z.number().nullable(),
  session_title: z.string().nullable(),
  session_slug: z.string().nullable(),
  date: z.string(),
  notes: z.string(),
  status: z.string(),
  sort_order: z.number(),
});
export type PlannerEntry = z.infer<typeof PlannerEntrySchema>;

export const CollaboratorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  username: z.string(),
  role: z.string(),
});
export type Collaborator = z.infer<typeof CollaboratorSchema>;

export const PlannerDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  group_id: z.number().nullable(),
  group_name: z.string(),
  weekday: z.number(),
  time: z.string(),
  entries: z.array(PlannerEntrySchema),
  collaborators: z.array(CollaboratorSchema),
  can_edit: z.boolean(),
  created_at: z.string(),
});
export type PlannerDetail = z.infer<typeof PlannerDetailSchema>;

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Montag',
  1: 'Dienstag',
  2: 'Mittwoch',
  3: 'Donnerstag',
  4: 'Freitag',
  5: 'Samstag',
  6: 'Sonntag',
};
