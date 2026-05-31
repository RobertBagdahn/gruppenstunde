/**
 * Zod schemas for the Kitchen Reminder feature.
 * MUST stay in sync with backend/shopping/schemas.py
 */
import { z } from 'zod';

export const KitchenReminderSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_published: z.boolean(),
  is_own_suggestion: z.boolean().default(false),
});

export type KitchenReminder = z.output<typeof KitchenReminderSchema>;

export const KitchenReminderCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  reminders: z.array(KitchenReminderSchema),
});

export type KitchenReminderCategory = z.output<typeof KitchenReminderCategorySchema>;

export const KitchenReminderSuggestInputSchema = z.object({
  name: z.string().min(1),
});

export type KitchenReminderSuggestInput = z.input<typeof KitchenReminderSuggestInputSchema>;
