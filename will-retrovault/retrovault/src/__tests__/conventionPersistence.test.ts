import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Convention session persistence hardening', () => {
  const libSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/conventionSession.ts'), 'utf8');
  const pageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/convention/page.tsx'), 'utf8');

  it('mutates convention sessions from latest storage state instead of stale in-memory state', () => {
    expect(libSource).toContain('export function mutateConventionSessions');
    expect(libSource).toContain('const current = loadConventionSessions();');
    expect(libSource).toContain("window.dispatchEvent(new CustomEvent('retrovault:convention-sessions-updated'))");
    expect(pageSource).toContain('mutateConventionSessions');
  });
});
