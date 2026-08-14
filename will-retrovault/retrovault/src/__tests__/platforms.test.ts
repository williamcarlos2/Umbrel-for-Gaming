import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { ALL_PLATFORMS, PLATFORM_GROUPS } from '@/data/platformGroups';

describe('Virtual Boy platform coverage', () => {
  it('is included in the shared platform groups', () => {
    expect(ALL_PLATFORMS).toContain('Virtual Boy');
    expect(PLATFORM_GROUPS.find((group) => group.id === 'nintendo-handheld')?.platforms).toContain('Virtual Boy');
  });

  it('is wired into settings presets and platform sync mappings', () => {
    const settingsSource = fs.readFileSync(path.join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');
    const syncSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/platformCatalogSync.ts'), 'utf8');
    const priceSource = fs.readFileSync(path.join(process.cwd(), 'src/app/api/pricecharting/route.ts'), 'utf8');

    expect(settingsSource).toContain('Virtual Boy');
    expect(syncSource).toContain("{ name: 'Virtual Boy', slug: 'virtual-boy' }");
    expect(priceSource).toContain("'virtual boy': 'virtual-boy'");
  });
});
