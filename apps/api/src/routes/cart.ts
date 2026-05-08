import { Router } from 'express';
import { prisma } from '@food/database';
import { CartItemSchema } from '@food/shared';
import { authRequired, requireRole } from '../auth/middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getValidated, validate } from '../utils/validate';
import { BadRequest, NotFound } from '../utils/errors';

const router = Router();
router.use(authRequired, requireRole('CUSTOMER'));

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { menuItem: true } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: { items: { include: { menuItem: true } } },
    });
  }
  return cart;
}

function serializeCart(cart: Awaited<ReturnType<typeof getOrCreateCart>>) {
  const items = cart.items.map((it) => {
    const variants = (it.selectedVariants as any[]) ?? [];
    const addOns = (it.selectedAddOns as any[]) ?? [];
    const variantTotal = variants.reduce((s, v) => s + (v.priceDelta ?? 0), 0);
    const addOnTotal = addOns.reduce((s, a) => s + (a.price ?? 0), 0);
    const unitPrice = Number(it.menuItem.price) + variantTotal + addOnTotal;
    return {
      id: it.id,
      menuItemId: it.menuItemId,
      name: it.menuItem.name,
      imageUrl: it.menuItem.imageUrl,
      quantity: it.quantity,
      notes: it.notes,
      selectedVariants: variants,
      selectedAddOns: addOns,
      unitPrice: +unitPrice.toFixed(2),
      lineTotal: +(unitPrice * it.quantity).toFixed(2),
    };
  });
  const subtotal = +items.reduce((s, it) => s + it.lineTotal, 0).toFixed(2);
  return {
    id: cart.id,
    restaurantId: cart.restaurantId,
    items,
    subtotal,
    itemCount: items.reduce((s, it) => s + it.quantity, 0),
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.sub);
    res.json(serializeCart(cart));
  }),
);

router.post(
  '/items',
  validate(CartItemSchema),
  asyncHandler(async (req, res) => {
    const data = getValidated<typeof CartItemSchema._type>(req);
    const item = await prisma.menuItem.findUnique({ where: { id: data.menuItemId } });
    if (!item || !item.isAvailable) throw NotFound('Menu item unavailable');

    let cart = await getOrCreateCart(req.user!.sub);
    if (cart.restaurantId && cart.restaurantId !== item.restaurantId) {
      // restaurant changed → clear cart
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: item.restaurantId } });
    } else if (!cart.restaurantId) {
      await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: item.restaurantId } });
    }

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        menuItemId: data.menuItemId,
        quantity: data.quantity,
        notes: data.notes,
        selectedVariants: data.selectedVariants ?? [],
        selectedAddOns: data.selectedAddOns ?? [],
      },
    });
    cart = await getOrCreateCart(req.user!.sub);
    res.json(serializeCart(cart));
  }),
);

router.patch(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id }, include: { cart: true } });
    if (!item || item.cart.userId !== req.user!.sub) throw NotFound('Cart item not found');
    const quantity = Number(req.body?.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 20) throw BadRequest('Invalid quantity');
    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity, notes: req.body?.notes ?? item.notes },
      });
    }
    const cart = await getOrCreateCart(req.user!.sub);
    res.json(serializeCart(cart));
  }),
);

router.delete(
  '/items/:id',
  asyncHandler(async (req, res) => {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id }, include: { cart: true } });
    if (!item || item.cart.userId !== req.user!.sub) throw NotFound('Cart item not found');
    await prisma.cartItem.delete({ where: { id: item.id } });
    const cart = await getOrCreateCart(req.user!.sub);
    res.json(serializeCart(cart));
  }),
);

router.post(
  '/clear',
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user!.sub);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { restaurantId: null } });
    const cleared = await getOrCreateCart(req.user!.sub);
    res.json(serializeCart(cleared));
  }),
);

export default router;
