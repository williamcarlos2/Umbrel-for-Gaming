import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const inventorySrc = fs.readFileSync(path.resolve(import.meta.dirname, '../app/inventory/page.tsx'), 'utf8');
const shellSrc = fs.readFileSync(path.resolve(import.meta.dirname, '../components/AppShell.tsx'), 'utf8');
const tooltipSrc = fs.readFileSync(path.resolve(import.meta.dirname, '../components/Tooltip.tsx'), 'utf8');

describe('tooltip coverage for key tool actions', () => {
  it('supports optional docs links in generic tooltips', () => {
    expect(tooltipSrc).toContain('href?: string');
    expect(tooltipSrc).toContain("linkLabel = 'Docs'");
    expect(tooltipSrc).toContain('pointer-events-auto');
  });

  it('wraps important inventory row actions in tooltips', () => {
    expect(inventorySrc).toContain('Pull a fresh live market lookup');
    expect(inventorySrc).toContain('Edit copies, condition, cost, notes');
    expect(inventorySrc).toContain('pre-filled eBay search');
    expect(inventorySrc).toContain('full PriceCharting page');
    expect(inventorySrc).toContain('Delete this vault entry');
  });

  it('adds tooltip help to shell utility actions', () => {
    expect(shellSrc).toContain('Search pages, tools, and key records');
    expect(shellSrc).toContain('Open the bug report flow');
    expect(shellSrc).toContain('Launch a guided walkthrough');
    expect(shellSrc).toContain('Turn tooltips on to get inline help');
  });
});
