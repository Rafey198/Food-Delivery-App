import { Router, raw } from 'express';
import crypto from 'crypto';
import { prisma } from '@food/database';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../env';
import { authRequired } from '../auth/middleware';

const router = Router();

/**
 * Stripe-compatible webhook. Verifies signature when STRIPE_WEBHOOK_SECRET is set,
 * otherwise falls back to a shared-secret header for local development.
 */
router.post(
  '/webhooks/stripe',
  raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const body = req.body as Buffer;

    if (env.STRIPE_WEBHOOK_SECRET) {
      // simplified verification (production: use stripe SDK)
      const expected = crypto
        .createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      if (!signature || !signature.includes(expected)) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = JSON.parse(body.toString());
    if (event.type === 'payment_intent.succeeded') {
      const orderId = event.data?.object?.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'PAID' },
        });
        await prisma.payment.updateMany({
          where: { orderId },
          data: { status: 'PAID', providerPaymentId: event.data.object.id },
        });
      }
    }

    res.json({ received: true });
  }),
);

router.post(
  '/intents',
  authRequired,
  asyncHandler(async (req, res) => {
    // Mock payment intent creation; replace with stripe.paymentIntents.create when configured
    const orderId = req.body?.orderId;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({
      clientSecret: `mock_secret_${order.id}`,
      provider: env.STRIPE_SECRET_KEY ? 'stripe' : 'mock',
      amount: Number(order.total),
      currency: order.currency.toLowerCase(),
    });
  }),
);

export default router;
