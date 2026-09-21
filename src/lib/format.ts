const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

/// Money arrives from the API as a decimal string. Parse once, here, so no
/// component has to remember that `price` is not a number.
export const formatMoney = (value: string | number): string =>
  naira.format(typeof value === 'number' ? value : Number(value));

export const toNumber = (value: string | number): number =>
  typeof value === 'number' ? value : Number(value);

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const STATUS_COPY: Record<string, { label: string; blurb: string }> = {
  PENDING: {
    label: 'Order received',
    blurb: 'We have your order and are confirming it now.',
  },
  CONFIRMED: {
    label: 'Confirmed',
    blurb: 'The kitchen has your ticket and will start shortly.',
  },
  PREPARING: {
    label: 'In the kitchen',
    blurb: 'Your food is being cooked fresh.',
  },
  READY: {
    label: 'Ready',
    blurb: 'Hot and plated — on its way out to you.',
  },
  COMPLETED: { label: 'Completed', blurb: 'Enjoy your meal. Thank you.' },
  CANCELLED: {
    label: 'Cancelled',
    blurb: 'This order was cancelled. Call us if that looks wrong.',
  },
};
