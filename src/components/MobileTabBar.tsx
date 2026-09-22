import { Link, useLocation } from "react-router-dom";
import { LuHouse, LuNewspaper, LuReceipt, LuShoppingBag, LuUtensils } from "react-icons/lu";
import { useCart } from "../context/CartContext";

/*
 * The phone's bottom bar: five slots with the order button raised through the
 * middle. Hidden above the mobile breakpoint, where the header nav does this
 * job instead.
 *
 * Two of the design's slots have no feature behind them yet, so they point at
 * the nearest real thing: saved dishes and order tracking.
 */
export function MobileTabBar() {
  const { count, setOpen } = useCart();
  const { pathname, search } = useLocation();

  const onSaved = pathname === "/menu" && search.includes("saved=1");
  const tab = (isActive: boolean) => `tab-item${isActive ? " is-active" : ""}`;

  return (
    <nav className="tab-bar" aria-label="Main">
      <Link to="/" className={tab(pathname === "/")}>
        <LuHouse aria-hidden="true" />
        Home
      </Link>

      <Link to="/menu" className={tab(pathname === "/menu" && !onSaved)}>
        <LuUtensils aria-hidden="true" />
        Menu
      </Link>

      {/* The raised centre button opens the cart rather than a sixth screen. */}
      <button
        type="button"
        className="tab-order"
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Open your order, ${count} items` : "Open your order"}
      >
        <span className="tab-order-disc">
          <LuShoppingBag aria-hidden="true" />
          {count > 0 && <i>{count}</i>}
        </span>
        Order
      </button>

      {/* Saved keeps its shortcut in the header; this slot goes to the feed,
          which is somewhere to go rather than a tool. */}
      <Link to="/feed" className={tab(pathname === "/feed")}>
        <LuNewspaper aria-hidden="true" />
        Feed
      </Link>

      <Link to="/track" className={tab(pathname === "/track")}>
        <LuReceipt aria-hidden="true" />
        Orders
      </Link>
    </nav>
  );
}
