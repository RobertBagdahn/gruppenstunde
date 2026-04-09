/**
 * Zod schemas for Norm Person calculation API.
 * MUST stay in sync with backend/supply/schemas/norm_person.py
 */
import { z } from 'zod';

export const NormPersonResultSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  norm_factor: z.number(),
  weight_kg: z.number(),
  height_cm: z.number(),
  age: z.number(),
  gender: z.string(),
  pal: z.number(),
  dge_reference: z.record(z.string(), z.number()).nullable().optional(),
});

export type NormPersonResult = z.infer<typeof NormPersonResultSchema>;

export const NormPersonCurvePointSchema = z.object({
  age: z.number(),
  male_tdee: z.number(),
  female_tdee: z.number(),
  male_norm_factor: z.number(),
  female_norm_factor: z.number(),
});

export type NormPersonCurvePoint = z.infer<typeof NormPersonCurvePointSchema>;

export const NormPersonReferenceSchema = z.object({
  age: z.number(),
  gender: z.string(),
  pal: z.number(),
  tdee: z.number(),
  norm_factor: z.number(),
});

export type NormPersonReference = z.infer<typeof NormPersonReferenceSchema>;

// ---------------------------------------------------------------------------
// DGE Reference Point (one age group, one gender)
// ---------------------------------------------------------------------------

export const DgeReferencePointSchema = z.object({
  age_min: z.number(),
  age_max: z.number(),
  gender: z.string(),
  energy_kj: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  fibre_g: z.number(),
});

export type DgeReferencePoint = z.infer<typeof DgeReferencePointSchema>;

// ---------------------------------------------------------------------------
// Curves response (with DGE reference array)
// ---------------------------------------------------------------------------

export const NormPersonCurvesSchema = z.object({
  pal: z.number(),
  reference: NormPersonReferenceSchema,
  data_points: z.array(NormPersonCurvePointSchema),
  dge_reference: z.array(DgeReferencePointSchema).default([]),
});

export type NormPersonCurves = z.infer<typeof NormPersonCurvesSchema>;
