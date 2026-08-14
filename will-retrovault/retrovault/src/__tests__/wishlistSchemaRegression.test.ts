import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('Wishlist schema regression guards', () => {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const createRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/wishlist/route.ts'), 'utf8');
  const patchRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/wishlist/[id]/route.ts'), 'utf8');

  it('keeps persisted wishlist market price fields in the Prisma schema', () => {
    expect(schema).toContain('model WishlistItem');
    expect(schema).toContain('marketLoose Float?');
    expect(schema).toContain('marketCib   Float?');
    expect(schema).toContain('marketNew   Float?');
    expect(schema).toContain('marketGraded Float?');
    expect(schema).toContain('lastFetched DateTime?');
  });

  it('writes wishlist price fields on create', () => {
    expect(createRoute).toContain('marketLoose');
    expect(createRoute).toContain('marketCib');
    expect(createRoute).toContain('marketNew');
    expect(createRoute).toContain('marketGraded');
    expect(createRoute).toContain('lastFetched');
  });

  it('updates wishlist price fields on patch', () => {
    expect(patchRoute).toContain('body.marketLoose');
    expect(patchRoute).toContain('body.marketCib');
    expect(patchRoute).toContain('body.marketNew');
    expect(patchRoute).toContain('body.marketGraded');
    expect(patchRoute).toContain('body.lastFetched');
  });
});
