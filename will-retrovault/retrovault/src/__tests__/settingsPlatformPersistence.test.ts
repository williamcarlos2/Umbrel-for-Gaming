import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SETTINGS_PAGE = path.resolve(import.meta.dirname, '../app/settings/page.tsx');

describe('settings platform persistence', () => {
  const src = fs.readFileSync(SETTINGS_PAGE, 'utf8');

  it('persists platforms through the config save payload', () => {
    expect(src).toContain('const configPayload = { ...updates }');
    expect(src).not.toContain("delete (configPayload as any).platforms");
    expect(src).toContain('syncPlatforms(previousPlatforms, nextPlatforms)');
  });

  it('still triggers platform sync after save', () => {
    expect(src).toContain("body: JSON.stringify({ platform, enabled: true, autoPopulate: true })");
  });
});
