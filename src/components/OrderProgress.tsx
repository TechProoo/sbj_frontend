import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { LuCheck, LuX } from 'react-icons/lu';
import { STATUS_COPY, formatTime } from '../lib/format';
import { EASE, gsap, prefersReducedMotion } from '../lib/motion';
import type { OrderStatus } from '../lib/types';

const FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
];

/// The rail a customer watches while their food is cooked. Horizontal on a
/// desktop, vertical on a phone, with a fill that animates whenever the
/// kitchen bumps the ticket — the status arrives over a websocket, so this
/// moves on its own while the page is open.
export function OrderProgress({
  status,
  events = [],
}: {
  status: OrderStatus;
  events?: { toStatus: OrderStatus; createdAt: string }[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const currentIndex = FLOW.indexOf(status);

  useGSAP(
    () => {
      if (status === 'CANCELLED') return;

      const pct = currentIndex <= 0 ? 0 : (currentIndex / (FLOW.length - 1)) * 100;

      gsap.to('.progress-fill', {
        '--fill': `${pct}%`,
        duration: prefersReducedMotion() ? 0 : 0.9,
        ease: EASE.reveal,
      });

      if (prefersReducedMotion()) return;

      // The step in progress breathes, so a page left open still reads as
      // live rather than stalled.
      gsap.fromTo(
        '.progress-node.is-current',
        { scale: 0.86 },
        { scale: 1, duration: 0.5, ease: 'back.out(2)' },
      );
    },
    { scope: root, dependencies: [status] },
  );

  if (status === 'CANCELLED') {
    return (
      <div className="progress-cancelled">
        <span className="progress-cancelled-mark" aria-hidden="true">
          <LuX />
        </span>
        <div>
          <strong>{STATUS_COPY.CANCELLED.label}</strong>
          <p>{STATUS_COPY.CANCELLED.blurb}</p>
        </div>
      </div>
    );
  }

  const timeFor = (step: OrderStatus) =>
    events.find((event) => event.toStatus === step)?.createdAt;

  return (
    <div className="progress" ref={root}>
      <div className="progress-rail" aria-hidden="true">
        <span className="progress-fill" />
      </div>

      <ol className="progress-steps">
        {FLOW.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const at = timeFor(step);

          return (
            <li
              key={step}
              className={`progress-step${done ? ' is-done' : ''}${
                current ? ' is-current' : ''
              }`}
              aria-current={current ? 'step' : undefined}
            >
              <span
                className={`progress-node${done ? ' is-done' : ''}${
                  current ? ' is-current' : ''
                }`}
              >
                {done ? <LuCheck aria-hidden="true" /> : index + 1}
              </span>

              <span className="progress-label">
                {STATUS_COPY[step].label}
              </span>

              {at && <time className="progress-time">{formatTime(at)}</time>}
            </li>
          );
        })}
      </ol>

      <p className="progress-blurb">{STATUS_COPY[status].blurb}</p>
    </div>
  );
}
