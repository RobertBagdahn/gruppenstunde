import { z } from "zod";
import { MEAL_TYPE_LABELS } from "@/schemas/mealPlan";

export const RuleSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  parameter: z.string(),
  scope: z.string(),
  rule_type: z.string(),
  min_green: z.number().nullable(),
  min_yellow: z.number().nullable(),
  max_green: z.number().nullable(),
  max_yellow: z.number().nullable(),
  unit: z.string(),
  hint_level: z.string(),
  tip_text: z.string(),
  improvement_text: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
});

export type Rule = z.infer<typeof RuleSchema>;

export const RuleInSchema = z.object({
  name: z.string().min(1, "Name erforderlich"),
  description: z.string().default(""),
  parameter: z.string().min(1, "Parameter erforderlich"),
  scope: z.string().min(1, "Scope erforderlich"),
  rule_type: z.string().default("nutrition"),
  min_green: z.number().nullable().default(null),
  min_yellow: z.number().nullable().default(null),
  max_green: z.number().nullable().default(null),
  max_yellow: z.number().nullable().default(null),
  unit: z.string().default(""),
  hint_level: z.string().default("warn"),
  tip_text: z.string().default(""),
  improvement_text: z.string().default(""),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

export type RuleIn = z.infer<typeof RuleInSchema>;

export const RecipeSuggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  image_url: z.string().nullable(),
  recipe_type: z.string(),
});

export type RecipeSuggestion = z.infer<typeof RecipeSuggestionSchema>;

export const SuggestionSchema = z.object({
  category: z.string(),
  scope: z.string(),
  scope_label: z.string(),
  status: z.enum(["green", "yellow", "red"]),
  priority: z.number(),
  message: z.string(),
  current_value: z.number().nullable().default(null),
  target_range: z.string().nullable().default(null),
  min_green: z.number().nullable().default(null),
  max_green: z.number().nullable().default(null),
  target_mid: z.number().nullable().default(null),
  tip: z.string().nullable().default(null),
  recipe_suggestions: z.array(RecipeSuggestionSchema).default([]),
  price_coverage_pct: z.number().nullable().default(null),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionDashboardSchema = z.object({
  suggestions: z.array(SuggestionSchema),
  summary_status: z.enum(["green", "yellow", "red"]),
  red_count: z.number(),
  yellow_count: z.number(),
  green_count: z.number(),
  total_count: z.number(),
});

export type SuggestionDashboard = z.infer<typeof SuggestionDashboardSchema>;

/** Extracts the day number (1-based) from a scope_label like "Tag 2: Energie" or "Tag 3 Mittagessen". */
export function getSuggestionDayNumber(suggestion: Suggestion): number | null {
  const match = suggestion.scope_label.match(/^Tag (\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Extracts the meal_type (e.g. "lunch") from a scope_label like "Tag 2 Mittagessen"
 * or "Tag 2 Mittagessen: Energie". Returns null for day-/event-scoped labels
 * such as "Tag 2: Energie" or "Gesamt: Energie".
 */
export function getSuggestionMealType(suggestion: Suggestion): string | null {
  const match = suggestion.scope_label.match(/^Tag \d+ ([^:]+)/);
  if (!match) return null;
  const label = match[1].trim();
  const entry = Object.entries(MEAL_TYPE_LABELS).find(([, l]) => l === label);
  return entry ? entry[0] : null;
}

export const SUGGESTION_STATUS_COLORS = {
  green: "text-green-600",
  yellow: "text-yellow-500",
  red: "text-red-600",
} as const;

export const SUGGESTION_STATUS_BG = {
  green: "bg-green-100",
  yellow: "bg-yellow-100",
  red: "bg-red-100",
} as const;
