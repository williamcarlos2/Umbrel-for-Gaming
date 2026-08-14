import { describe, expect, it } from 'vitest';
import { parseSteamInput, resolveSteamTarget } from '@/lib/steam';

describe('steam helpers', () => {
  it('parses a numeric profile id cleanly', () => {
    const parsed = parseSteamInput('76561198000000000');
    expect(parsed.kind).toBe('steamId');
    expect(parsed.normalizedProfileUrl).toBe('https://steamcommunity.com/profiles/76561198000000000');
  });

  it('parses vanity profile urls', () => {
    const parsed = parseSteamInput('https://steamcommunity.com/id/dedgamer');
    expect(parsed.kind).toBe('profileUrl');
    expect(parsed.normalizedProfileUrl).toBe('https://steamcommunity.com/id/dedgamer');
  });

  it('builds a dry-run resolve preview contract', () => {
    const resolved = resolveSteamTarget('dedgamer');
    expect(resolved.importMode).toBe('public_profile');
    expect(resolved.canPreview).toBe(true);
    expect(resolved.suggestedPlatform).toBe('PC (Steam)');
    expect(resolved.warnings.some((w) => w.includes('dry-run preview'))).toBe(true);
  });
});
