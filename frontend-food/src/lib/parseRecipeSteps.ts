/**
 * Parses a recipe markdown description into individual steps.
 *
 * Strategy:
 * 1. If headings (## or ###) are found → split at headings, each section = one step
 * 2. Else if numbered list (1. , 2. , …) → each list item = one step
 * 3. Else fallback → entire block = single step
 */
export function parseRecipeSteps(markdown: string): string[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const trimmed = markdown.trim();

  // Strategy 1: Split at ## or ### headings
  const headingPattern = /^#{2,3}\s+/m;
  if (headingPattern.test(trimmed)) {
    const parts = trimmed.split(/^(?=#{2,3}\s+)/m);
    const steps = parts.map((p) => p.trim()).filter(Boolean);
    if (steps.length > 1) {
      return steps;
    }
  }

  // Strategy 2: Numbered list items (1. , 2. , …)
  const numberedPattern = /^\d+\.\s+/m;
  if (numberedPattern.test(trimmed)) {
    const parts = trimmed.split(/^(?=\d+\.\s+)/m);
    const steps = parts.map((p) => p.trim()).filter(Boolean);
    if (steps.length > 1) {
      return steps;
    }
  }

  // Strategy 3: Fallback — entire block as one step
  return [trimmed];
}
