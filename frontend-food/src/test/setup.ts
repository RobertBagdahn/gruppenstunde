/**
 * Global Vitest setup — extends `expect` with jest-dom matchers
 * (toBeInTheDocument, etc.) for all jsdom-environment component tests, and
 * ensures the DOM is unmounted/cleaned between tests.
 *
 * Cleanup is normally auto-registered by @testing-library/react via a global
 * `afterEach` hook, but that only works when Vitest's `test.globals: true` is
 * enabled. Since this project does NOT enable globals, we register cleanup
 * explicitly here — otherwise component trees leak across tests within the
 * same file (later tests see DOM nodes rendered by earlier tests).
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});
