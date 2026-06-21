/**
 * Zod schemas for ContentCollaborator API.
 * MUST stay in sync with backend/content/schemas/collaborator.py
 */
import { z } from 'zod';

export const ContentCollaboratorOutSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(),
  user_display_name: z.string().nullable(),
  group_id: z.number().nullable(),
  group_name: z.string().nullable(),
  role: z.enum(['viewer', 'editor', 'admin']),
  created_by_id: z.number().nullable(),
  created_at: z.string(),
});
export type ContentCollaborator = z.infer<typeof ContentCollaboratorOutSchema>;

export const ContentCollaboratorInSchema = z.object({
  content_type_app: z.string(),
  content_type_model: z.string(),
  object_id: z.number(),
  user_id: z.number().nullable().optional(),
  group_id: z.number().nullable().optional(),
  role: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
});
export type ContentCollaboratorIn = z.infer<typeof ContentCollaboratorInSchema>;

export const ContentCollaboratorUpdateInSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']),
});
export type ContentCollaboratorUpdateIn = z.infer<typeof ContentCollaboratorUpdateInSchema>;
