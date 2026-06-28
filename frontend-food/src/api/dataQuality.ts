/**
 * TanStack Query hooks for data quality API endpoints.
 * MUST stay in sync with backend/content/api/data_quality.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PaginatedPriceAnomalySchema,
  PriceEvaluateResponseSchema,
  type PriceEvaluateRequest,
  type PriceApplyRequest,
  PaginatedDuplicatePairSchema,
  MergePreviewSchema,
  RecipeMergePreviewSchema,
  type MergeRequest,
  type RecipeDismissRequest,
  PaginatedCompletenessSchema,
  MissingClassificationSchema,
  NutritionPlausibilitySchema,
  RecipeMetadataCheckSchema,
  CacheStalenessSchema,
  PortionPlausibilitySchema,
  QualityTrendSchema,
  type QualityTrend,
  PaginatedAuditLogSchema,
  CostDistributionSchema,
  EnergyDistributionSchema,
  NutrientDistributionSchema,
  NutriScoreDistributionSchema,
  ImpactSchema,
  type Impact,
} from '@/schemas/dataQuality';
import { PaginatedListSchema } from '@/schemas/dataQuality';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
}

const ADMIN_DQ = `${API_BASE_URL}/api/admin/data-quality`;
const PUBLIC_DQ = `${API_BASE_URL}/api/data-quality`;

// ============================================================================
// Price Analysis
// ============================================================================

export function usePriceAnalysis(params: { page?: number; page_size?: number; anomaly_type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.anomaly_type) searchParams.set('anomaly_type', params.anomaly_type);
  return useQuery({
    queryKey: ['price-analysis', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/price-analysis/?${searchParams}`);
      return PaginatedPriceAnomalySchema.parse(data);
    },
  });
}

export function usePriceEvaluate() {
  return useMutation({
    mutationFn: (data: PriceEvaluateRequest) =>
      postJson(`${ADMIN_DQ}/ingredients/price-analysis/evaluate/`, data).then((d) =>
        PriceEvaluateResponseSchema.parse(d)
      ),
  });
}

export function usePriceApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PriceApplyRequest) =>
      patchJson(`${ADMIN_DQ}/ingredients/price-analysis/apply/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-analysis'] });
    },
  });
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export function useIngredientDuplicates() {
  return useQuery({
    queryKey: ['ingredient-duplicates'],
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/duplicates/`);
      return PaginatedDuplicatePairSchema.parse(data);
    },
  });
}

export function useRecipeDuplicates() {
  return useQuery({
    queryKey: ['recipe-duplicates'],
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/recipes/duplicates/`);
      return PaginatedDuplicatePairSchema.parse(data);
    },
  });
}

export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { ingredient_a_id: number; ingredient_b_id: number }) =>
      postJson(`${ADMIN_DQ}/ingredients/duplicates/dismiss/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-duplicates'] });
    },
  });
}

export function useUndismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ingredient_a_id, ingredient_b_id }: { ingredient_a_id: number; ingredient_b_id: number }) =>
      deleteJson(`${ADMIN_DQ}/ingredients/duplicates/dismiss/?a=${ingredient_a_id}&b=${ingredient_b_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-duplicates'] });
    },
  });
}

export function useMergePreview(sourceId: number, targetId: number) {
  return useQuery({
    queryKey: ['merge-preview', sourceId, targetId] as const,
    queryFn: async () => {
      const data = await fetchJson(
        `${ADMIN_DQ}/ingredients/merge/preview/?source_id=${sourceId}&target_id=${targetId}`
      );
      return MergePreviewSchema.parse(data);
    },
    enabled: !!sourceId && !!targetId,
  });
}

export function useMergeIngredients() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MergeRequest) => postJson(`${ADMIN_DQ}/ingredients/merge/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['merge-preview'] });
    },
  });
}

// ============================================================================
// Recipe Duplicate Detection
// ============================================================================

export function useRecipeMergePreview(sourceId: number, targetId: number) {
  return useQuery({
    queryKey: ['recipe-merge-preview', sourceId, targetId] as const,
    queryFn: async () => {
      const data = await fetchJson(
        `${ADMIN_DQ}/recipes/merge/preview/?source_id=${sourceId}&target_id=${targetId}`
      );
      return RecipeMergePreviewSchema.parse(data);
    },
    enabled: !!sourceId && !!targetId,
  });
}

export function useRecipeMerge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MergeRequest) => postJson(`${ADMIN_DQ}/recipes/merge/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-merge-preview'] });
    },
  });
}

export function useRecipeDismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeDismissRequest) =>
      postJson(`${ADMIN_DQ}/recipes/duplicates/dismiss/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-duplicates'] });
    },
  });
}

export function useRecipeUndismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipe_a_id, recipe_b_id }: RecipeDismissRequest) =>
      deleteJson(`${ADMIN_DQ}/recipes/duplicates/dismiss/?a=${recipe_a_id}&b=${recipe_b_id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-duplicates'] });
    },
  });
}

// ============================================================================
// Completeness & Dashboard
// ============================================================================

export function useIngredientCompleteness(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['ingredient-completeness', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/completeness/?${searchParams}`);
      return PaginatedCompletenessSchema.parse(data);
    },
  });
}

export function useMissingClassification(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['missing-classification', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/missing-classification/?${searchParams}`);
      return PaginatedListSchema(MissingClassificationSchema).parse(data);
    },
  });
}

export function useNutritionPlausibility(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['nutrition-plausibility', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/nutrition-plausibility/?${searchParams}`);
      return PaginatedListSchema(NutritionPlausibilitySchema).parse(data);
    },
  });
}

export function useRecipeMetadataCheck(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['recipe-metadata-check', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/recipes/metadata-check/?${searchParams}`);
      return PaginatedListSchema(RecipeMetadataCheckSchema).parse(data);
    },
  });
}

export function useCacheStaleness(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['cache-staleness', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/recipes/cache-staleness/?${searchParams}`);
      return PaginatedListSchema(CacheStalenessSchema).parse(data);
    },
  });
}

export function usePortionPlausibility(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['portion-plausibility', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/recipes/portion-plausibility/?${searchParams}`);
      return PaginatedListSchema(PortionPlausibilitySchema).parse(data);
    },
  });
}

export function useQualityTrend(type: 'ingredients' | 'recipes' = 'ingredients') {
  return useQuery({
    queryKey: ['quality-trend', type] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/trend/?type=${type}`);
      return QualityTrendSchema.parse(data) as QualityTrend;
    },
  });
}

// ============================================================================
// Audit Log
// ============================================================================

export function useAuditLog(
  params: { content_type?: string; object_id?: number; page?: number; page_size?: number } = {}
) {
  const searchParams = new URLSearchParams();
  if (params.content_type) searchParams.set('content_type', params.content_type);
  if (params.object_id) searchParams.set('object_id', String(params.object_id));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  return useQuery({
    queryKey: ['audit-log', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/audit-log/?${searchParams}`);
      return PaginatedAuditLogSchema.parse(data);
    },
  });
}

// ============================================================================
// Impact Analysis (Public)
// ============================================================================

export function useIngredientImpact(slug: string) {
  return useQuery({
    queryKey: ['ingredient-impact', slug] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/ingredients/${slug}/impact/`);
      return ImpactSchema.parse(data) as Impact;
    },
    enabled: !!slug,
  });
}

// ============================================================================
// Distribution Charts (Public)
// ============================================================================

export function useIngredientCostDistribution(params: { tags?: string; retail_section?: number; status?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.retail_section) searchParams.set('retail_section', String(params.retail_section));
  if (params.status) searchParams.set('status', params.status);
  return useQuery({
    queryKey: ['ingredient-cost-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/ingredients/distribution/cost/?${searchParams}`);
      return CostDistributionSchema.parse(data);
    },
  });
}

export function useIngredientEnergyDistribution(
  params: { tags?: string; retail_section?: number; status?: string } = {}
) {
  const searchParams = new URLSearchParams();
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.retail_section) searchParams.set('retail_section', String(params.retail_section));
  if (params.status) searchParams.set('status', params.status);
  return useQuery({
    queryKey: ['ingredient-energy-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/ingredients/distribution/energy/?${searchParams}`);
      return EnergyDistributionSchema.parse(data);
    },
  });
}

export function useIngredientNutrientDistribution(
  params: { tags?: string; retail_section?: number; status?: string } = {}
) {
  const searchParams = new URLSearchParams();
  if (params.tags) searchParams.set('tags', params.tags);
  if (params.retail_section) searchParams.set('retail_section', String(params.retail_section));
  if (params.status) searchParams.set('status', params.status);
  return useQuery({
    queryKey: ['ingredient-nutrient-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/ingredients/distribution/nutrients/?${searchParams}`);
      return NutrientDistributionSchema.parse(data);
    },
  });
}

export function useRecipeCostDistribution(params: { recipe_type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.recipe_type) searchParams.set('recipe_type', params.recipe_type);
  return useQuery({
    queryKey: ['recipe-cost-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/recipes/distribution/cost/?${searchParams}`);
      return CostDistributionSchema.parse(data);
    },
  });
}

export function useRecipeCalorieDistribution(params: { recipe_type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.recipe_type) searchParams.set('recipe_type', params.recipe_type);
  return useQuery({
    queryKey: ['recipe-calorie-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/recipes/distribution/calories/?${searchParams}`);
      return EnergyDistributionSchema.parse(data);
    },
  });
}

export function useRecipeNutriScoreDistribution(params: { recipe_type?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.recipe_type) searchParams.set('recipe_type', params.recipe_type);
  return useQuery({
    queryKey: ['recipe-nutri-score-distribution', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${PUBLIC_DQ}/recipes/distribution/nutri-score/?${searchParams}`);
      return NutriScoreDistributionSchema.parse(data);
    },
  });
}
