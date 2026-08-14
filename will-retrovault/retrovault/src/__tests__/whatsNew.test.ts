import { describe, expect, it } from 'vitest';
import { shouldShowWhatsNew } from '@/components/WhatsNew';

describe('shouldShowWhatsNew', () => {
  it('shows when nothing has been seen yet', () => {
    expect(shouldShowWhatsNew(null, '2.1.25')).toBe(true);
  });

  it('does not show when the current version has already been seen', () => {
    expect(shouldShowWhatsNew('2.1.25', '2.1.25')).toBe(false);
  });

  it('shows again for a newer release', () => {
    expect(shouldShowWhatsNew('2.1.24', '2.1.25')).toBe(true);
  });
});
