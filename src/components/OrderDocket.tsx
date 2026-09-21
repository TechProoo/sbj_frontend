import type { ReactNode } from 'react';
import { formatMoney } from '../lib/format';

export interface DocketLine {
  key: string;
  name: string;
  quantity: number;
  /// Omitted where the API does not expose per-line pricing — the
  /// tracking endpoint deliberately returns names and quantities only.
  amount?: string | number;
  modifiers?: string[];
  note?: string | null;
}

export interface DocketTotal {
  label: string;
  amount: string | number;
  /// Rendered large, as the figure being paid.
  grand?: boolean;
}

/*
 * The customer's copy of the kitchen ticket.
 *
 * The kitchen works off dockets, so the order summary is set as one: torn top
 * and bottom edge, tabular figures, leader dots between name and price. It
 * gives checkout, confirmation and tracking one shared object instead of three
 * different summary panels.
 */
export function OrderDocket({
  title,
  reference,
  meta,
  lines,
  totals,
  footer,
}: {
  title: string;
  reference?: string;
  meta?: { label: string; value: ReactNode }[];
  lines: DocketLine[];
  totals: DocketTotal[];
  footer?: ReactNode;
}) {
  return (
    <div className="docket">
      <span className="docket-tear docket-tear-top" aria-hidden="true" />

      <div className="docket-head">
        <span className="docket-title label">{title}</span>
        {reference && <p className="docket-ref">{reference}</p>}
      </div>

      {meta && meta.length > 0 && (
        <dl className="docket-meta">
          {meta.map((entry) => (
            <div key={entry.label}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <ul className="docket-lines">
        {lines.map((line) => (
          <li key={line.key} className="docket-line">
            <span className="docket-qty">{line.quantity}×</span>

            <span className="docket-body">
              <span className="docket-name">{line.name}</span>
              {line.modifiers && line.modifiers.length > 0 && (
                <span className="docket-mods">
                  {line.modifiers.join(' · ')}
                </span>
              )}
              {line.note && <span className="docket-note">“{line.note}”</span>}
            </span>

            {line.amount !== undefined && (
              <span className="docket-amount">{formatMoney(line.amount)}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="docket-totals">
        {totals.map((total) => (
          <div
            key={total.label}
            className={`docket-total${total.grand ? ' is-grand' : ''}`}
          >
            <span>{total.label}</span>
            <span>{formatMoney(total.amount)}</span>
          </div>
        ))}
      </div>

      {footer && <div className="docket-foot">{footer}</div>}

      <span className="docket-tear docket-tear-bottom" aria-hidden="true" />
    </div>
  );
}
