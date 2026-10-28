import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toErrorBody } from './all-exceptions.filter.js';

describe('toErrorBody', () => {
  it('keeps status and message of HTTP exceptions', () => {
    expect(toErrorBody(new NotFoundException('Notebook nicht gefunden'))).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'Notebook nicht gefunden',
    });
  });

  it('passes validation message lists through', () => {
    const body = toErrorBody(new BadRequestException(['title: Too short']));
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(['title: Too short']);
  });

  it('replaces English middleware messages for oversized uploads', () => {
    const body = toErrorBody(new PayloadTooLargeException('File too large'));
    expect(body.statusCode).toBe(413);
    expect(body.message).toMatch(/20 MB/);
  });

  it('maps auth guard rejections to 401', () => {
    expect(toErrorBody(new UnauthorizedException()).statusCode).toBe(401);
  });

  it('hides details of unexpected errors', () => {
    const body = toErrorBody(new Error('connection string postgres://secret@db'));
    expect(body.statusCode).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret');
  });
});
