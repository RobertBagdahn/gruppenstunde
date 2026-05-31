import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SuggestionDashboardSchema, RuleSchema } from "@/schemas/suggestions";
import type { SuggestionDashboard, Rule, RuleIn } from "@/schemas/suggestions";

const API_BASE = "/api";

export function useMealPlanSuggestions(mealPlanId: number | undefined) {
  return useQuery<SuggestionDashboard>({
    queryKey: ["meal-plan-suggestions", mealPlanId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/meal-plans/${mealPlanId}/suggestions/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Laden der Vorschläge");
      const data = await res.json();
      return SuggestionDashboardSchema.parse(data);
    },
    enabled: !!mealPlanId,
    staleTime: 30_000,
  });
}

export function useRules() {
  return useQuery<Rule[]>({
    queryKey: ["rules"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/rules/`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Laden der Regeln");
      const data = await res.json();
      return data.map((r: unknown) => RuleSchema.parse(r));
    },
    staleTime: 60_000,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RuleIn) => {
      const res = await fetch(`${API_BASE}/rules/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen");
      return RuleSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RuleIn> }) => {
      const res = await fetch(`${API_BASE}/rules/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Fehler beim Aktualisieren");
      return RuleSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_BASE}/rules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Fehler beim Löschen");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}

export function useToggleRuleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await fetch(`${API_BASE}/rules/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Fehler beim Umschalten");
      return RuleSchema.parse(await res.json());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rules"] }),
  });
}
