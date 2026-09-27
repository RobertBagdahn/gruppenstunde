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

// This jsdom setup exposes no usable localStorage; provide an in-memory one.
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

if (typeof globalThis.localStorage?.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), writable: true, configurable: true });
}
