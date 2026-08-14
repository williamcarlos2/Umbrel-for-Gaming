import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const SETTINGS_PAGE = path.resolve(import.meta.dirname, '../app/settings/page.tsx');

describe('settings page navigation wiring', () => {
  const src = fs.readFileSync(SETTINGS_PAGE, 'utf8');

  it('renders a local jump nav for settings sections', () => {
    expect(src).toContain('Jump to section');
    expect(src).toContain('href={`#${section.id}`}');
    expect(src).toContain('sticky top-[76px]');
  });

  it('anchors the major settings sections with stable ids', () => {
    for (const id of [
      'theme',
      'identity',
      'localization',
      'deployment',
      'price-data',
      'platforms',
      'scrapers',
      'features',
      'youtube',
      'bug-reporting',
      'authentication',
    ]) {
      expect(src).toContain(`id="${id}"`);
    }
  });
});
