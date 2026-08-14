import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const PAGE = path.resolve(import.meta.dirname, '../app/inventory/page.tsx');

describe('inventory sorting UX', () => {
  const src = fs.readFileSync(PAGE, 'utf8');

  it('defaults vault sorting to newest date added first', () => {
    expect(src).toContain('useState<string>("dateAdded")');
    expect(src).toContain('useState<"asc" | "desc">("desc")');
    expect(src).toContain('SORT: DATE ADDED (NEWEST)');
  });

  it('offers explicit sort controls for date added and game age', () => {
    expect(src).toContain('value={`${sortField}:${sortOrder}`}');
    expect(src).toContain('SORT: DATE ADDED (OLDEST)');
    expect(src).toContain('SORT: GAME AGE (OLDEST)');
    expect(src).toContain('SORT: GAME AGE (NEWEST)');
  });

  it('does not silently restrict the vault to enabled platform subsets', () => {
    expect(src).toContain('const filteredByPlatform = items;');
    expect(src).toContain('Platform enablement is a settings/input convenience');
  });

  it('renames critics to players in the people manager and supports player colors', () => {
    expect(src).toContain('🎮 PLAYERS');
    expect(src).toContain('PLAYER_COLOR_OPTIONS');
    expect(src).toContain('Player Color');
    expect(src).toContain('color: newPersonColor || null');
  });
});
