/**
 * Tests for geocoding utility.
 * Covers: caching, empty input, geocodeAddress, reverseGeocode.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { geocodeAddress, reverseGeocode, createDebouncedGeocode } from '@/utils/geocoding';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

beforeEach(() => {
  localStorageMock.clear();
  fetchMock.mockReset();
});

describe('geocodeAddress', () => {
  it('returns null for empty address', async () => {
    const result = await geocodeAddress('');
    expect(result).toBeNull();
  });

  it('returns null for whitespace-only address', async () => {
    const result = await geocodeAddress('   ');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns geocoding result from API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { lat: '50.1234', lon: '8.5678', display_name: 'Frankfurt am Main' },
        ]),
    });

    const result = await geocodeAddress('Frankfurt');
    expect(result).toEqual({
      lat: 50.1234,
      lng: 8.5678,
      displayName: 'Frankfurt am Main',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when API returns empty array', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await geocodeAddress('nonexistent-place-xyz');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const result = await geocodeAddress('Frankfurt');
    expect(result).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    const result = await geocodeAddress('Frankfurt');
    expect(result).toBeNull();
  });

  it('caches results and reuses them', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { lat: '50.1234', lon: '8.5678', display_name: 'Frankfurt' },
        ]),
    });

    // First call — fetches from API
    await geocodeAddress('Frankfurt');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result = await geocodeAddress('Frankfurt');
    expect(result).toEqual({
      lat: 50.1234,
      lng: 8.5678,
      displayName: 'Frankfurt',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1); // still 1 — no new fetch
  });

  it('is case-insensitive for caching', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          { lat: '50.1', lon: '8.5', display_name: 'Test' },
        ]),
    });

    await geocodeAddress('FRANKFURT');
    const result = await geocodeAddress('frankfurt');
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('reverseGeocode', () => {
  it('returns display name from API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ display_name: 'Am Marktplatz 1, Frankfurt' }),
    });

    const result = await reverseGeocode(50.1, 8.5);
    expect(result).toBe('Am Marktplatz 1, Frankfurt');
  });

  it('returns null on error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fail'));

    const result = await reverseGeocode(50.1, 8.5);
    expect(result).toBeNull();
  });

  it('caches reverse geocode results', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ display_name: 'Cached Place' }),
    });

    await reverseGeocode(50.123456, 8.654321);
    const result = await reverseGeocode(50.123456, 8.654321);
    expect(result).toBe('Cached Place');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('createDebouncedGeocode', () => {
  it('returns a function', () => {
    const debounced = createDebouncedGeocode(100);
    expect(typeof debounced).toBe('function');
  });
});
