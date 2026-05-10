import jwt from 'jsonwebtoken';
import { env } from '../env';
import type { Role } from '@food/shared';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as any });
}

export function signRefreshToken(payload: { sub: string; tokenId: string }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as any });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string; tokenId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string; tokenId: string };
}
