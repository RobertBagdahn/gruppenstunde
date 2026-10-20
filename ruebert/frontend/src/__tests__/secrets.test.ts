// @vitest-environment node
/** The GitHub token stays on the server (feedback spec): no token name or value may appear in the frontend source. */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|json|html)$/.test(name) ? [path] : [];
  });
}

describe('token protection (feedback spec)', () => {
  it('the frontend source never names the GitHub token or a token value', () => {
    const offenders = files(SRC)
      .filter((path) => !/\.test\.(ts|tsx)$/.test(path))
      .filter((path) => /GITHUB_TOKEN|github_pat|ghp_|githubToken/i.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path).split(sep).join('/'));
    expect(offenders).toEqual([]);
  });
});
