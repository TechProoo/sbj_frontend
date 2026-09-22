import { useSyncExternalStore } from 'react';

/*
 * Orders placed on this device.
 *
 * Guest checkout has no account, so the order number on the confirmation
 * screen was the customer's only copy — and paying leaves the site entirely
 * for Paystack, which wipes everything the page was holding. Anyone who closed
 * that tab, or came back on a different one, had no way to name their own
 * order again.
 *
 * So the order number is written down the moment the order exists, before any
 * redirect can lose it. Same idiom as the saved-dish store: outside React, one
 * snapshot replaced wholesale, and two tabs kept in step.
 *
 * The phone number is kept alongside it because tracking needs both, and it is
 * the customer's own number on the customer's own device — the same thing the
 * checkout form already remembers for them.
 */

const STORAGE_KEY = 'sbj.orders.v1';
const LIMIT = 20;
const EMPTY: readonly RecentOrder[] = [];

export interface RecentOrder {
  id: string;
  orderNumber: string;
  phone: string;
  total: string;
  placedAt: string;
}

const listeners = new Set<() => void>();

function read(): RecentOrder[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    // Anything hand-edited into storage is dropped rather than crashing the
    // orders screen on load.
    return parsed.filter(isRecentOrder).slice(0, LIMIT);
  } catch {
    return [];
  }
}

function isRecentOrder(value: unknown): value is RecentOrder {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.orderNumber === 'string' &&
    typeof entry.phone === 'string' &&
    typeof entry.total === 'string' &&
    typeof entry.placedAt === 'string'
  );
}

let orders: readonly RecentOrder[] = read();

function emit(): void {
  listeners.forEach((notify) => notify());
}

function write(next: readonly RecentOrder[]): void {
  orders = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked in a private window still leaves this tab working.
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    orders = read();
    emit();
  });
}

/// Newest first. Re-recording an order it already holds updates that entry in
/// place rather than listing the same order twice — the confirmation page
/// records what checkout already did, and both are correct.
export function rememberOrder(order: RecentOrder): void {
  write([order, ...orders.filter((entry) => entry.id !== order.id)].slice(0, LIMIT));
}

export function forgetOrder(id: string): void {
  write(orders.filter((entry) => entry.id !== id));
}

export function clearOrders(): void {
  write(EMPTY);
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function useRecentOrders(): readonly RecentOrder[] {
  return useSyncExternalStore(
    subscribe,
    () => orders,
    () => EMPTY,
  );
}
