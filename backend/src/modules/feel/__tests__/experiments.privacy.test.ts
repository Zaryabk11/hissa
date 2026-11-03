import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Experiments are private to their owner (decision 0006): no buddy code may read or import them.
const modules = join(__dirname, '..', '..');
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sources(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

describe('experiments stay out of buddy code', () => {
  it('the streaks module neither mentions experiments nor imports the feel module', () => {
    for (const file of sources(join(modules, 'streaks'))) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/experiment/i);
      expect(text, file).not.toMatch(/from '[^']*\/feel(\/|')/);
    }
  });

  it('no module except the feel module itself imports feel, apart from the registry', () => {
    for (const mod of readdirSync(modules).filter((n) =>
      statSync(join(modules, n)).isDirectory(),
    )) {
      if (mod === 'feel') continue;
      for (const file of sources(join(modules, mod))) {
        expect(readFileSync(file, 'utf8'), file).not.toMatch(/from '[^']*\/feel(\/|')/);
      }
    }
  });
});
