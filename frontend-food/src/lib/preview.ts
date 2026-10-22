/**
 * Preview builds (`VITE_PREVIEW=1`) show production data read-only for acceptance reviews.
 * The block lives in the client only; the API itself stays open (accepted residual risk).
 */
export const IS_PREVIEW = import.meta.env.VITE_PREVIEW === '1';

export const PREVIEW_MESSAGE = 'Vorschau – nur ansehen. Änderungen sind hier nicht möglich.';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Sign-in and sign-out stay possible so reviewers can open private pages. */
const AUTH_PATH = /\/api\/auth\//;

export function isPreviewWriteBlocked(url: string, method = 'GET', preview = IS_PREVIEW): boolean {
  if (!preview) return false;
  if (READ_METHODS.has(method.toUpperCase())) return false;
  return !AUTH_PATH.test(url);
}
