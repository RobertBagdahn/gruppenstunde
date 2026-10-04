/**
 * Shows backend validation errors at the form fields (food-error-presentation).
 *
 * `ApiError.fields` (explicit `fields` or the `loc` of a 422 response) are
 * mapped onto react-hook-form fields; the caller still shows a short toast.
 */
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, getApiErrorMessage } from '@/lib/api';

/** Returns the number of fields that received an error. */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  /** Fields of the form; errors on other fields are left to the toast. */
  knownFields: readonly string[],
): number {
  if (!(error instanceof ApiError) || error.fields.length === 0) return 0;
  const known = new Set<string>(knownFields);
  let applied = 0;
  for (const field of error.fields) {
    if (!known.has(field)) continue;
    setError(field as Path<T>, {
      type: 'server',
      message: error.fieldMessages[field] ?? getApiErrorMessage(error),
    });
    applied += 1;
  }
  return applied;
}
