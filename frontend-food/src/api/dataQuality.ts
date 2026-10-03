/**
 * TanStack Query hooks for data quality API endpoints.
 * MUST stay in sync with backend/content/api/data_quality.py and buffet_data_quality.py
 */
import { AI_META } from '@/lib/queryMeta';
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PaginatedPriceAnomalySchema,
  PriceEvaluateResponseSchema,
  PriceApplyResponseSchema,
  type PriceEvaluateRequest,
  type PriceApplyRequest,
  type PriceApplyResponse,
  PaginatedDuplicatePairSchema,
  MergePreviewSchema,
  MergeResponseSchema,
  RecipeMergePreviewSchema,
  type MergeRequest,
  type RecipeDismissRequest,
  PaginatedCompletenessSchema,
  MissingClassificationSchema,
  PaginatedNutritionPlausibilitySchema,
  IngredientFillResultSchema,
  AiFillMissingBatchSchema,
  type AiFillMissingRequest,
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
  PaginatedBuffetCandidateSchema,
  BuffetDataQualityReportSchema,
  PaginatedBuffetProposalSchema,
  BuffetProposalSchema,
  BuffetProposalSuggestionSchema,
  BuffetProposalPreviewSchema,
  BuffetProposalExportSchema,
  type BuffetCandidate,
  type BuffetDataQualityReport,
  type BuffetProposal,
  type BuffetProposalCreateRequest,
  type BuffetProposalUpdateRequest,
  type BuffetProposalSuggestionRequest,
  type BuffetProposalReviewRequest,
  type BuffetProposalSuggestion,
  type BuffetProposalPreview,
  type BuffetProposalExport,
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
const BUFFET_DQ = `${ADMIN_DQ}/buffet-catalog`;

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
    mutationFn: (data: PriceApplyRequest): Promise<PriceApplyResponse> =>
      patchJson(`${ADMIN_DQ}/ingredients/price-analysis/apply/`, data).then((d) =>
        PriceApplyResponseSchema.parse(d)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient'] });
    },
  });
}

// ============================================================================
// Duplicate Detection
// ============================================================================

const DUPLICATE_PAGE_SIZE = 50;

export function useIngredientDuplicates() {
  return useQuery({
    queryKey: ['ingredient-duplicates'],
    queryFn: async () => {
      const data = await fetchJson(
        `${ADMIN_DQ}/ingredients/duplicates/?page=1&page_size=${DUPLICATE_PAGE_SIZE}`
      );
      return PaginatedDuplicatePairSchema.parse(data);
    },
  });
}

export function useRecipeDuplicates() {
  return useQuery({
    queryKey: ['recipe-duplicates'],
    queryFn: async () => {
      const data = await fetchJson(
        `${ADMIN_DQ}/recipes/duplicates/?page=1&page_size=${DUPLICATE_PAGE_SIZE}`
      );
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
    mutationFn: (data: MergeRequest) =>
      postJson(`${ADMIN_DQ}/ingredients/merge/`, data).then((d) =>
        MergeResponseSchema.parse(d)
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-search'] });
      queryClient.invalidateQueries({ queryKey: ['similar-ingredients'] });
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
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe'] });
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

export function useNutritionPlausibility(params: {
  page?: number;
  page_size?: number;
  anomaly_type?: string;
  search?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.anomaly_type) searchParams.set('anomaly_type', params.anomaly_type);
  if (params.search) searchParams.set('search', params.search);
  return useQuery({
    queryKey: ['nutrition-plausibility', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${ADMIN_DQ}/ingredients/nutrition-plausibility/?${searchParams}`);
      return PaginatedNutritionPlausibilitySchema.parse(data);
    },
  });
}

export function useAiFillMissingIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: AI_META,
    mutationFn: async (ingredientId: number) => {
      const data = await postJson(`${ADMIN_DQ}/ingredients/${ingredientId}/ai-fill-missing/`, {});
      return IngredientFillResultSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-plausibility'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-completeness'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useAiFillMissingBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: AI_META,
    mutationFn: async (req: AiFillMissingRequest) => {
      const data = await postJson(`${ADMIN_DQ}/ingredients/ai-fill-missing/`, req);
      return AiFillMissingBatchSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-plausibility'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient-completeness'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
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

export function useBuffetDataQualityReport(params: { page?: number; page_size?: number } = {}) {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('page_size', String(params.page_size ?? 20));
  return useQuery({
    queryKey: ['buffet-data-quality-report', params] as const,
    queryFn: async (): Promise<BuffetDataQualityReport> => {
      const data = await fetchJson(`${BUFFET_DQ}/report/?${searchParams}`);
      return BuffetDataQualityReportSchema.parse(data);
    },
  });
}

export function useBuffetCandidates(
  params: {
    q?: string;
    action?: BuffetCandidate['action'] | 'all';
    kind?: BuffetCandidate['item_kind'] | 'all';
    role_slug?: string;
    page?: number;
    page_size?: number;
  } = {},
) {
  const searchParams = new URLSearchParams();
  const query = params.q?.trim();
  if (query) searchParams.set('q', query);
  if (params.action && params.action !== 'all') searchParams.set('action', params.action);
  if (params.kind && params.kind !== 'all') searchParams.set('kind', params.kind);
  if (params.role_slug) searchParams.set('role_slug', params.role_slug);
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('page_size', String(params.page_size ?? 20));
  return useQuery({
    queryKey: ['buffet-candidates', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${BUFFET_DQ}/candidates/?${searchParams}`);
      return PaginatedBuffetCandidateSchema.parse(data);
    },
  });
}

export function useBuffetDataProposals(
  params: {
    status?: BuffetProposal['status'] | 'all';
    action?: BuffetProposal['action'] | 'all';
    kind?: BuffetProposal['item_kind'] | 'all';
    page?: number;
    page_size?: number;
  } = {},
) {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.action && params.action !== 'all') searchParams.set('action', params.action);
  if (params.kind && params.kind !== 'all') searchParams.set('kind', params.kind);
  searchParams.set('page', String(params.page ?? 1));
  searchParams.set('page_size', String(params.page_size ?? 20));
  return useQuery({
    queryKey: ['buffet-proposals', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${BUFFET_DQ}/proposals/?${searchParams}`);
      return PaginatedBuffetProposalSchema.parse(data);
    },
  });
}

export function useCreateBuffetProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BuffetProposalCreateRequest) =>
      postJson(`${BUFFET_DQ}/proposals/`, request).then((data) => BuffetProposalSchema.parse(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buffet-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['buffet-candidates'] });
    },
  });
}

export function useUpdateBuffetProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, update }: { id: number; update: BuffetProposalUpdateRequest }) =>
      patchJson(`${BUFFET_DQ}/proposals/${id}/`, update).then((data) => BuffetProposalSchema.parse(data)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buffet-proposals'] }),
  });
}

export function useSuggestBuffetItem() {
  return useMutation({
    meta: AI_META,
    mutationFn: (request: BuffetProposalSuggestionRequest): Promise<BuffetProposalSuggestion> =>
      postJson(`${BUFFET_DQ}/proposals/suggest/`, request).then((data) => BuffetProposalSuggestionSchema.parse(data)),
  });
}

export function usePreviewBuffetProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: number): Promise<BuffetProposalPreview> =>
      postJson(`${BUFFET_DQ}/proposals/${proposalId}/preview/`, {}).then((data) =>
        BuffetProposalPreviewSchema.parse(data),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buffet-proposals'] }),
  });
}

export function useReviewBuffetProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, review }: { id: number; review: BuffetProposalReviewRequest }) =>
      postJson(`${BUFFET_DQ}/proposals/${id}/review/`, review).then((data) => BuffetProposalSchema.parse(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buffet-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['buffet-candidates'] });
    },
  });
}

export function useExportBuffetProposals() {
  return useMutation({
    mutationFn: async (): Promise<BuffetProposalExport> => {
      const data = await fetchJson(`${BUFFET_DQ}/proposals/export/`);
      return BuffetProposalExportSchema.parse(data);
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
