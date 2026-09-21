import { LuCheck, LuX } from 'react-icons/lu';
import { STATUS_COPY, formatTime } from '../lib/format';
import type { OrderStatus } from '../lib/types';

const FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
];

export function StatusTimeline({
  status,
  events = [],
}: {
  status: OrderStatus;
  events?: { toStatus: OrderStatus; createdAt: string }[];
}) {
  if (status === 'CANCELLED') {
    return (
      <div className="banner banner-error">
        <LuX aria-hidden="true" />
        <div>
          <strong>{STATUS_COPY.CANCELLED.label}</strong>
          <p>{STATUS_COPY.CANCELLED.blurb}</p>
        </div>
      </div>
    );
  }

  const currentIndex = FLOW.indexOf(status);
  const timeFor = (step: OrderStatus) =>
    events.find((event) => event.toStatus === step)?.createdAt;

  return (
    <div className="timeline">
      {FLOW.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const at = timeFor(step);

        return (
          <div
            key={step}
            className={`timeline-step${done ? ' done' : ''}${
              current ? ' current' : ''
            }`}
          >
            <span className="timeline-dot" aria-hidden="true">
              {done ? <LuCheck aria-hidden="true" /> : index + 1}
            </span>
            <div>
              <h4>{STATUS_COPY[step].label}</h4>
              {current && <p>{STATUS_COPY[step].blurb}</p>}
              {at && <time>{formatTime(at)}</time>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
