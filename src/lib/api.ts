import type {
  Category,
  MenuItem,
  Order,
  OrderType,
  PaymentConfig,
  PaymentResult,
  PaymentSession,
  Promotion,
  ShowcaseEntry,
  TestimonialFeed,
  TrackedOrder,
} from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'Could not reach the kitchen. Check your connection and try again.',
      0,
    );
  }

  if (!response.ok) {
    // Nest returns `message` as a string or an array of validation failures.
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join('. ')
      : (body?.message ?? `Request failed (${response.status})`);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  type: OrderType;
  items: {
    menuItemId: string;
    quantity: number;
    modifierIds?: string[];
    notes?: string;
  }[];
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    landmark?: string;
  };
  tableNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

export const api = {
  getMenu: () => request<Category[]>('/menu'),

  getPromotions: () => request<Promotion[]>('/promotions'),

  getTestimonials: () => request<TestimonialFeed>('/testimonials'),

  getShowcase: () => request<ShowcaseEntry[]>('/showcase'),

  getFeatured: () => request<MenuItem[]>('/menu/items?featured=true&take=6'),

  searchItems: (term: string) =>
    request<MenuItem[]>(`/menu/items?search=${encodeURIComponent(term)}`),

  createOrder: (payload: CreateOrderPayload) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  trackOrder: (orderNumber: string, phone: string) =>
    request<TrackedOrder>('/orders/track', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, phone }),
    }),

  getOrder: (id: string) => request<Order>(`/orders/${id}/receipt`),

  getPaymentConfig: () => request<PaymentConfig>('/payments/config'),

  /// Opens a Paystack transaction for an order already placed. The amount is
  /// never sent — the server charges the total it worked out itself.
  startPayment: (orderId: string, email?: string) =>
    request<PaymentSession>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(email ? { orderId, email } : { orderId }),
    }),

  verifyPayment: (reference: string) =>
    request<PaymentResult>(`/payments/verify/${encodeURIComponent(reference)}`),
};

export { API_URL };
