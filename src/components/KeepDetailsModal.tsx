import { useEffect, useRef, useState } from 'react';
import { LuCheck, LuCircleCheck, LuCopy, LuReceipt, LuX } from 'react-icons/lu';

/*
 * Shown once, straight after an order is placed — paid online or not.
 *
 * The order number and the phone number are the two things that get a customer
 * back to their order, and placing it is the moment they are least likely to
 * be paying attention to either: they think the job is done. After paying they
 * have also just come back from another site, which wipes everything the page
 * was holding.
 *
 * The device remembers both for them (see `lib/recentOrders`), but that list
 * is one cleared browser away from gone, and a customer who ordered on a
 * friend's phone has nothing. So it is worth one interruption, at the one
 * moment it is clearly relevant, and never again for that order.
 */

const SEEN_KEY = 'sbj.kept.v1';

/// Which orders have already had their say. Kept separately from the order
/// list so clearing that list does not start the nagging again.
function alreadyShown(orderId: string): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.includes(orderId);
  } catch {
    return false;
  }
}

export function markShown(orderId: string): void {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    if (list.includes(orderId)) return;
    // Only the last few matter; this is a "have we nagged yet" flag, not history.
    localStorage.setItem(SEEN_KEY, JSON.stringify([orderId, ...list].slice(0, 30)));
  } catch {
    // Storage blocked: the modal shows once per session instead of once ever,
    // which is the right way to fail.
  }
}

export function shouldShow(orderId: string): boolean {
  return !alreadyShown(orderId);
}

export function KeepDetailsModal({
  orderNumber,
  phone,
  paid,
  onClose,
}: {
  orderNumber: string;
  phone: string;
  /// Only the headline changes: telling someone their payment was received
  /// when they are paying the rider on arrival would be a lie.
  paid: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const confirm = useRef<HTMLButtonElement>(null);
  // Focus goes back where it came from, so a keyboard user is not dumped at
  // the top of the page.
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    confirm.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo.current?.focus?.();
    };
  }, [onClose]);

  const copy = async () => {
    const text = `SBJ order ${orderNumber} · ${phone}`;
    try {
      // Needs a secure context. localhost counts; plain http does not.
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Nothing is lost — both values are on screen to write down.
      setCopyFailed(true);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keep-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal keep-modal">
        <div className="modal-head">
          <div>
            <span className="keep-kicker label">
              {paid ? (
                <LuCircleCheck aria-hidden="true" />
              ) : (
                <LuReceipt aria-hidden="true" />
              )}
              {paid ? 'Payment received' : 'Order received'}
            </span>
            <h2 id="keep-title">Keep these two</h2>
            <p>
              Your order number and the phone number you used are what bring you
              back to this order. Write them down or take a screenshot.
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <LuX size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body keep-body">
          <dl className="keep-pair">
            <div>
              <dt>Order number</dt>
              <dd className="keep-strong">{orderNumber}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd className="keep-strong">{phone}</dd>
            </div>
          </dl>

          <button type="button" className="btn btn-ghost keep-copy" onClick={() => void copy()}>
            {copied ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy both'}
          </button>

          {copyFailed && (
            <p className="keep-note">
              Copying is not available here — write them down instead.
            </p>
          )}

          <p className="keep-note">
            We have saved them on this device too, under <strong>Orders</strong>.
            Clear your browser or switch phone, though, and the two above are
            what you will need.
          </p>
        </div>

        <div className="modal-foot keep-foot">
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onClose}
            ref={confirm}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
