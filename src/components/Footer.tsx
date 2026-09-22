import { Link } from 'react-router-dom';

/// The delivery number, in two shapes: the one people dial, and the E.164 one
/// `tel:` wants so it still works from a phone roaming outside Nigeria.
const PHONE_DISPLAY = '0911 237 8705';
const PHONE_TEL = '+2349112378705';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <span className="label">SBJ Foods and Drinks</span>
          <h3>Come hungry.</h3>
          <p>
            Independence Hall Cafeteria, Great Independence Hall, University of
            Ibadan. Open every day, 8:00 to 21:30.
          </p>
          <p>
            Delivery ·{' '}
            <a className="footer-phone" href={`tel:${PHONE_TEL}`}>
              {PHONE_DISPLAY}
            </a>
          </p>
        </div>

        <div>
          <span className="label">Order</span>
          <ul>
            <li>
              <Link to="/menu">The full menu</Link>
            </li>
            <li>
              <Link to="/track">Track an order</Link>
            </li>
            <li>Delivery · Pickup · Dine-in</li>
          </ul>
        </div>

        <div>
          <span className="label">Zones</span>
          <ul>
            <li>UI campus</li>
            <li>Agbowo</li>
            <li>Sango</li>
            <li>Bodija</li>
            <li>Orogun</li>
          </ul>
        </div>
      </div>

      {/* `label` goes on the spans, not the row: the footer's own .label rule
          sets display:block and would collapse the flex layout. */}
      <div className="site-footer-base">
        <span className="label">
          © {new Date().getFullYear()} SBJ Foods and Drinks
        </span>
        <span className="label">Pay on delivery or at the counter</span>
      </div>
    </footer>
  );
}
