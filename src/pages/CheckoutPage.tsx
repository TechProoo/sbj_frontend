import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import {
  LuBanknote,
  LuBike,
  LuCreditCard,
  LuShoppingBag,
  LuTriangleAlert,
  LuUtensils,
} from 'react-icons/lu';
import { OrderDocket } from '../components/OrderDocket';
import { useCart } from '../context/CartContext';
import { api, ApiError, type CreateOrderPayload } from '../lib/api';
import { formatMoney } from '../lib/format';
import { DUR, EASE, gsap, prefersReducedMotion, splitLines } from '../lib/motion';
import type { OrderType, PaymentConfig } from '../lib/types';

const PHONE_PATTERN = /^(\+?234|0)[789][01]\d{8}$/;

/// Must match DELIVERY_FEE in the API env. The server recalculates the real
/// total, so this is a preview only.
const DELIVERY_FEE = 1500;

const ORDER_TYPES = [
  {
    value: 'DELIVERY' as const,
    label: 'Delivery',
    hint: 'To your address',
    Icon: LuBike,
  },
  {
    value: 'PICKUP' as const,
    label: 'Pickup',
    hint: 'Collect in store',
    Icon: LuShoppingBag,
  },
  {
    value: 'DINE_IN' as const,
    label: 'Dine in',
    hint: 'Eat with us',
    Icon: LuUtensils,
  },
];

/// CASH covers both "pay the rider" and "pay at the counter"; which one it is
/// follows from the order type, so it is not a third choice to make.
const PAY_OPTIONS = [
  {
    value: 'ONLINE' as const,
    label: 'Pay now',
    hint: 'Card, transfer, USSD',
    Icon: LuCreditCard,
  },
  {
    value: 'CASH' as const,
    label: 'Pay on delivery',
    hint: 'Cash or transfer to the rider',
    Icon: LuBanknote,
  },
];

type PayChoice = (typeof PAY_OPTIONS)[number]['value'];

interface FormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  type: OrderType;
  line1: string;
  city: string;
  landmark: string;
  tableNumber: string;
  notes: string;
  payment: PayChoice;
}

const INITIAL: FormState = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  type: 'DELIVERY',
  line1: '',
  city: '',
  landmark: '',
  tableNumber: '',
  notes: '',
  payment: 'ONLINE',
};

export function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentConfig | null>(null);

  const root = useRef<HTMLDivElement>(null);

  // Asked rather than assumed: a server with no Paystack keys must not be
  // offered as one that takes cards.
  useEffect(() => {
    let live = true;
    api
      .getPaymentConfig()
      .then((config) => {
        if (!live) return;
        setPayments(config);
        if (!config.enabled) {
          setForm((current) => ({ ...current, payment: 'CASH' }));
        }
      })
      .catch(() => {
        // Unreachable config means cash only, not a broken checkout.
        if (!live) return;
        setPayments({
          enabled: false,
          publicKey: '',
          testMode: false,
          channels: [],
        });
      });
    return () => {
      live = false;
    };
  }, []);

  const payOnline = form.payment === 'ONLINE' && payments?.enabled === true;

  // Delivery and dine-in insert a third step, so the two after it shift down.
  const hasLocationStep = form.type === 'DELIVERY' || form.type === 'DINE_IN';
  const payStepIndex = hasLocationStep ? '04' : '03';
  const notesStepIndex = hasLocationStep ? '05' : '04';

  const deliveryFee = form.type === 'DELIVERY' ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  /* ------------------------------------------------------------ motion */

  useGSAP(
    () => {
      if (prefersReducedMotion() || lines.length === 0) return;
      const title = root.current?.querySelector('.checkout-title');
      let revert: (() => void) | undefined;

      const tl = gsap.timeline({ defaults: { ease: EASE.reveal } });

      if (title) {
        const split = splitLines(title);
        revert = split.revert;
        tl.from(split.lines, { yPercent: 115, duration: 0.85, stagger: 0.08 });
      }

      tl.from('.checkout-kicker', { opacity: 0, x: -16, duration: DUR.fast }, 0)
        .from(
          '.checkout-step',
          { opacity: 0, y: 26, duration: DUR.base, stagger: 0.09 },
          0.25,
        )
        .from('.checkout-aside', { opacity: 0, y: 26, duration: DUR.base }, 0.35);

      return () => revert?.();
    },
    { scope: root, dependencies: [lines.length === 0] },
  );

  // The address block only exists for delivery. Animating its height keeps
  // the summary from jumping when someone switches type.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const panel = root.current?.querySelector('.checkout-conditional');
      if (!panel) return;

      gsap.from(panel, {
        height: 0,
        opacity: 0,
        duration: 0.45,
        ease: EASE.reveal,
        clearProps: 'height,opacity',
      });
    },
    { scope: root, dependencies: [form.type] },
  );

  // The total changes when the order type does; count to the new figure so
  // the change is noticed rather than silently swapped.
  useGSAP(
    () => {
      const el = root.current?.querySelector('.checkout-total-value');
      if (!el) return;

      if (prefersReducedMotion()) {
        el.textContent = formatMoney(total);
        return;
      }

      const counter = { value: Number(el.getAttribute('data-value') ?? 0) };
      gsap.to(counter, {
        value: total,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = formatMoney(Math.round(counter.value));
        },
        onComplete: () => el.setAttribute('data-value', String(total)),
      });
    },
    { scope: root, dependencies: [total] },
  );

  /* ---------------------------------------------------------- validation */

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (form.customerName.trim().length < 2) {
      next.customerName = 'Tell us who the order is for';
    }
    if (!PHONE_PATTERN.test(form.customerPhone.replace(/\s/g, ''))) {
      next.customerPhone = 'Enter a valid Nigerian number, e.g. 08031234567';
    }
    if (
      form.customerEmail &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customerEmail)
    ) {
      next.customerEmail = 'That email does not look right';
    }
    // Paystack sends the receipt by email, so paying online makes the
    // otherwise-optional field required.
    if (payOnline && !form.customerEmail.trim()) {
      next.customerEmail = 'We need an email to send your payment receipt to';
    }
    if (form.type === 'DELIVERY') {
      if (form.line1.trim().length < 3) next.line1 = 'We need a street address';
      if (form.city.trim().length < 2) next.city = 'Which city or area?';
    }
    if (form.type === 'DINE_IN' && !form.tableNumber.trim()) {
      next.tableNumber = 'Which table are you on?';
    }

    setErrors(next);

    // Take the person to the first problem rather than leaving them to hunt.
    const firstKey = Object.keys(next)[0];
    if (firstKey) {
      const field = root.current?.querySelector<HTMLElement>(`#${firstKey}`);
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
      if (!prefersReducedMotion() && field?.parentElement) {
        gsap.fromTo(
          field.parentElement,
          { x: -6 },
          { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.4)' },
        );
      }
    }

    return Object.keys(next).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    const payload: CreateOrderPayload = {
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.replace(/\s/g, ''),
      type: form.type,
      items: lines.map((line) => ({
        menuItemId: line.menuItemId,
        quantity: line.quantity,
        modifierIds: line.modifiers.map((modifier) => modifier.id),
        notes: line.notes,
      })),
    };

    // Only send optional fields that are actually filled — the API rejects
    // unknown or empty-string values rather than silently accepting them.
    if (form.customerEmail.trim()) {
      payload.customerEmail = form.customerEmail.trim();
    }
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.type === 'DELIVERY') {
      payload.address = {
        line1: form.line1.trim(),
        city: form.city.trim(),
        ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
      };
    }
    if (form.type === 'DINE_IN') payload.tableNumber = form.tableNumber.trim();

    payload.paymentMethod = payOnline ? 'ONLINE' : 'CASH';

    setSubmitting(true);
    try {
      const order = await api.createOrder(payload);

      if (!payOnline) {
        clear();
        navigate(`/order/${order.id}`, { state: { order } });
        return;
      }

      // The order exists and is on the board before a naira moves. If the
      // payment never completes the kitchen still has the ticket, marked
      // unpaid, rather than the order vanishing with the failed card.
      const session = await api.startPayment(order.id, payload.customerEmail);
      if (!session.authorizationUrl) {
        throw new ApiError('Paystack did not return a payment link.', 502);
      }

      clear();
      // Full navigation away to Paystack; we come back at /payment/callback.
      window.location.assign(session.authorizationUrl);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong placing your order.',
      );
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------ render */

  if (lines.length === 0) {
    return (
      <div className="checkout-empty">
        <LuShoppingBag aria-hidden="true" />
        <h1>Your cart is empty</h1>
        <p>Nothing to check out yet. Pick a plate and come back.</p>
        <Link className="btn btn-primary" to="/menu">
          Open the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout" ref={root}>
      <header className="checkout-masthead">
        <span className="checkout-kicker label">Checkout</span>
        <h1 className="checkout-title">Nearly eating.</h1>
        <p className="checkout-lede">
          We will call you on this number if the kitchen needs to check
          anything.
        </p>
      </header>

      <form className="checkout-grid" onSubmit={submit} noValidate>
        <div className="checkout-steps">
          <section className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-index label">01</span>
              <h2>How would you like it?</h2>
            </div>

            <div className="type-picker">
              {ORDER_TYPES.map(({ value, label, hint, Icon }) => (
                <label
                  key={value}
                  className={`type-option${form.type === value ? ' is-current' : ''}`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={form.type === value}
                    onChange={() => set('type', value)}
                  />
                  <Icon aria-hidden="true" />
                  <span className="type-label">{label}</span>
                  <span className="type-hint">{hint}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-index label">02</span>
              <h2>Your details</h2>
            </div>

            <div className="card-stack">
              <div className="field">
                <label htmlFor="customerName">Full name</label>
                <input
                  id="customerName"
                  value={form.customerName}
                  onChange={(event) => set('customerName', event.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.customerName)}
                />
                {errors.customerName && (
                  <span className="error">{errors.customerName}</span>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="customerPhone">Phone number</label>
                  <input
                    id="customerPhone"
                    inputMode="tel"
                    placeholder="08031234567"
                    value={form.customerPhone}
                    onChange={(event) =>
                      set('customerPhone', event.target.value)
                    }
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.customerPhone)}
                  />
                  {errors.customerPhone && (
                    <span className="error">{errors.customerPhone}</span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="customerEmail">
                    {payOnline ? 'Email (for your receipt)' : 'Email (optional)'}
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    value={form.customerEmail}
                    onChange={(event) =>
                      set('customerEmail', event.target.value)
                    }
                    autoComplete="email"
                    aria-invalid={Boolean(errors.customerEmail)}
                  />
                  {errors.customerEmail && (
                    <span className="error">{errors.customerEmail}</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {(form.type === 'DELIVERY' || form.type === 'DINE_IN') && (
            <section className="checkout-step checkout-conditional">
              <div className="checkout-step-head">
                <span className="checkout-step-index label">03</span>
                <h2>
                  {form.type === 'DELIVERY' ? 'Where to' : 'Your table'}
                </h2>
              </div>

              {form.type === 'DELIVERY' ? (
                <div className="card-stack">
                  <div className="field">
                    <label htmlFor="line1">Street address</label>
                    <input
                      id="line1"
                      value={form.line1}
                      onChange={(event) => set('line1', event.target.value)}
                      autoComplete="address-line1"
                      aria-invalid={Boolean(errors.line1)}
                    />
                    {errors.line1 && (
                      <span className="error">{errors.line1}</span>
                    )}
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="city">City / area</label>
                      <input
                        id="city"
                        value={form.city}
                        onChange={(event) => set('city', event.target.value)}
                        autoComplete="address-level2"
                        aria-invalid={Boolean(errors.city)}
                      />
                      {errors.city && (
                        <span className="error">{errors.city}</span>
                      )}
                    </div>

                    <div className="field">
                      <label htmlFor="landmark">Landmark (optional)</label>
                      <input
                        id="landmark"
                        placeholder="Opposite the filling station"
                        value={form.landmark}
                        onChange={(event) =>
                          set('landmark', event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="tableNumber">Table number</label>
                  <input
                    id="tableNumber"
                    value={form.tableNumber}
                    onChange={(event) => set('tableNumber', event.target.value)}
                    aria-invalid={Boolean(errors.tableNumber)}
                  />
                  {errors.tableNumber && (
                    <span className="error">{errors.tableNumber}</span>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-index label">{payStepIndex}</span>
              <h2>How would you like to pay?</h2>
            </div>

            {payments === null ? (
              <p className="checkout-fineprint">Checking payment options…</p>
            ) : payments.enabled ? (
              <>
                <div className="type-picker">
                  {PAY_OPTIONS.map(({ value, label, hint, Icon }) => (
                    <label
                      key={value}
                      className={`type-option${form.payment === value ? ' is-current' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={form.payment === value}
                        onChange={() => set('payment', value)}
                      />
                      <Icon aria-hidden="true" />
                      <span className="type-label">{label}</span>
                      <span className="type-hint">
                        {value === 'CASH' && form.type !== 'DELIVERY'
                          ? 'Cash or transfer at the counter'
                          : hint}
                      </span>
                    </label>
                  ))}
                </div>

                {payOnline && (
                  <p className="checkout-fineprint">
                    We take you to Paystack to pay by card, bank transfer, USSD
                    or QR, then bring you straight back.
                    {payments.testMode ? ' Test mode — no real money moves.' : ''}
                  </p>
                )}
              </>
            ) : (
              <p className="checkout-fineprint">
                Online payment is not switched on yet. Pay cash or transfer when
                your order arrives.
              </p>
            )}
          </section>

          <section className="checkout-step">
            <div className="checkout-step-head">
              <span className="checkout-step-index label">{notesStepIndex}</span>
              <h2>Anything else?</h2>
            </div>

            <div className="field">
              <label className="visually-hidden" htmlFor="notes">
                Notes for the kitchen
              </label>
              <textarea
                id="notes"
                rows={3}
                maxLength={500}
                placeholder="Call when you arrive, no cutlery needed…"
                value={form.notes}
                onChange={(event) => set('notes', event.target.value)}
              />
            </div>
          </section>
        </div>

        <aside className="checkout-aside">
          <OrderDocket
            title="Your order"
            meta={[
              {
                label: 'Type',
                value:
                  ORDER_TYPES.find((entry) => entry.value === form.type)
                    ?.label ?? form.type,
              },
              { label: 'Items', value: lines.length },
            ]}
            lines={lines.map((line) => ({
              key: line.key,
              name: line.name,
              quantity: line.quantity,
              amount: line.unitPrice * line.quantity,
              modifiers: line.modifiers.map((modifier) => modifier.name),
              note: line.notes,
            }))}
            totals={[
              { label: 'Subtotal', amount: subtotal },
              { label: 'Delivery', amount: deliveryFee },
            ]}
            footer={
              <>
                <div className="checkout-total">
                  <span className="label">Total</span>
                  <b
                    className="checkout-total-value"
                    data-value={total}
                  >
                    {formatMoney(total)}
                  </b>
                </div>

                {submitError && (
                  <div className="banner banner-error">
                    <LuTriangleAlert aria-hidden="true" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={submitting}
                >
                  {submitting
                    ? payOnline
                      ? 'Opening Paystack…'
                      : 'Sending to the kitchen…'
                    : payOnline
                      ? `Pay ${formatMoney(total)}`
                      : 'Place order'}
                </button>

                <p className="checkout-fineprint">
                  {payOnline
                    ? 'Secured by Paystack. Your card details never touch our servers.'
                    : 'Pay on delivery or at the counter.'}
                </p>
              </>
            }
          />
        </aside>
      </form>
    </div>
  );
}
