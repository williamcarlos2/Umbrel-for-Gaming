import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('AddAssetModal platform sourcing', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/AddAssetModal.tsx'), 'utf8');

  it('merges enabled runtime platforms ahead of the static fallback list', () => {
    expect(source).toContain("fetch('/api/config')");
    expect(source).toContain("const enabled = ((Array.isArray(cfg?.platforms) ? cfg.platforms : []) as string[])");
    expect(source).toContain(".filter((name: string) => name && name.toLowerCase() !== 'all')");
    expect(source).toContain('const uniqueEnabled = [...new Set(enabled)];');
    expect(source).toContain('const nextPlatforms = [...uniqueEnabled, ...uniqueStatic];');
    expect(source).toContain('availablePlatformsRef.current = nextPlatforms;');
    expect(source).toContain('setAvailablePlatforms(nextPlatforms);');
  });

  it('keeps suggestions driven by the merged runtime platform list', () => {
    expect(source).toContain('const availablePlatformsRef = useRef<string[]>(STATIC_PLATFORM_NAMES);');
    expect(source).toContain('const available = availablePlatformsRef.current;');
    expect(source).toContain('const combined = [...recent, ...available.filter((name) => !recent.includes(name))];');
  });
});
