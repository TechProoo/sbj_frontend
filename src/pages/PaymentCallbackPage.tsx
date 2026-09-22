import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LuCircleCheck, LuCircleX, LuLoaderCircle } from 'react-icons/lu';
import { api, ApiError } from '../lib/api';
import { useSeo } from '../lib/seo';
import { formatMoney } from '../lib/format';
import type { PaymentResult } from '../lib/types';

type Phase = 'checking' | 'paid' | 'unpaid' | 'error';

/// Where Paystack sends the customer back to. It appends the reference to the
/// callback URL itself, as both `reference` and `trxref`.
///
/// This page does not decide anything — it asks the API to verify with
/// Paystack and reports what came back. The webhook may well have settled the
/// same payment a second earlier; both paths write the same row, so whichever
/// arrives second is a no-op.
export function PaymentCallbackPage() {
  // A payment reference in the URL is private to one customer.
  useSeo({ title: 'Payment', noIndex: true });

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get('reference') ?? params.get('trxref');

  const [phase, setPhase] = useState<Phase>('checking');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // StrictMode mounts this twice in development. Asking only once is right —
  // but the answer must NOT also be gated on the mount that asked, or the
  // second mount waits forever on a reply the first one threw away. The
  // request is deduplicated; the result is always applied.
  const asked = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!reference) {
      setPhase('error');
      setMessage('That link is missing its payment reference.');
      return;
    }
    if (asked.current) return;
    asked.current = true;

    api
      .verifyPayment(reference)
      .then((payment) => {
        setResult(payment);
        setPhase(payment.paid ? 'paid' : 'unpaid');

        if (payment.paid) {
          // Let the tick land, then hand over to the real receipt.
          timer.current = window.setTimeout(() => {
            // `justPlaced` is what tells the receipt to remind them to keep
            // their order number — this is the one moment it matters.
            navigate(`/order/${payment.orderId}`, {
              replace: true,
              state: { justPlaced: true },
            });
          }, 1600);
        }
      })
      .catch((error: unknown) => {
        setPhase('error');
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'We could not reach the payment service.',
        );
      });
  }, [reference, navigate]);

  // Only the pending redirect needs undoing; the verify result does not.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (phase === 'checking') {
    return (
      <div className="checkout-empty">
        <LuLoaderCircle className="spin" aria-hidden="true" />
        <h1>Confirming your payment</h1>
        <p>One moment — we are checking with Paystack.</p>
      </div>
    );
  }

  if (phase === 'paid' && result) {
    return (
      <div className="checkout-empty">
        <LuCircleCheck aria-hidden="true" />
        <h1>Payment received</h1>
        <p>
          {formatMoney(result.amount / 100)} for order{' '}
          <strong>{result.orderNumber}</strong>. Taking you to your receipt…
        </p>
        <Link
          className="btn btn-primary"
          to={`/order/${result.orderId}`}
          state={{ justPlaced: true }}
        >
          View my order
        </Link>
      </div>
    );
  }

  // Not paid, or we could not tell. Either way the order itself is safe on the
  // kitchen board as unpaid, so the way out is back to it rather than a
  // re-checkout that would duplicate the ticket.
  return (
    <div className="checkout-empty">
      <LuCircleX aria-hidden="true" />
      <h1>{phase === 'error' ? 'We could not confirm that' : 'Payment not completed'}</h1>
      <p>
        {message ??
          result?.gatewayResponse ??
          'Nothing was charged. You can try paying again from your order.'}
      </p>
      {result?.orderId ? (
        <Link className="btn btn-primary" to={`/order/${result.orderId}`}>
          Back to my order
        </Link>
      ) : (
        <Link className="btn btn-primary" to="/track">
          Find my order
        </Link>
      )}
    </div>
  );
}
