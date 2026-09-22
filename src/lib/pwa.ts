import { API_URL } from './api';

/*
 * Home-screen install and web push.
 *
 * Both need HTTPS (localhost excepted), and on iOS push only works once the
 * app has actually been added to the home screen — so the install prompt is
 * not decoration there, it is the prerequisite.
 */

export interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPrompt | null = null;
const listeners = new Set<(available: boolean) => void>();

export function onInstallAvailable(
  listener: (available: boolean) => void,
): () => void {
  listeners.add(listener);
  listener(deferredPrompt !== null);
  return () => {
    listeners.delete(listener);
  };
}

/// Already running from the home screen?
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS reports it here instead.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac, but with a touch screen.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No service worker means no install and no push; the site still works.
    });
  });

  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome shows its own mini-infobar otherwise; we want our own moment.
    event.preventDefault();
    deferredPrompt = event as InstallPrompt;
    listeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
  });
}

/// Returns true if the person accepted. A prompt can only be used once.
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  listeners.forEach((listener) => listener(false));

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome === 'accepted';
}

/* ------------------------------------------------------------------ push */

export type PushState =
  | 'unsupported'
  | 'unconfigured'
  | 'default'
  | 'granted'
  | 'denied';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function pushPermission(): PushState {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushState;
}

/// The VAPID key arrives base64url; the browser wants raw bytes.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function serverKey(): Promise<string | null> {
  // Asked rather than baked in, so a server without VAPID keys reports itself
  // as off instead of handing out a key that cannot sign anything.
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;

  try {
    const res = await fetch(`${API_URL}/push/key`);
    if (!res.ok) return null;
    const body = (await res.json()) as { enabled: boolean; publicKey: string };
    return body.enabled ? body.publicKey : null;
  } catch {
    return null;
  }
}

/// Asks permission (if needed), subscribes this device, and tells the API
/// which order it wants to hear about.
export async function subscribeToOrder(orderId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';

  const key = await serverKey();
  if (!key) return 'unconfigured';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission as PushState;

  const registration = await navigator.serviceWorker.ready;

  // Reuse the existing subscription where there is one — asking the push
  // service for a second one with a different key throws.
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    }));

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return 'unsupported';
  }

  await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      orderId,
    }),
  });

  return 'granted';
}
