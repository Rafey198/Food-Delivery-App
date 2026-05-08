import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate<T>(
  schema: ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: result.error.flatten(),
      });
    }
    (req as any)[`validated_${source}`] = result.data;
    return next();
  };
}

export function getValidated<T>(req: Request, source: 'body' | 'query' | 'params' = 'body'): T {
  return (req as any)[`validated_${source}`] as T;
}
