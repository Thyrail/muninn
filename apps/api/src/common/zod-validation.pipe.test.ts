import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ title: z.string().min(1) }));

describe('ZodValidationPipe', () => {
  it('returns parsed data', () => {
    expect(pipe.transform({ title: 'Raben', extra: true })).toEqual({ title: 'Raben' });
  });

  it('throws a 400 listing the invalid fields', () => {
    expect(() => pipe.transform({ title: '' })).toThrow(BadRequestException);
    try {
      pipe.transform({});
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: [expect.stringMatching(/^title:/)],
      });
    }
  });
});
