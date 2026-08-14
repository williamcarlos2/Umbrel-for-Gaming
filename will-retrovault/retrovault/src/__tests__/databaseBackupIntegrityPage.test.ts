import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const HEALTH_PAGE = path.resolve(import.meta.dirname, '../app/health/page.tsx');

describe('health page database backup integrity panel', () => {
  const src = fs.readFileSync(HEALTH_PAGE, 'utf8');

  it('loads the database backup integrity API and renders the panel labels', () => {
    expect(src).toContain("/api/database-backup-integrity");
    expect(src).toContain('Database Backup Integrity');
    expect(src).toContain('SQLite quick_check');
    expect(src).toContain('Game Rows');
    expect(src).toContain('GameCopy Rows');
  });
});
