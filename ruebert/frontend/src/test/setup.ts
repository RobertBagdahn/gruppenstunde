/**
 * Global Vitest setup: jest-dom matchers and explicit cleanup between tests
 * (Vitest globals are disabled, so Testing Library cannot register it itself).
 */
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});
