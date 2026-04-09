/**
 * Zod schemas for Content Links, Embedding Feedback, and Featured Content.
 * MUST stay in sync with backend/content/api.py (ContentLinkDetailOut, FeaturedContentDetailOut)
 * and backend/content/base_schemas.py (ContentLinkOut, ContentLinkCreateIn, FeaturedContentIn)
 */
import { z } from 'zod';

// --- Content Link ---

export const ContentLinkSchema = z.object({
  id: z.number(),
  source_content_type: z.string(),
  source_object_id: z.number(),
  source_title: z.string(),
  source_slug: z.string(),
  source_image_url: z.string().nullable(),
  target_content_type: z.string(),
  target_object_id: z.number(),
  target_title: z.string(),
  target_slug: z.string(),
  target_image_url: z.string().nullable(),
  link_type: z.string(),
  relevance_score: z.number().nullable(),
  is_rejected: z.boolean(),
  created_at: z.string(),
});
export type ContentLink = z.infer<typeof ContentLinkSchema>;

export const ContentLinkCreateSchema = z.object({
  source_content_type: z.string(),
  source_object_id: z.number(),
  target_content_type: z.string(),
  target_object_id: z.number(),
});
export type ContentLinkCreate = z.infer<typeof ContentLinkCreateSchema>;

// --- Embedding Feedback ---

export const EmbeddingFeedbackSchema = z.object({
  content_link_id: z.number(),
  feedback_type: z.enum(['relevant', 'not_relevant', 'wrong_type']),
  notes: z.string().default(''),
});
export type EmbeddingFeedback = z.infer<typeof EmbeddingFeedbackSchema>;

// --- Featured Content ---

export const FeaturedContentSchema = z.object({
  id: z.number(),
  content_type: z.string(),
  object_id: z.number(),
  content_title: z.string(),
  content_slug: z.string(),
  content_summary: z.string(),
  content_image_url: z.string().nullable(),
  content_url: z.string(),
  featured_from: z.string(),
  featured_until: z.string(),
  reason: z.string(),
  created_at: z.string(),
});
export type FeaturedContent = z.infer<typeof FeaturedContentSchema>;

export const FeaturedContentCreateSchema = z.object({
  content_type: z.string(),
  object_id: z.number(),
  featured_from: z.string(),
  featured_until: z.string(),
  reason: z.string().default(''),
});
export type FeaturedContentCreate = z.infer<typeof FeaturedContentCreateSchema>;

// --- Link Type Labels ---

export const LINK_TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  manual: { label: 'Manuell', icon: 'link' },
  embedding: { label: 'KI-Empfehlung', icon: 'auto_awesome' },
  ai_suggested: { label: 'KI-Vorschlag', icon: 'smart_toy' },
};

// --- Content Type Labels (for link sections) ---

export const CONTENT_TYPE_LABELS: Record<string, { label: string; pluralLabel: string; icon: string; urlPrefix: string }> = {
  groupsession: { label: 'Gruppenstunde', pluralLabel: 'Passende Gruppenstunden', icon: 'groups', urlPrefix: '/sessions/' },
  blog: { label: 'Wissensbeitrag', pluralLabel: 'Passende Wissensbeiträge', icon: 'article', urlPrefix: '/blogs/' },
  game: { label: 'Spiel', pluralLabel: 'Passende Spiele', icon: 'sports_esports', urlPrefix: '/games/' },
  recipe: { label: 'Rezept', pluralLabel: 'Passende Rezepte', icon: 'menu_book', urlPrefix: '/recipes/' },
};
