import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors';

type Source = 'body' | 'query' | 'params';

export function validate(source: Source, schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      throw new ValidationError(result.error.issues.map((i) => i.message).join('; '));
    // Express 5 makes req.query a getter, so only body is replaced with the parsed value.
    if (source === 'body') req.body = result.data;
    next();
  };
}
