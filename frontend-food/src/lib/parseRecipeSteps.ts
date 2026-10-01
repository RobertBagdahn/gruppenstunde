/**
 * Parses a recipe markdown description into individual steps.
 *
 * Strategy:
 * 1. If headings (## or ###) are found → split at headings, each section = one step
 * 2. Else if numbered list (1. , 2. , …) → each list item = one step
 * 3. Else fallback → entire block = single step
 */
export function parsePreparationSteps(markdown: string): string[] {
  const headings = [...markdown.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)];
  const preparationHeading = headings.find((heading) => {
    const title = (heading[1] ?? '').replace(/[:：]+$/, '').trim().toLocaleLowerCase('de-DE');
    return /^(zubereitung(?:sschritte)?|zubereitungsanleitung|anleitung)$/.test(title);
  });

  if (preparationHeading?.index != null) {
    const sectionStart = preparationHeading.index + preparationHeading[0].length;
    const nextHeading = headings.find((heading) => (heading.index ?? 0) > preparationHeading.index!);
    const sectionEnd = nextHeading?.index ?? markdown.length;
    return parseRecipeSteps(markdown.slice(sectionStart, sectionEnd).trim());
  }

  const firstNumberedStep = markdown.search(/^\s*\d+[.)]\s+/m);
  if (firstNumberedStep >= 0) return parseRecipeSteps(markdown.slice(firstNumberedStep).trim());
  return [];
}

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

  // Strategy 3: Fallback — entire block = one step
  return [trimmed];
}
