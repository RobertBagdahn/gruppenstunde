import { IngredientStatusSchema, type IngredientStatus } from '@/schemas/supply';

export const INGREDIENT_STATUS_OPTIONS: { value: IngredientStatus; label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'verified', label: 'Verifiziert' },
];

export function ingredientStatusLabel(status: string): string {
  return INGREDIENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function parseIngredientStatus(value: string): IngredientStatus | undefined {
  const parsed = IngredientStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
