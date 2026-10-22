/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `1` in preview builds: production data, read-only (see `lib/preview.ts`). */
  readonly VITE_PREVIEW?: string;
}
