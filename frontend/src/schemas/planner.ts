/**
 * Zod schemas for Planner API.
 * MUST stay in sync with backend/planner/schemas.py
 */
import { z } from 'zod';

export const PlannerSchema = z.object({
  id: z.number(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Planner = z.infer<typeof PlannerSchema>;

export const PlannerEntrySchema = z.object({
  id: z.number(),
  idea_id: z.number().nullable(),
  idea_title: z.string().nullable(),
  date: z.string(),
  notes: z.string(),
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
  entries: z.array(PlannerEntrySchema),
  collaborators: z.array(CollaboratorSchema),
  created_at: z.string(),
});
export type PlannerDetail = z.infer<typeof PlannerDetailSchema>;
