/**
 * CSV Import — Parser tests
 * Tests platform normalization, field mapping, CIB detection
 */

import { describe, it, expect } from 'vitest';

// Replicated from import/page.tsx for unit testing
const PLATFORM_ALIASES: Record<string, string> = {
  "nes": "NES", "nintendo entertainment system": "NES", "famicom": "NES",
  "snes": "SNES", "super nintendo": "SNES", "super nes": "SNES",
  "n64": "N64", "nintendo 64": "N64",
  "gamecube": "Gamecube", "gcn": "Gamecube", "gc": "Gamecube",
  "switch": "Switch", "nintendo switch": "Switch",
  "genesis": "Sega Genesis", "sega genesis": "Sega Genesis",
  "megadrive": "Sega Genesis", "mega drive": "Sega Genesis",
  "sega cd": "Sega CD", "segacd": "Sega CD",
  "dreamcast": "Dreamcast", "dc": "Dreamcast",
  "ps1": "PS1", "psx": "PS1", "playstation": "PS1", "playstation 1": "PS1",
  "ps2": "PS2", "playstation 2": "PS2",
  "ps3": "PS3", "playstation 3": "PS3",
  "psp": "PSP",
  "xbox": "Xbox",
  "xbox 360": "Xbox 360", "360": "Xbox 360",
};

function normalizePlatform(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return PLATFORM_ALIASES[lower] || raw.trim();
}

function detectCib(condition: string, hasBox: string, hasManual: string): { hasBox: boolean; hasManual: boolean } {
  const condLower = condition.toLowerCase();
  const isCib = condLower === 'cib' || condLower === 'complete';
  const boxVal = ['yes', 'true', '1', 'cib', 'complete'].includes(hasBox.toLowerCase());
  const manualVal = ['yes', 'true', '1', 'cib', 'complete'].includes(hasManual.toLowerCase());
  return {
    hasBox: isCib || boxVal,
    hasManual: isCib || manualVal,
  };
}

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuote = false;
  for (const char of line) {
    if (char === '"') { inQuote = !inQuote; continue; }
    if (char === ',' && !inQuote) { cells.push(current.trim()); current = ''; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

describe('Platform normalization', () => {
  it('normalizes common aliases', () => {
    expect(normalizePlatform('snes')).toBe('SNES');
    expect(normalizePlatform('Super Nintendo')).toBe('SNES');
    expect(normalizePlatform('n64')).toBe('N64');
    expect(normalizePlatform('Nintendo 64')).toBe('N64');
    expect(normalizePlatform('gamecube')).toBe('Gamecube');
    expect(normalizePlatform('GCN')).toBe('Gamecube');
  });

  it('normalizes Sega aliases', () => {
    expect(normalizePlatform('genesis')).toBe('Sega Genesis');
    expect(normalizePlatform('Mega Drive')).toBe('Sega Genesis');
    expect(normalizePlatform('MegaDrive')).toBe('Sega Genesis');
    expect(normalizePlatform('dreamcast')).toBe('Dreamcast');
    expect(normalizePlatform('DC')).toBe('Dreamcast');
  });

  it('normalizes PlayStation aliases', () => {
    expect(normalizePlatform('ps1')).toBe('PS1');
    expect(normalizePlatform('PSX')).toBe('PS1');
    expect(normalizePlatform('playstation')).toBe('PS1');
    expect(normalizePlatform('ps2')).toBe('PS2');
    expect(normalizePlatform('Playstation 2')).toBe('PS2');
  });

  it('normalizes Xbox aliases', () => {
    expect(normalizePlatform('xbox 360')).toBe('Xbox 360');
    expect(normalizePlatform('360')).toBe('Xbox 360');
    expect(normalizePlatform('xbox')).toBe('Xbox');
  });

  it('passes through unknown platforms unchanged', () => {
    expect(normalizePlatform('TurboGrafx-16')).toBe('TurboGrafx-16');
    expect(normalizePlatform('Neo Geo')).toBe('Neo Geo');
  });

  it('is case-insensitive', () => {
    expect(normalizePlatform('SNES')).toBe('SNES');
    expect(normalizePlatform('Snes')).toBe('SNES');
    expect(normalizePlatform('sNeS')).toBe('SNES');
  });
});

describe('CIB detection', () => {
  it('detects CIB from condition field', () => {
    const result = detectCib('CIB', 'no', 'no');
    expect(result.hasBox).toBe(true);
    expect(result.hasManual).toBe(true);
  });

  it('detects CIB from "Complete" condition', () => {
    const result = detectCib('Complete', 'no', 'no');
    expect(result.hasBox).toBe(true);
    expect(result.hasManual).toBe(true);
  });

  it('detects box from yes/true/1', () => {
    expect(detectCib('Loose', 'yes', 'no').hasBox).toBe(true);
    expect(detectCib('Loose', 'true', 'no').hasBox).toBe(true);
    expect(detectCib('Loose', '1', 'no').hasBox).toBe(true);
  });

  it('does not set CIB from non-CIB condition', () => {
    const result = detectCib('Loose', 'no', 'no');
    expect(result.hasBox).toBe(false);
    expect(result.hasManual).toBe(false);
  });

  it('handles mixed case', () => {
    expect(detectCib('cib', 'No', 'No').hasBox).toBe(true);
    expect(detectCib('Loose', 'YES', 'NO').hasBox).toBe(true);
  });
});

describe('CSV line parser', () => {
  it('parses simple comma-separated values', () => {
    const cells = parseCSVLine('Super Mario World,SNES,CIB,24.99');
    expect(cells).toEqual(['Super Mario World', 'SNES', 'CIB', '24.99']);
  });

  it('handles quoted fields with commas', () => {
    const cells = parseCSVLine('"Zelda, Wind Waker",Gamecube,Loose,57.00');
    expect(cells[0]).toBe('Zelda, Wind Waker');
    expect(cells[1]).toBe('Gamecube');
  });

  it('trims whitespace', () => {
    const cells = parseCSVLine(' Super Mario , SNES , Loose , 20.00 ');
    expect(cells[0]).toBe('Super Mario');
    expect(cells[1]).toBe('SNES');
  });

  it('handles empty fields', () => {
    const cells = parseCSVLine('Super Mario World,,Loose,');
    expect(cells[1]).toBe('');
    expect(cells[3]).toBe('');
  });
});
