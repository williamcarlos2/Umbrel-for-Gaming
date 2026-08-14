import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Price detail modal variant support', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/components/PriceDetailModal.tsx'), 'utf8');

  it('fetches live variant info for the modal and renders variant pricing details', () => {
    expect(source).toContain('/api/pricecharting?title=${encodeURIComponent(item.title)}&platform=${encodeURIComponent(item.platform)}');
    expect(source).toContain('variantInfo');
    expect(source).toContain('Variant-sensitive pricing');
    expect(source).toContain('variantMatches.map');
  });
});
