import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
import { OrderDocket } from '../components/OrderDocket';
import { OrderProgress } from '../components/OrderProgress';
import { api, ApiError } from '../lib/api';
import { formatDateTime, formatMoney } from '../lib/format';
import {
  DUR,
  EASE,
  gsap,
  prefersReducedMotion,
  splitLines,
} from '../lib/motion';
import { watchOrder } from '../lib/socket';
import type { OrderStatus, TrackedOrder } from '../lib/types';

export function TrackPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!order) return;
    // Once the order is found, follow it live rather than making the customer
    // refresh to see the kitchen bump it.
    return watchOrder(order.id, (payload) => {
      if (payload.status) {
        setOrder((current) =>
          current
            ? { ...current, status: payload.status as OrderStatus }
            : current,
        );
      }
    });
  }, [order?.id]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const title = root.current?.querySelector('.track-title');
      let revert: (() => void) | undefined;

      const tl = gsap.timeline({ defaults: { ease: EASE.reveal } });

      if (title) {
        const split = splitLines(title);
        revert = split.revert;
        tl.from(split.lines, { yPercent: 115, duration: 0.85, stagger: 0.08 });
      }

      tl.from('.track-kicker', { opacity: 0, x: -16, duration: DUR.fast }, 0)
        .from('.track-lede', { opacity: 0, y: 16, duration: DUR.base }, 0.2)
        .from('.track-form', { opacity: 0, y: 22, duration: DUR.base }, 0.3);

      return () => revert?.();
    },
    { scope: root },
  );

  // The result is the payoff — bring it in rather than letting it appear.
  useGSAP(
    () => {
      if (!order || prefersReducedMotion()) return;
      gsap.from('.track-result > *', {
        opacity: 0,
        y: 26,
        duration: DUR.base,
        stagger: 0.1,
        ease: EASE.reveal,
      });
    },
    { scope: root, dependencies: [order?.id] },
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      setOrder(await api.trackOrder(orderNumber, phone));
    } catch (err) {
      setOrder(null);
      setError(
        err instanceof ApiError ? err.message : 'Could not find that order.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track" ref={root}>
      <header className="track-masthead">
        <span className="track-kicker label">Order tracking</span>
        <h1 className="track-title">Where is my food?</h1>
        <p className="track-lede">
          Enter the order number from your confirmation and the phone number you
          used. The page then updates itself as the kitchen moves your ticket.
        </p>

        <form className="track-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="order-number">Order number</label>
            <input
              id="order-number"
              placeholder="SBJ-0809-007"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="track-phone">Phone number</label>
            <input
              id="track-phone"
              inputMode="tel"
              placeholder="08031234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? 'Looking…' : 'Track order'}
          </button>
        </form>

        {error && (
          <div className="banner banner-error track-error">
            <LuTriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!order && !error && (
          <p className="track-hint">
            <LuSearch aria-hidden="true" />
            Both are needed — order numbers are short, so the phone number is
            what keeps someone else&apos;s order private.
          </p>
        )}
      </header>

      {order && (
        <div className="track-result">
          <section className="confirm-panel">
            <div className="track-result-head">
              <span className="label">Order</span>
              <h2>{order.orderNumber}</h2>
              <span className="track-placed">
                Placed {formatDateTime(order.placedAt)}
              </span>
            </div>

            <OrderProgress status={order.status} events={order.events} />
          </section>

          <section className="confirm-panel">
            <OrderDocket
              title="On this order"
              reference={order.orderNumber}
              lines={order.items.map((item, index) => ({
                key: `${item.nameSnapshot}-${index}`,
                name: item.nameSnapshot,
                quantity: item.quantity,
                modifiers: [item.status.toLowerCase()],
              }))}
              totals={[]}
              footer={
                <>
                  <div className="checkout-total">
                    <span className="label">Total</span>
                    <b>{formatMoney(order.total)}</b>
                  </div>
                  <Link to="/menu" className="btn btn-ghost btn-block">
                    Order again
                  </Link>
                </>
              }
            />
          </section>
        </div>
      )}
    </div>
  );
}
