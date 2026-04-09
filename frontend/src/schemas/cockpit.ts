/**
 * Zod schemas for HealthRule and Cockpit evaluation API.
 * MUST stay in sync with backend/recipe/schemas/cockpit.py
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// HealthRule
// ---------------------------------------------------------------------------

export const HealthRuleSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  parameter: z.string(),
  scope: z.string(),
  threshold_green: z.number(),
  threshold_yellow: z.number(),
  unit: z.string(),
  tip_text: z.string(),
  is_active: z.boolean(),
  sort_order: z.number(),
});
export type HealthRule = z.infer<typeof HealthRuleSchema>;

// ---------------------------------------------------------------------------
// CockpitEvaluation (single rule result)
// ---------------------------------------------------------------------------

export const CockpitEvaluationSchema = z.object({
  rule_id: z.number(),
  rule_name: z.string(),
  parameter: z.string(),
  current_value: z.number(),
  status: z.string(), // "green" | "yellow" | "red"
  tip_text: z.string(),
  unit: z.string(),
});
export type CockpitEvaluation = z.infer<typeof CockpitEvaluationSchema>;

// ---------------------------------------------------------------------------
// CockpitDashboard (full response)
// ---------------------------------------------------------------------------

export const CockpitDashboardSchema = z.object({
  evaluations: z.array(CockpitEvaluationSchema),
  summary_status: z.string(), // worst status across all evaluations
  green_count: z.number(),
  yellow_count: z.number(),
  red_count: z.number(),
});
export type CockpitDashboard = z.infer<typeof CockpitDashboardSchema>;

// ---------------------------------------------------------------------------
// Traffic light colors (for UI)
// ---------------------------------------------------------------------------

export const COCKPIT_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  green: { bg: 'bg-green-500', text: 'text-white', label: 'Gut' },
  yellow: { bg: 'bg-yellow-400', text: 'text-black', label: 'Achtung' },
  red: { bg: 'bg-red-500', text: 'text-white', label: 'Kritisch' },
};
