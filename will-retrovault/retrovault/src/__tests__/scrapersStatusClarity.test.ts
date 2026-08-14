import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE = path.resolve(import.meta.dirname, '../app/scrapers/page.tsx');

describe('scraper status clarity', () => {
  const src = fs.readFileSync(PAGE, 'utf8');

  it('distinguishes last attempt from last successful run', () => {
    expect(src).toContain('last attempt');
    expect(src).toContain('last successful run');
    expect(src).toContain('function fmtLastSuccess(scraper: Scraper)');
  });
});
