import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertNotDemoProtected, isDemoProtected } from './ownership.js';

const snapshot = new Date('2026-10-29T18:00:00Z');

describe('isDemoProtected', () => {
  it('protects content up to and including the snapshot', () => {
    expect(isDemoProtected(snapshot, new Date('2026-10-28T10:00:00Z'))).toBe(true);
    expect(isDemoProtected(snapshot, snapshot)).toBe(true);
  });

  it('leaves later additions and normal notebooks unprotected', () => {
    expect(isDemoProtected(snapshot, new Date('2026-10-29T18:00:01Z'))).toBe(false);
    expect(isDemoProtected(null, new Date('2026-10-28T10:00:00Z'))).toBe(false);
  });
});

describe('assertNotDemoProtected', () => {
  it('throws 403 for protected content only', () => {
    expect(() => assertNotDemoProtected(snapshot, snapshot)).toThrow(ForbiddenException);
    expect(() => assertNotDemoProtected(null, snapshot)).not.toThrow();
  });
});
