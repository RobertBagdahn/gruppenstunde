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
  DgeReferenceSchema,
} from '@/schemas/normPerson';
import type { NormPersonResult, NormPersonCurves, DgeReferencePoint, DgeReference } from '@/schemas/normPerson';
import { API_BASE_URL } from '@/lib/api';

const NORM_PERSON_BASE = `${API_BASE_URL}/api/norm-person`;

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

/**
 * Fetch full DGE reference data from the model-backed endpoint.
 * Includes all macro/vitamin/mineral reference values.
 */
export function useDgeReferences() {
  return useQuery<DgeReference[]>({
    queryKey: ['dge-references'],
    queryFn: () =>
      fetchJson(
        `${API_BASE_URL}/api/dge-references/`,
        z.array(DgeReferenceSchema),
      ),
    staleTime: 30 * 60 * 1000,
  });
}
