import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, AccessTokenPayload } from './jwt';
import { prisma } from '@food/database';
import type { Role } from '@food/shared';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload & { name?: string };
    }
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = verifyAccessToken(header.slice(7));
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // ignore
    }
  }
  return next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

export async function loadUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();
  const u = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!u || u.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Account inactive' });
  }
  req.user.name = u.name;
  return next();
}
