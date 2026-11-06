import { describe, expect, it } from 'vitest';
import { AppError, TooManyRequestsError } from '..';

describe('TooManyRequestsError', () => {
  it('is a 429 too_many_requests AppError', () => {
    const e = new TooManyRequestsError('x');
    expect(e).toBeInstanceOf(AppError);
    expect(e).toMatchObject({ status: 429, code: 'too_many_requests', message: 'x' });
  });
});
