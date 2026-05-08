export type Role = 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CartItemPayload {
  menuItemId: string;
  quantity: number;
  notes?: string;
  selectedVariants?: Array<{ variantId: string; name: string; priceDelta: number }>;
  selectedAddOns?: Array<{ addOnId: string; name: string; price: number }>;
}

export interface PriceBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
}

export interface AIRecommendation<T = unknown> {
  itemId: string;
  type: 'restaurant' | 'dish';
  score: number;
  reasons: string[];
  data: T;
}
