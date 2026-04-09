/**
 * Zod schemas for Blog.
 * MUST stay in sync with backend/blog/schemas.py
 */
import { z } from 'zod';
import {
  ContentListItemSchema,
  ContentDetailSchema,
  ContentSimilarSchema,
} from './content';

// --- Blog-specific options ---

export const BLOG_TYPE_OPTIONS = [
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Ratgeber' },
  { value: 'experience', label: 'Erfahrungsbericht' },
  { value: 'background', label: 'Hintergrundwissen' },
  { value: 'methodology', label: 'Methodik' },
  { value: 'legal', label: 'Recht & Versicherung' },
] as const;

// --- List schema ---

export const BlogListItemSchema = ContentListItemSchema.extend({
  blog_type: z.string(),
  reading_time_minutes: z.number(),
  show_table_of_contents: z.boolean(),
});
export type BlogListItem = z.infer<typeof BlogListItemSchema>;

// --- Detail schema ---

export const BlogDetailSchema = ContentDetailSchema.extend({
  blog_type: z.string(),
  reading_time_minutes: z.number(),
  show_table_of_contents: z.boolean(),
  similar_blogs: z.array(ContentSimilarSchema).default([]),
});
export type BlogDetail = z.infer<typeof BlogDetailSchema>;

// --- Paginated response ---

export const PaginatedBlogsSchema = z.object({
  items: z.array(BlogListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedBlogs = z.infer<typeof PaginatedBlogsSchema>;

// --- Filter type ---

export interface BlogFilter {
  q?: string;
  blog_type?: string;
  scout_level_ids?: number[];
  tag_slugs?: string[];
  difficulty?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}
