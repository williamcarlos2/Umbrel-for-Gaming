export type ParsedSteamInput = {
  kind: 'steamId' | 'vanity' | 'profileUrl' | 'unknown';
  value: string;
  normalizedProfileUrl: string | null;
  guidance: string;
};

export type SteamResolveResult = ParsedSteamInput & {
  importMode: 'public_profile' | 'direct_id' | 'manual_review';
  canPreview: boolean;
  warnings: string[];
  suggestedPlatform: string;
};

export function parseSteamInput(raw: string): ParsedSteamInput {
  const input = raw.trim();
  if (!input) {
    return {
      kind: 'unknown',
      value: '',
      normalizedProfileUrl: null,
      guidance: 'Paste a Steam profile URL, vanity name, or 17-digit SteamID64 to get started.',
    };
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.hostname.includes('steamcommunity.com') && parts.length >= 2) {
        const section = parts[0]?.toLowerCase();
        const value = parts[1];
        if (section === 'profiles' && /^\d{17}$/.test(value)) {
          return {
            kind: 'profileUrl',
            value,
            normalizedProfileUrl: `https://steamcommunity.com/profiles/${value}`,
            guidance: 'Numeric Steam profile detected. This is the most stable import target.',
          };
        }
        if (section === 'id' && value) {
          return {
            kind: 'profileUrl',
            value,
            normalizedProfileUrl: `https://steamcommunity.com/id/${value}`,
            guidance: 'Vanity Steam profile detected. This can resolve cleanly if the library is public.',
          };
        }
      }
    } catch {
      // fall through
    }

    return {
      kind: 'unknown',
      value: input,
      normalizedProfileUrl: null,
      guidance: 'That URL does not look like a Steam Community profile yet.',
    };
  }

  if (/^\d{17}$/.test(input)) {
    return {
      kind: 'steamId',
      value: input,
      normalizedProfileUrl: `https://steamcommunity.com/profiles/${input}`,
      guidance: 'SteamID64 detected. Nice and deterministic.',
    };
  }

  if (/^[a-zA-Z0-9_-]{2,64}$/.test(input)) {
    return {
      kind: 'vanity',
      value: input,
      normalizedProfileUrl: `https://steamcommunity.com/id/${input}`,
      guidance: 'Vanity name detected. If the library is public, this is a good first-pass import target.',
    };
  }

  return {
    kind: 'unknown',
    value: input,
    normalizedProfileUrl: null,
    guidance: 'Could not confidently parse that as a Steam profile yet.',
  };
}

export function resolveSteamTarget(raw: string): SteamResolveResult {
  const parsed = parseSteamInput(raw);
  const warnings: string[] = [];

  if (parsed.kind === 'vanity' || (parsed.kind === 'profileUrl' && !/^\d{17}$/.test(parsed.value))) {
    warnings.push('Vanity-based imports depend on Steam Community profile visibility and name resolution.');
  }

  if (parsed.kind !== 'unknown') {
    warnings.push('This is a dry-run preview only. No inventory records will be created in this pass.');
  }

  if (parsed.kind === 'unknown') {
    warnings.push('Provide a Steam profile URL, vanity name, or 17-digit SteamID64 for a better preview.');
  }

  return {
    ...parsed,
    importMode:
      parsed.kind === 'steamId'
        ? 'direct_id'
        : parsed.kind === 'vanity' || parsed.kind === 'profileUrl'
          ? 'public_profile'
          : 'manual_review',
    canPreview: Boolean(parsed.normalizedProfileUrl),
    warnings,
    suggestedPlatform: 'PC (Steam)',
  };
}
