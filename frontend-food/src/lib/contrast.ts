/**
 * WCAG 2.x contrast for the HSL design tokens (`--token: H S% L%`).
 * Shared by the contrast test and the styleguide.
 */

export type Hsl = [hue: number, saturation: number, lightness: number];

/** Parse an HSL triplet such as `142 72% 28%`; returns `null` for anything else. */
export function parseHsl(value: string): Hsl | null {
  const parts = value.trim().match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!parts) return null;
  return [Number(parts[1]), Number(parts[2]) / 100, Number(parts[3]) / 100];
}

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function relativeLuminance(hsl: Hsl): number {
  const [r, g, b] = hslToRgb(hsl).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours (1–21). */
export function contrastRatio(a: Hsl, b: Hsl): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
