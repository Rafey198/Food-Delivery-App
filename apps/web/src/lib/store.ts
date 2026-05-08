'use client';

import { create } from 'zustand';
import { api, AuthUser, getStoredUser, setAuth, clearAuth } from './api';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
}

interface CartState {
  id?: string;
  restaurantId?: string | null;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

interface AppState {
  user: AuthUser | null;
  cart: CartState;
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
  setUser(user: AuthUser | null): void;
  addToast(message: string, type?: 'success' | 'error' | 'info'): void;
  removeToast(id: string): void;
  loadCart(): Promise<void>;
  addToCart(menuItemId: string, quantity?: number, notes?: string): Promise<void>;
  updateCartItem(id: string, quantity: number): Promise<void>;
  removeCartItem(id: string): Promise<void>;
  clearCart(): Promise<void>;
  login(email: string, password: string): Promise<AuthUser>;
  register(name: string, email: string, password: string, role?: AuthUser['role']): Promise<AuthUser>;
  logout(): Promise<void>;
}

const emptyCart: CartState = { items: [], subtotal: 0, itemCount: 0 };

export const useApp = create<AppState>((set, get) => ({
  user: typeof window !== 'undefined' ? getStoredUser() : null,
  cart: emptyCart,
  toasts: [],

  setUser(user) {
    set({ user });
  },

  addToast(message, type = 'info') {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },
  removeToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  async loadCart() {
    const user = get().user;
    if (!user || user.role !== 'CUSTOMER') return;
    try {
      const cart = await api<CartState>('/cart');
      set({ cart });
    } catch {
      // ignore
    }
  },

  async addToCart(menuItemId, quantity = 1, notes) {
    const cart = await api<CartState>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ menuItemId, quantity, notes }),
    });
    set({ cart });
    get().addToast('Added to cart', 'success');
  },

  async updateCartItem(id, quantity) {
    const cart = await api<CartState>(`/cart/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    set({ cart });
  },

  async removeCartItem(id) {
    const cart = await api<CartState>(`/cart/items/${id}`, { method: 'DELETE' });
    set({ cart });
  },

  async clearCart() {
    const cart = await api<CartState>('/cart/clear', { method: 'POST' });
    set({ cart });
  },

  async login(email, password) {
    const data = await api<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      auth: false,
    });
    setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
    set({ user: data.user });
    if (data.user.role === 'CUSTOMER') await get().loadCart();
    return data.user;
  },

  async register(name, email, password, role) {
    const data = await api<{ user: AuthUser; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
      auth: false,
    });
    setAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
    set({ user: data.user });
    return data.user;
  },

  async logout() {
    clearAuth();
    set({ user: null, cart: emptyCart });
  },
}));
