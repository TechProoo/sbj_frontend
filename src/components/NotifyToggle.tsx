import { useEffect, useState } from 'react';
import { LuBell, LuBellRing, LuBellOff, LuInfo } from 'react-icons/lu';
import {
  isInstalled,
  isIos,
  pushPermission,
  pushSupported,
  subscribeToOrder,
  type PushState,
} from '../lib/pwa';

/*
 * "Tell me when it is ready" for one order.
 *
 * Offered on the confirmation and tracking pages, where there is an order to
 * attach it to. Checkout is guest-only, so the order id is the whole identity:
 * no account, nothing to log into.
 */
export function NotifyToggle({ orderId }: { orderId: string }) {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(pushPermission());
  }, []);

  if (!pushSupported()) return null;

  // Safari only allows push from an installed app, so asking first would just
  // fail. Tell them what to do instead.
  if (isIos() && !isInstalled()) {
    return (
      <p className="notify-note">
        <LuInfo aria-hidden="true" />
        Add SBJ to your home screen first, then we can send you updates on this
        order.
      </p>
    );
  }

  if (state === 'granted') {
    return (
      <p className="notify-note is-on">
        <LuBellRing aria-hidden="true" />
        We will buzz your phone when this order moves.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <p className="notify-note">
        <LuBellOff aria-hidden="true" />
        Notifications are blocked for this site. Turn them back on in your
        browser settings to get order updates.
      </p>
    );
  }

  if (state === 'unconfigured' || state === 'unsupported') return null;

  return (
    <button
      type="button"
      className="btn btn-ghost notify-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          setState(await subscribeToOrder(orderId));
        } finally {
          setBusy(false);
        }
      }}
    >
      <LuBell aria-hidden="true" />
      {busy ? 'Just a moment…' : 'Notify me when it is ready'}
    </button>
  );
}
