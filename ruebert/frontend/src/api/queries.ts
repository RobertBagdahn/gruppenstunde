import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import { schemas } from '@/schemas/generated';
import { wikiTreeSchema } from '@/schemas/wiki';

import { apiGet, apiSend, type ApiError } from './client';

type Schema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

type Params = Record<string, string | number | boolean | null | undefined>;

/** Query string without empty values, e.g. `?page=2&colour=red`. */
export function query(params: Params = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

const ALL = ['api'] as const;

function useRead<T>(path: string, schema: Schema<T>, enabled = true) {
  return useQuery<T, ApiError>({
    queryKey: [...ALL, path],
    queryFn: ({ signal }) => apiGet(path, schema, signal),
    enabled,
  });
}

/** A write invalidates every cached read: one decision changes queues, counts and charts at once. */
function useWrite<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, schema: Schema<T>) {
  const client = useQueryClient();
  return useMutation<T, ApiError, unknown>({
    mutationFn: (body) => apiSend(method, path, schema, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ALL }),
  });
}

export const useTrafficLight = () => useRead('/api/traffic-light', schemas.TrafficLightOut);

export const useProducts = (params: Params) => useRead(`/api/products${query(params)}`, schemas.Page_ProductRow_);
export const useProductFilters = () => useRead('/api/products/filters', schemas.Filters);
export const useProduct = (sku: string | null) =>
  useRead(`/api/products/${encodeURIComponent(sku ?? '')}`, schemas.ProductDetail, sku !== null);

export const useOrderPlan = (params: Params) => useRead(`/api/order-plans${query(params)}`, schemas.PlanOut);
export const useSetQuantity = (sku: string) => useWrite('PUT', `/api/order-plans/quantities/${encodeURIComponent(sku)}`, schemas.PlanRowOut);
export const useApprovePlan = () => useWrite('POST', '/api/order-plans/approve', schemas.PlanOut);

export const useSuppliers = () => useRead('/api/supplier-orders', schemas.SupplierRow.array());
export const useSupplier = (id: string | null) =>
  useRead(`/api/supplier-orders/${encodeURIComponent(id ?? '')}`, schemas.SupplierDetail, id !== null);

export const useCases = (params: Params) => useRead(`/api/cases${query(params)}`, schemas.Page_CaseRow_);
export const useCase = (id: string | null) =>
  useRead(`/api/cases/${encodeURIComponent(id ?? '')}`, schemas.CaseDetail, id !== null);

export const usePhases = (params: Params) => useRead(`/api/stockouts${query(params)}`, schemas.Page_PhaseRow_);
export const useEvents = (params: Params) => useRead(`/api/events${query(params)}`, schemas.EventOut.array());

export const useForecastQuality = () => useRead('/api/forecast-quality', schemas.QualityOut);
export const useSets = (params: Params) => useRead(`/api/sets${query(params)}`, schemas.Page_SetRow_);
export const useSet = (sku: string | null) =>
  useRead(`/api/sets/${encodeURIComponent(sku ?? '')}`, schemas.SetDetail, sku !== null);
export const useRuns = () => useRead('/api/runs', schemas.DataOut);

export const useSettings = () => useRead('/api/settings', schemas.ParameterOut.array());
export const useSaveSetting = (key: string) => useWrite('PUT', `/api/settings/${key}`, schemas.ParameterOut);
export const useResetSetting = (key: string) => useWrite('DELETE', `/api/settings/${key}`, schemas.ParameterOut);

export const useDecideTraffic = (sku: string) => useWrite('POST', `/api/traffic-light/${encodeURIComponent(sku)}/decision`, schemas.QueueItem);
export const useDecideCase = (id: string) => useWrite('POST', `/api/cases/${encodeURIComponent(id)}/decision`, schemas.CaseRow);
export const useDecidePhase = (id: string) => useWrite('POST', `/api/stockouts/${encodeURIComponent(id)}/decision`, schemas.PhaseRow);
export const useDecideSupplier = (id: string) => useWrite('POST', `/api/supplier-orders/${encodeURIComponent(id)}/decision`, schemas.SupplierDetail);
export const useAddEvent = () => useWrite('POST', '/api/events', schemas.EventOut);

export const useSendFeedback = () => useWrite('POST', '/api/feedback', schemas.FeedbackOut);
export const useQuestion = (id: string | null) =>
  useRead(`/api/questions/${encodeURIComponent(id ?? '')}`, schemas.QuestionOut, id !== null);

export const useWikiTree = () => useRead('/api/wiki', wikiTreeSchema);
export const useWikiPage = (path: string | null) =>
  useRead(`/api/wiki/page${query({ path: path ?? '' })}`, schemas.WikiPage, path !== null);
