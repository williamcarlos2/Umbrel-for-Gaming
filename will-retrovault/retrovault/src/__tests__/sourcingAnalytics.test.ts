import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE = path.resolve(import.meta.dirname, '../app/sourcing/page.tsx');

describe('sourcing analytics page', () => {
  const src = fs.readFileSync(PAGE, 'utf8');

  it('aggregates sourcing from copy-level source truth', () => {
    expect(src).toContain('copyRows = items.flatMap');
    expect(src).toContain('source: normalizeSource(copy.source || item.source)');
    expect(src).toContain('copyCount');
    expect(src).toContain('gameCount');
  });

  it('surfaces platform mix and spend/value metrics by source', () => {
    expect(src).toContain('topPlatforms');
    expect(src).toContain('Total spend by source');
    expect(src).toContain('Biggest spend source');
    expect(src).toContain('Top Platforms');
  });
});
