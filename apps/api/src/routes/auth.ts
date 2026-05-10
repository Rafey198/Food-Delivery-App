import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@food/database';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RefreshSchema,
  RegisterSchema,
  VerifyOtpSchema,
} from '@food/shared';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../auth/jwt';
import { authRequired } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequest, Conflict, Unauthorized } from '../utils/errors';
import { getValidated, validate } from '../utils/validate';

const router = Router();

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post(
  '/register',
  validate(RegisterSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof RegisterSchema._type>(req);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw Conflict('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role ?? 'CUSTOMER',
      },
    });

    if (user.role === 'COURIER') {
      await prisma.courier.create({
        data: { userId: user.id, isApproved: false },
      });
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, tokenId });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  }),
);

router.post(
  '/login',
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = getValidated<typeof LoginSchema._type>(req);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Unauthorized('Invalid credentials');
    if (user.status !== 'ACTIVE') throw Unauthorized('Account inactive');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw Unauthorized('Invalid credentials');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const tokenId = crypto.randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, tokenId });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    });
  }),
);

router.post(
  '/refresh',
  validate(RefreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = getValidated<typeof RefreshSchema._type>(req);
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw Unauthorized('Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw Unauthorized('Refresh token invalid or revoked');
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) throw Unauthorized('User not found');

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const newRefresh = signRefreshToken({ sub: user.id, tokenId: crypto.randomUUID() });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefresh),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: newRefresh,
    });
  }),
);

router.post(
  '/logout',
  authRequired,
  asyncHandler(async (req, res) => {
    if (req.body?.refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(req.body.refreshToken) },
        data: { revokedAt: new Date() },
      });
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/forgot-password',
  validate(ForgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = getValidated<typeof ForgotPasswordSchema._type>(req);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await prisma.otpCode.create({
        data: {
          userId: user.id,
          code,
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      // In production: send email/SMS. For dev we surface in response when not prod.
      if (process.env.NODE_ENV !== 'production') {
        return res.json({ ok: true, devCode: code });
      }
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/verify-otp',
  validate(VerifyOtpSchema),
  asyncHandler(async (req, res) => {
    const { email, code, purpose } = getValidated<typeof VerifyOtpSchema._type>(req);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw BadRequest('Invalid OTP');
    const otp = await prisma.otpCode.findFirst({
      where: { userId: user.id, code, purpose, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw BadRequest('Invalid or expired OTP');
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
    if (purpose === 'VERIFY') {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }
    res.json({ ok: true });
  }),
);

router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        loyaltyPoints: true,
        walletBalance: true,
        emailVerified: true,
        preferences: true,
      },
    });
    res.json({ user });
  }),
);

export default router;
