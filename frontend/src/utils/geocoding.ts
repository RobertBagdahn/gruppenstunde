/**
 * Geocoding utility using Nominatim API with debouncing and LocalStorage caching.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const CACHE_KEY = "geocoding_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface CacheEntry {
  result: GeocodingResult;
  timestamp: number;
}

function getCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setCache(key: string, result: GeocodingResult) {
  try {
    const cache = getCache();
    cache[key] = { result, timestamp: Date.now() };

    // Prune old entries
    const now = Date.now();
    for (const k of Object.keys(cache)) {
      if (now - cache[k].timestamp > CACHE_TTL_MS) {
        delete cache[k];
      }
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // LocalStorage full or unavailable — ignore
  }
}

function getCachedResult(key: string): GeocodingResult | null {
  const cache = getCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.result;
}

/**
 * Geocode an address string to coordinates.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address.trim()) return null;

  const cacheKey = address.toLowerCase().trim();
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      countrycodes: "de",
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        "User-Agent": "Inspi/1.0 (gruppenstunde.de)",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.length) return null;

    const result: GeocodingResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const cached = getCachedResult(cacheKey);
  if (cached) return cached.displayName;

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: "json",
    });

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        "User-Agent": "Inspi/1.0 (gruppenstunde.de)",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const displayName = data.display_name || null;

    if (displayName) {
      setCache(cacheKey, { lat, lng, displayName });
    }

    return displayName;
  } catch {
    return null;
  }
}

/**
 * Create a debounced version of geocodeAddress.
 */
export function createDebouncedGeocode(delayMs = 1000) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (address: string): Promise<GeocodingResult | null> => {
    return new Promise((resolve) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const result = await geocodeAddress(address);
        resolve(result);
      }, delayMs);
    });
  };
}
