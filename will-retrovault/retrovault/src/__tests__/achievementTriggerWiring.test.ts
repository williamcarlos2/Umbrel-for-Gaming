import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '..');

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('manual achievement trigger wiring', () => {
  it('guide page unlocks a_guide via canonical helper', () => {
    const src = read('app/guide/page.tsx');
    expect(src).toContain("unlockAchievement('a_guide')");
  });

  it('negotiate page unlocks a_negotiator via canonical helper', () => {
    const src = read('app/negotiate/page.tsx');
    expect(src).toContain("unlockAchievement('a_negotiator')");
  });

  it('insurance report generation unlocks a_insurance via canonical helper', () => {
    const src = read('app/insurance/page.tsx');
    expect(src).toContain("unlockAchievement('a_insurance')");
    expect(src).toContain('const generate = () =>');
  });

  it('field mode live lookup unlocks a_field via canonical helper', () => {
    const src = read('app/field/page.tsx');
    expect(src).toContain("unlockAchievement('a_field')");
    expect(src).toContain('source: "pricecharting"');
  });
});
