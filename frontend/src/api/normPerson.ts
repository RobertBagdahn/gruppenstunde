/**
 * TanStack Query hooks for the Norm Person API.
 * MUST stay in sync with backend/supply/api/norm_person.py
 */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  NormPersonResultSchema,
  NormPersonCurvesSchema,
  DgeReferencePointSchema,
} from '@/schemas/normPerson';
import type { NormPersonResult, NormPersonCurves, DgeReferencePoint } from '@/schemas/normPerson';

const NORM_PERSON_BASE = '/api/norm-person';

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useNormPersonCalculation(
  age: number | null,
  gender: string | null,
  pal: number,
) {
  return useQuery<NormPersonResult>({
    queryKey: ['norm-person', 'calculate', age, gender, pal],
    queryFn: () => {
      const params = new URLSearchParams({
        age: String(age),
        gender: gender!,
        pal: String(pal),
      });
      return fetchJson(
        `${NORM_PERSON_BASE}/calculate?${params}`,
        NormPersonResultSchema,
      );
    },
    enabled: age !== null && gender !== null,
  });
}

export function useNormPersonCurves(pal: number) {
  return useQuery<NormPersonCurves>({
    queryKey: ['norm-person', 'curves', pal],
    queryFn: async (): Promise<NormPersonCurves> => {
      const params = new URLSearchParams({ pal: String(pal) });
      const res = await fetch(`${NORM_PERSON_BASE}/curves?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return NormPersonCurvesSchema.parse(data) as NormPersonCurves;
    },
  });
}

export function useDgeReference() {
  return useQuery<DgeReferencePoint[]>({
    queryKey: ['norm-person', 'dge-reference'],
    queryFn: () =>
      fetchJson(
        `${NORM_PERSON_BASE}/dge-reference`,
        z.array(DgeReferencePointSchema),
      ),
    staleTime: 30 * 60 * 1000, // DGE data is static
  });
}
