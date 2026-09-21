export type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'ONLINE';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';

/// What the API is prepared to collect right now. `enabled` is false when the
/// server has no Paystack keys, and the storefront then offers cash only.
export interface PaymentConfig {
  enabled: boolean;
  publicKey: string;
  testMode: boolean;
  channels: string[];
}

export interface PaymentSession {
  reference: string;
  authorizationUrl: string | null;
  accessCode: string | null;
  /// Kobo.
  amount: number;
  email: string;
  testMode: boolean;
}

export interface PaymentResult {
  reference: string;
  status: PaymentStatus;
  paid: boolean;
  channel: string | null;
  amount: number;
  orderId: string;
  orderNumber: string;
  gatewayResponse: string | null;
}

export interface Modifier {
  id: string;
  name: string;
  priceDelta: string;
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /// Prisma serialises Decimal as a string — parse before arithmetic.
  price: string;
  imageUrl: string | null;
  prepMinutes: number;
  spiceLevel: number;
  tags: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  modifierGroups: ModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  items: MenuItem[];
}

export interface OrderItem {
  id: string;
  nameSnapshot: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  notes: string | null;
  status: string;
  modifiers: { nameSnapshot: string; priceDelta: string }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  customerName: string;
  customerPhone: string;
  subtotal: string;
  deliveryFee: string;
  serviceFee: string;
  total: string;
  notes: string | null;
  tableNumber: string | null;
  placedAt: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  customerEmail: string | null;
  items: OrderItem[];
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  type: OrderType;
  total: string;
  placedAt: string;
  items: { nameSnapshot: string; quantity: number; status: string }[];
  events: { toStatus: OrderStatus; createdAt: string }[];
}

export interface Promotion {
  id: string;
  kicker: string;
  headline: string;
  terms: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  position: number;
  startsAt: string | null;
  endsAt: string | null;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
  rating: number;
  avatarUrl: string | null;
}

export interface TestimonialFeed {
  items: Testimonial[];
  /// Null when nothing is published, so the summary can be hidden rather than
  /// printing a zero.
  average: number | null;
  count: number;
}

export interface ShowcaseEntry {
  id: string;
  title: string;
  place: string | null;
  blurb: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  happenedAt: string | null;
}
