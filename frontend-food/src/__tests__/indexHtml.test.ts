// @vitest-environment node
/**
 * The entry document of the food frontend (food-design-system, mobile-viewport):
 * zoom is allowed, no third-party font hosts, and the boot screen is white.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

describe('index.html', () => {
  it('does not restrict zooming', () => {
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/maximum-scale|user-scalable=no/);
  });

  it('loads no fonts from third-party hosts', () => {
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('preloads the display font from the own origin', () => {
    expect(html).toContain('href="/fonts/bricolage-grotesque-latin-wght.woff2"');
  });

  it('shows a white boot screen with petrol accents', () => {
    expect(html).toMatch(/\.boot \{[^}]*background: #FFFFFF/);
    expect(html).not.toMatch(/#1F4D3A|#C2410C/);
  });

  it('uses the optimised mascot files as favicon and logo, never the 2048 px original', () => {
    expect(html).not.toContain('/images/favicon.png');
    expect(html).toContain('/images/favicon-32.png');
    expect(html).toContain('/images/apple-touch-icon.png');
    expect(html).toContain('/images/inspi-logo.webp');
  });

  it('keeps every mascot asset of the food frontend below 60 KB', () => {
    const dir = fileURLToPath(new URL('../../public/images/', import.meta.url));
    for (const file of ['inspi-logo.webp', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.webp']) {
      expect(statSync(dir + file).size, file).toBeLessThanOrEqual(60 * 1024);
    }
  });
});
