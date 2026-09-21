import { useNavigate } from 'react-router-dom';
import { LuMinus, LuPlus, LuShoppingBag, LuX } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../lib/format';

export function CartDrawer() {
  const { lines, subtotal, count, isOpen, setOpen, setQuantity, remove, clear } =
    useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const goToCheckout = () => {
    setOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={() => setOpen(false)} />
      <aside className="drawer" role="dialog" aria-label="Your order">
        <div className="drawer-head">
          <h2>Your order {count > 0 && <span>({count})</span>}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close cart"
          >
            <LuX size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="empty">
              <LuShoppingBag aria-hidden="true" />
              <p>Your cart is empty.</p>
              <p>Add something from the menu to get started.</p>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.key} className="cart-line">
                <div className="cart-line-main">
                  <h4>{line.name}</h4>
                  {line.modifiers.length > 0 && (
                    <p className="mods">
                      {line.modifiers.map((m) => m.name).join(' · ')}
                    </p>
                  )}
                  {line.notes && <p className="mods">“{line.notes}”</p>}

                  <div className="cart-line-actions">
                    <div className="stepper">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.key, line.quantity - 1)
                        }
                        aria-label={`Reduce ${line.name}`}
                      >
                        <LuMinus size={16} aria-hidden="true" />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(line.key, line.quantity + 1)
                        }
                        aria-label={`Add another ${line.name}`}
                      >
                        <LuPlus size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <span className="line-total">
                      {formatMoney(line.unitPrice * line.quantity)}
                    </span>

                    <button
                      type="button"
                      className="btn-quiet"
                      onClick={() => remove(line.key)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="totals">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="totals-row">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={goToCheckout}
            >
              Checkout · {formatMoney(subtotal)}
            </button>
            <button type="button" className="btn-quiet" onClick={clear}>
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
