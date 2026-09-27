export interface MetadataSnapshot {
  summary: string;
  description: string;
  difficulty: string;
  executionTime: string;
  preparationTime: string;
  visibility: string;
  selectedTagSlugs: string[];
}

/**
 * Build the metadata PATCH body.
 *
 * Returns null while the metadata step has not reported its state yet, so
 * clicking through the step cannot overwrite existing content with defaults.
 * Choice fields are omitted when empty because the backend rejects empty
 * values for them; free-text fields stay clearable on purpose.
 */
export function buildMetadataPatch(
  meta: MetadataSnapshot | null,
): Record<string, unknown> | null {
  if (!meta) return null;

  const body: Record<string, unknown> = {
    summary: meta.summary,
    description: meta.description,
    tag_ids: meta.selectedTagSlugs,
  };
  if (meta.visibility) body.visibility = meta.visibility;
  if (meta.difficulty) body.difficulty = meta.difficulty;
  if (meta.executionTime) body.execution_time = meta.executionTime;
  if (meta.preparationTime) body.preparation_time = meta.preparationTime;
  return body;
}
