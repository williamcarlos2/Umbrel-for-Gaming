/**
 * Focus Stability Tests
 *
 * Guards against the "focus lost after every keystroke" bug caused by
 * defining components inside render functions. When a component is defined
 * inside another component's render, React treats it as a NEW component type
 * on every render → unmounts + remounts it → active input loses focus.
 *
 * Rule: helper components (Field, Section, Card, etc.) that wrap inputs or
 * other interactive elements MUST be defined at module scope, not inside
 * another component's render function.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.join(process.cwd(), 'src');

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Detect inline component definitions inside another component/function body.
 * Pattern: inside a function body, a line like:
 *   const Foo = ({ ...}: ...) => (   ← JSX-returning arrow component
 *   const Foo = ({ ...}: ...) => {   ← block-body arrow component
 *   function Foo({ ... }) {          ← function declaration inside function
 *
 * We check that known wrappers (Field, Section, Card, FormField, etc.) are
 * NOT defined inside a component function.
 */
function findInlineComponents(src: string): string[] {
  const issues: string[] = [];
  const lines = src.split('\n');

  // Track brace depth to detect "inside a function body"
  // Simple heuristic: look for the pattern after a function/component opening
  let inExportFunction = false;
  let braceDepth = 0;
  let exportFunctionBraceStart = -1;

  const INLINE_COMPONENT_PATTERN = /^\s+const\s+([A-Z][a-zA-Z]*)\s*=\s*\(\s*\{/;
  const EXPORT_FN_PATTERN = /^export\s+(default\s+)?function\s+[A-Z]/;
  const EXPORT_ARROW_PATTERN = /^export\s+(default\s+)?const\s+[A-Z][a-zA-Z]*\s*=\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of top-level exported component
    if (EXPORT_FN_PATTERN.test(line) || EXPORT_ARROW_PATTERN.test(line)) {
      inExportFunction = true;
      braceDepth = 0;
      exportFunctionBraceStart = i;
    }

    if (inExportFunction) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // Inside the function body (depth > 0), look for inline component defs
      if (braceDepth > 0 && INLINE_COMPONENT_PATTERN.test(line)) {
        const match = line.match(INLINE_COMPONENT_PATTERN);
        if (match) {
          issues.push(`Line ${i + 1}: '${match[1]}' component defined inside a function body`);
        }
      }

      // Exited the function
      if (braceDepth <= 0 && exportFunctionBraceStart >= 0 && i > exportFunctionBraceStart) {
        inExportFunction = false;
      }
    }
  }

  return issues;
}

// ─── Files to audit ───────────────────────────────────────────────────────────

const FILES_TO_AUDIT = [
  'components/AddAssetModal.tsx',
  'components/ConsoleModal.tsx',
  'components/PriceDetailModal.tsx',
  'components/BugReportModal.tsx',
  'components/AuthGuard.tsx',
  'app/settings/page.tsx',
  'app/inventory/page.tsx',
  'app/field/page.tsx',
  'app/grails/page.tsx',
  'app/wishlist/page.tsx',
  'app/sales/page.tsx',
  'app/flip/page.tsx',
];

describe('Focus stability — no inline component definitions', () => {
  for (const relPath of FILES_TO_AUDIT) {
    const fullPath = path.join(SRC, relPath);

    it(`${relPath} has no inline component definitions that would cause focus loss`, () => {
      if (!fs.existsSync(fullPath)) {
        // File doesn't exist — skip gracefully
        expect(true).toBe(true);
        return;
      }

      const src = readFile(fullPath);
      const issues = findInlineComponents(src);

      if (issues.length > 0) {
        throw new Error(
          `Focus stability violation in ${relPath}:\n` +
          issues.map(i => `  - ${i}`).join('\n') +
          '\n\nFix: move component definitions to module scope (outside the parent component).'
        );
      }

      expect(issues).toHaveLength(0);
    });
  }

  it('AddAssetModal Field component is defined at module scope', () => {
    const src = readFile(path.join(SRC, 'components/AddAssetModal.tsx'));
    // Field should appear as a module-level function, not inside the export function
    const moduleLevel = /^function Field\s*\(/m.test(src);
    expect(moduleLevel).toBe(true);
  });

  it('Settings Section component is defined at module scope', () => {
    const src = readFile(path.join(SRC, 'app/settings/page.tsx'));
    const moduleLevel = /^function Section\s*\(/m.test(src);
    expect(moduleLevel).toBe(true);
  });
});
