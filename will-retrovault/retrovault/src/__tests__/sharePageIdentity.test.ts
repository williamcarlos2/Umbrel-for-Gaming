import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE = path.resolve(import.meta.dirname, '../app/share/page.tsx');

describe('share page public identity controls', () => {
  const src = fs.readFileSync(PAGE, 'utf8');

  it('lets users edit public identity fields directly on the share page', () => {
    expect(src).toContain('Public page identity');
    expect(src).toContain('Display name');
    expect(src).toContain('Contact email');
    expect(src).toContain('Contact phone');
    expect(src).toContain('Share contact details on the public page');
  });

  it('persists share-page identity changes through /api/config before saving collection share', () => {
    expect(src).toContain('await fetch("/api/config"');
    expect(src).toContain('await fetch("/api/collection-share"');
  });
});
