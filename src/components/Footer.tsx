import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div>
          <span className="label">SBJ Foods and Drinks</span>
          <h3>Come hungry.</h3>
          <p>
            Lagos · Since the pot was small. Open every day, 8:00 to 21:30.
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
            <li>Ikeja</li>
            <li>Yaba</li>
            <li>Surulere</li>
            <li>Lekki</li>
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
