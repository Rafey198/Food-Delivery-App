import { z } from 'zod';

export const RoleEnum = z.enum(['CUSTOMER', 'MERCHANT', 'COURIER', 'ADMIN']);

export const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phone: z.string().min(6).max(20).optional(),
  role: RoleEnum.optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(8),
  purpose: z.string().default('VERIFY'),
});

export const AddressSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('PK'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryInstructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const CartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().max(300).optional(),
  selectedVariants: z
    .array(z.object({ variantId: z.string(), name: z.string(), priceDelta: z.number() }))
    .optional(),
  selectedAddOns: z
    .array(z.object({ addOnId: z.string(), name: z.string(), price: z.number() }))
    .optional(),
});

export const CreateOrderSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(['CARD', 'WALLET', 'CASH', 'APPLE_PAY', 'GOOGLE_PAY']).default('CARD'),
  scheduledFor: z.string().datetime().optional(),
  couponCode: z.string().optional(),
  tip: z.number().min(0).max(50).default(0),
  notes: z.string().max(300).optional(),
  ecoFriendly: z.boolean().optional(),
  noCutlery: z.boolean().optional(),
});

export const ReviewSchema = z.object({
  foodRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  images: z.array(z.string().url()).optional(),
});

export const NearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(50).default(10),
  cuisine: z.string().optional(),
  query: z.string().optional(),
  open: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const SearchSchema = z.object({
  q: z.string().min(1).max(100),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minRating: z.coerce.number().optional(),
  maxDeliveryMinutes: z.coerce.number().optional(),
  dietary: z.string().optional(),
});

export const MenuItemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  categoryId: z.string().optional(),
  isAvailable: z.boolean().default(true),
  prepTime: z.number().int().min(1).max(120).default(15),
  calories: z.number().int().optional(),
  spiceLevel: z.number().int().min(0).max(5).optional(),
  allergens: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  sustainabilityTags: z.array(z.string()).optional(),
});

export const MealAssistantSchema = z.object({
  message: z.string().min(1).max(500),
  conversation: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .optional(),
  context: z
    .object({
      lat: z.number().optional(),
      lon: z.number().optional(),
      budget: z.number().optional(),
      dietary: z.array(z.string()).optional(),
    })
    .optional(),
});

export const RecommendationsSchema = z.object({
  lat: z.number().optional(),
  lon: z.number().optional(),
  budget: z.number().optional(),
  dietary: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CartItemInput = z.infer<typeof CartItemSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
