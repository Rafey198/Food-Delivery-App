import { Router } from 'express';
import { prisma } from '@food/database';
import { authRequired } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFound } from '../utils/errors';
import { ReviewIntelligenceService } from '@food/ai';

const router = Router();
router.use(authRequired);

const intel = new ReviewIntelligenceService();

router.get(
  '/tickets',
  asyncHandler(async (req, res) => {
    const items = await prisma.supportTicket.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      include: { messages: true },
    });
    res.json({ items });
  }),
);

router.post(
  '/tickets',
  asyncHandler(async (req, res) => {
    const aiSuggested = await intel.draftReply(req.body?.message ?? '', 3);
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user!.sub,
        orderId: req.body?.orderId,
        category: req.body?.category ?? 'GENERAL',
        subject: req.body?.subject ?? 'Support request',
        message: req.body?.message ?? '',
        aiSuggestedReply: aiSuggested,
        priority: req.body?.priority ?? 'NORMAL',
        messages: {
          create: {
            authorId: req.user!.sub,
            authorRole: req.user!.role,
            body: req.body?.message ?? '',
          },
        },
      },
    });
    res.status(201).json(ticket);
  }),
);

router.post(
  '/tickets/:id/messages',
  asyncHandler(async (req, res) => {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket || ticket.userId !== req.user!.sub) throw NotFound('Ticket not found');
    const msg = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.sub,
        authorRole: req.user!.role,
        body: req.body?.body ?? '',
      },
    });
    res.status(201).json(msg);
  }),
);

export default router;
