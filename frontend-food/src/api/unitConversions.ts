import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';

const UNIT_CONVERSION_BASE = `${API_BASE_URL}/api/unit-conversions`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return schema.parse(await res.json());
}

async function postJsonRaw<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return schema.parse(await res.json());
}

export function useUnitConversions(params?: {
  from_unit?: number;
  to_unit?: number;
  ingredient?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.from_unit) searchParams.set('from_unit', String(params.from_unit));
  if (params?.to_unit) searchParams.set('to_unit', String(params.to_unit));
  if (params?.ingredient) searchParams.set('ingredient', String(params.ingredient));
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['unit-conversions', params] as const,
    queryFn: async () => {
      const { UnitConversionSchema } = await import('@/schemas/supply');
      return fetchJson(
        `${UNIT_CONVERSION_BASE}/${qs ? `?${qs}` : ''}`,
        z.array(UnitConversionSchema),
      );
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useConvertUnit() {
  return useMutation({
    mutationFn: async (params: {
      from_unit: number;
      to_unit: number;
      quantity: number;
      ingredient?: number;
    }) => {
      const searchParams = new URLSearchParams({
        from_unit: String(params.from_unit),
        to_unit: String(params.to_unit),
        quantity: String(params.quantity),
      });
      if (params.ingredient) searchParams.set('ingredient', String(params.ingredient));
      const { UnitConversionResultSchema } = await import('@/schemas/supply');
      return fetchJson(
        `${UNIT_CONVERSION_BASE}/convert/?${searchParams.toString()}`,
        UnitConversionResultSchema,
      );
    },
  });
}

export function useAvailableConversions(
  items: Array<{ ingredient_id: number; from_unit_id: number; quantity: number }>,
  enabled = true,
) {
  return useQuery({
    queryKey: ['available-conversions', items] as const,
    queryFn: async () => {
      const { AvailableConversionBatchSchema } = await import('@/schemas/supply');
      return postJsonRaw(
        `${UNIT_CONVERSION_BASE}/available/batch/`,
        items,
        AvailableConversionBatchSchema,
      );
    },
    enabled: enabled && items.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}
