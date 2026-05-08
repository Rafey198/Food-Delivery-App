import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authRequired);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ items });
  }),
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  }),
);

export default router;
