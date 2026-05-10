export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const NotFound = (msg = 'Not found') => new HttpError(404, msg);
export const Forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const Unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);
export const BadRequest = (msg = 'Bad request', details?: unknown) =>
  new HttpError(400, msg, details);
export const Conflict = (msg = 'Conflict', details?: unknown) =>
  new HttpError(409, msg, details);
