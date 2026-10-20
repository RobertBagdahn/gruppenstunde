import { z } from 'zod';

/**
 * Wiki tree of GET /api/wiki. Written by hand: openapi-zod-client mistypes the recursive `WikiNode`
 * (it turns `status` into a union with string arrays). The backend model is the source of truth.
 */
export type WikiTreeNode = {
  path: string;
  title: string;
  description: string;
  kind: 'folder' | 'page';
  status: string | null;
  children: WikiTreeNode[];
};

export const wikiNodeSchema: z.ZodType<WikiTreeNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    path: z.string(),
    title: z.string(),
    description: z.string(),
    kind: z.enum(['folder', 'page']),
    status: z.string().nullable(),
    children: z.array(wikiNodeSchema).default([]),
  }),
);

export const wikiTreeSchema = z.array(wikiNodeSchema);
