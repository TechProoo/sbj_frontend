import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { useGSAP } from '@gsap/react';
import {
  LuCircleCheck,
  LuCreditCard,
  LuLoaderCircle,
  LuMapPin,
  LuReceipt,
} from 'react-icons/lu';
import {
  KeepDetailsModal,
  markShown,
  shouldShow,
} from '../components/KeepDetailsModal';
import { OrderDocket } from '../components/OrderDocket';
import { NotifyToggle } from '../components/NotifyToggle';
import { OrderProgress } from '../components/OrderProgress';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { rememberOrder } from '../lib/recentOrders';
import { DUR, EASE, gsap, prefersReducedMotion } from '../lib/motion';
import { watchOrder } from '../lib/socket';
import type { Order, OrderStatus, PaymentStatus } from '../lib/types';

const TYPE_COPY: Record<string, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  DINE_IN: 'Dine in',
};

export function OrderConfirmationPage() {
  // An order URL is somebody's receipt — never index it.
  useSeo({ title: 'Your order', noIndex: true });

  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // Checkout hands the order over in router state, so the confirmation renders
  // immediately without a second round trip.
  const state = location.state as
    | { order?: Order; justPlaced?: boolean }
    | null;
  const initial = state?.order ?? null;
  const justPlaced = state?.justPlaced === true;

  const [order, setOrder] = useState<Order | null>(initial);
  const [status, setStatus] = useState<OrderStatus>(
    initial?.status ?? 'PENDING',
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    initial?.paymentStatus ?? 'UNPAID',
  );
  const [paying, setPaying] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Coming back from Paystack is a fresh page load, so the router state the
  // checkout handed over is gone and the receipt has to be fetched.
  useEffect(() => {
    if (!id || order) return;
    let live = true;
    api
      .getOrder(id)
      .then((fetched) => {
        if (!live) return;
        setOrder(fetched);
        setStatus(fetched.status);
        setPaymentStatus(fetched.paymentStatus);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [id, order]);

  // Belt and braces: an order reached by link, or fetched fresh after the
  // Paystack round trip, is remembered here too. Re-recording is an update,
  // not a duplicate.
  // Once per order, straight after it is placed — paid online or not. A
  // refresh keeps the router state, so the "already shown" flag is what stops
  // it nagging.
  useEffect(() => {
    if (!justPlaced || !order || !shouldShow(order.id)) return;
    setKeepOpen(true);
    markShown(order.id);
  }, [justPlaced, order]);

  useEffect(() => {
    if (!order) return;
    rememberOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      phone: order.customerPhone,
      total: order.total,
      placedAt: order.placedAt,
    });
  }, [order]);

  useEffect(() => {
    if (!id) return;
    return watchOrder(id, (payload) => {
      if (payload.status) setStatus(payload.status as OrderStatus);
      // The webhook lands on the server, not here — this is how a transfer
      // that clears a minute later turns the receipt green by itself.
      if (payload.paymentStatus) {
        setPaymentStatus(payload.paymentStatus as PaymentStatus);
      }
    });
  }, [id]);

  const payNow = async () => {
    if (!order) return;
    setPayError(null);
    setPaying(true);
    try {
      const session = await api.startPayment(order.id);
      if (!session.authorizationUrl) {
        throw new ApiError('Paystack did not return a payment link.', 502);
      }
      window.location.assign(session.authorizationUrl);
    } catch (error) {
      setPayError(
        error instanceof ApiError
          ? error.message
          : 'Could not start the payment. Please try again.',
      );
      setPaying(false);
    }
  };

  useGSAP(
    () => {
      if (!order || prefersReducedMotion()) return;

      gsap
        .timeline({ defaults: { ease: EASE.reveal } })
        .from('.confirm-mark', {
          scale: 0.4,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(1.8)',
        })
        .from(
          '.confirm-head > *:not(.confirm-mark)',
          { opacity: 0, y: 20, duration: DUR.base, stagger: 0.08 },
          '-=0.3',
        )
        .from(
          '.confirm-panel',
          { opacity: 0, y: 28, duration: DUR.base, stagger: 0.1 },
          '-=0.35',
        );
    },
    { scope: root, dependencies: [Boolean(order)] },
  );

  if (!order) {
    return (
      <div className="checkout-empty">
        <LuReceipt aria-hidden="true" />
        <h1>Order placed</h1>
        <p>
          Your order is in. Use the tracking page with your order number and
          phone number to follow it.
        </p>
        <Link className="btn btn-primary" to="/track">
          Track my order
        </Link>
      </div>
    );
  }

  return (
    <div className="confirm" ref={root}>
      {keepOpen && (
        <KeepDetailsModal
          orderNumber={order.orderNumber}
          phone={order.customerPhone}
          paid={paymentStatus === 'PAID'}
          onClose={() => setKeepOpen(false)}
        />
      )}

      <header className="confirm-head">
        <span className="confirm-mark" aria-hidden="true">
          <LuCircleCheck />
        </span>

        <span className="confirm-kicker label">Order received</span>
        <h1 className="confirm-number">{order.orderNumber}</h1>
        <p className="confirm-lede">
          It is on the kitchen board now. We will call{' '}
          <strong>{order.customerPhone}</strong> if anything needs checking.
        </p>

        <div className="confirm-actions">
          <Link to="/track" className="btn btn-ghost">
            Track this order
          </Link>
          <Link to="/menu" className="btn btn-quiet">
            Order something else
          </Link>
        </div>
      </header>

      {order.type === 'DELIVERY' && order.address && (
        <section className="confirm-panel confirm-where">
          <LuMapPin aria-hidden="true" />
          <div>
            <span className="label">Delivering to</span>
            <p>
              {order.address.line1}
              {order.address.city ? `, ${order.address.city}` : ''}
            </p>
            {order.address.landmark && <small>{order.address.landmark}</small>}
            {order.address.latitude && (
              <small>Your rider has the map pin you shared.</small>
            )}
          </div>
        </section>
      )}

      <section className="confirm-panel confirm-payment">
        {paymentStatus === 'PAID' ? (
          <div className="banner banner-ok">
            <LuCircleCheck aria-hidden="true" />
            <span>
              <strong>Paid in full</strong>
              {formatMoney(order.total)} received. Nothing to pay on arrival.
            </span>
          </div>
        ) : paymentStatus === 'REFUNDED' ? (
          <div className="banner">
            <LuReceipt aria-hidden="true" />
            <span>
              <strong>Refunded</strong>
              {formatMoney(order.total)} has been sent back to you.
            </span>
          </div>
        ) : (
          <div className="confirm-pay">
            <div>
              <span className="label">To pay</span>
              <b>{formatMoney(order.total)}</b>
              <p>
                {order.type === 'DELIVERY'
                  ? 'Pay the rider on arrival, or settle it now and be done.'
                  : 'Pay at the counter, or settle it now and be done.'}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={payNow}
              disabled={paying || status === 'CANCELLED'}
            >
              {paying ? (
                <LuLoaderCircle className="spin" aria-hidden="true" />
              ) : (
                <LuCreditCard aria-hidden="true" />
              )}
              {paying ? 'Opening Paystack…' : 'Pay now'}
            </button>
          </div>
        )}

        {payError && (
          <div className="banner banner-error">
            <span>{payError}</span>
          </div>
        )}
      </section>

      <section className="confirm-panel confirm-progress">
        <OrderProgress status={status} />
        <div className="notify-slot">
          <NotifyToggle orderId={order.id} />
        </div>
      </section>

      <section className="confirm-panel confirm-docket">
        <OrderDocket
          title="Your copy"
          reference={order.orderNumber}
          meta={[
            { label: 'Type', value: TYPE_COPY[order.type] ?? order.type },
            ...(order.tableNumber
              ? [{ label: 'Table', value: order.tableNumber }]
              : []),
            { label: 'Name', value: order.customerName },
          ]}
          lines={order.items.map((item) => ({
            key: item.id,
            name: item.nameSnapshot,
            quantity: item.quantity,
            amount: item.lineTotal,
            modifiers: item.modifiers.map((modifier) => modifier.nameSnapshot),
            note: item.notes,
          }))}
          totals={[
            { label: 'Subtotal', amount: order.subtotal },
            ...(Number(order.deliveryFee) > 0
              ? [{ label: 'Delivery', amount: order.deliveryFee }]
              : []),
          ]}
          footer={
            <div className="checkout-total">
              <span className="label">
                {paymentStatus === 'PAID' ? 'Paid' : 'Total'}
              </span>
              <b>{formatMoney(order.total)}</b>
            </div>
          }
        />
      </section>
    </div>
  );
}
