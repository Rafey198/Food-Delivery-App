import { Router } from 'express';
import { prisma } from '@food/database';
import { AddressSchema } from '@food/shared';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { NotFound } from '../utils/errors';

const router = Router();
router.use(authRequired, requireRole('CUSTOMER'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.address.findMany({
      where: { userId: req.user!.sub },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ items });
  }),
);

router.post(
  '/',
  validate(AddressSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof AddressSchema._type>(req);
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.sub },
        data: { isDefault: false },
      });
    }
    const created = await prisma.address.create({
      data: { ...data, userId: req.user!.sub },
    });
    res.status(201).json(created);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw NotFound('Address not found');
    if (req.body?.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.sub },
        data: { isDefault: false },
      });
    }
    const updated = await prisma.address.update({
      where: { id: existing.id },
      data: req.body,
    });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
    });
    if (!existing) throw NotFound('Address not found');
    await prisma.address.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

export default router;
