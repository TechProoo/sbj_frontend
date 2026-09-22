import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LuBell,
  LuBookmark,
  LuMenu,
  LuSearch,
  LuShoppingBag,
  LuSlidersHorizontal,
  LuX,
} from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { useSavedCount } from '../lib/saved';
import type { Category } from '../lib/types';

/// The chip strip under the brand bar lists every dish the kitchen runs, in
/// one scrolling line. It doubles as jump navigation on the menu page.
///
/// On a phone the bar rearranges into the app header from the approved design
/// — menu button, centred wordmark, bell and cart — and the dish strip gives
/// way to the round category row on the page itself.
export function Header({
  categories = [],
  activeSlug,
  onJump,
}: {
  categories?: Category[];
  activeSlug?: string | null;
  onJump?: (slug: string) => void;
}) {
  const { count, setOpen } = useCart();
  const savedCount = useSavedCount();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // The sheet remembers which location it was opened at rather than holding a
  // boolean, so navigating anywhere closes it without an effect.
  const here = pathname + search;
  const [sheetAt, setSheetAt] = useState<string | null>(null);
  const sheetOpen = sheetAt === here;
  const setSheetOpen = (open: boolean) => setSheetAt(open ? here : null);

  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheetAt(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const strip = categories.flatMap((category) =>
    category.items.map((item) => ({
      key: item.id,
      name: item.name,
      slug: category.slug,
    })),
  );

  /// The phone search sits on the home screen only; the menu page has its own,
  /// so this hands the term over to it rather than filtering in two places.
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    navigate(query ? `/menu?q=${encodeURIComponent(query)}` : '/menu');
  };

  return (
    <header className="site-header">
      <div className="brand-bar">
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setSheetOpen(!sheetOpen)}
          aria-expanded={sheetOpen}
          aria-label={sheetOpen ? 'Close menu' : 'Open menu'}
        >
          {sheetOpen ? <LuX aria-hidden="true" /> : <LuMenu aria-hidden="true" />}
        </button>

        <Link to="/" className="brand">
          <img
            className="brand-mark"
            src="/brand/sbj-logo.png"
            alt=""
            width={62}
            height={62}
          />
          <span className="brand-text">
            <strong>SBJ Foods and Drinks</strong>
            <small>Indy Hall, UI · Since the pot was small</small>
            <em className="brand-sub">Food &amp; Drinks</em>
          </span>
        </Link>

        <nav className="header-nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/menu">Menu</NavLink>
          <NavLink to="/track" className="persist">
            My orders
          </NavLink>

          {/* Only appears once there is something to go back to. */}
          {savedCount > 0 && (
            <Link to="/menu?saved=1" className="saved-link persist">
              <LuBookmark aria-hidden="true" />
              <span className="visually-hidden">Saved dishes</span>
              <i>{savedCount}</i>
            </Link>
          )}
          <button
            type="button"
            className="cart-button"
            onClick={() => setOpen(true)}
          >
            Cart
            <span className="cart-badge">{count}</span>
          </button>
        </nav>

        {/* Phone-only icon pair on the right of the wordmark. */}
        <div className="brand-actions">
          <Link to="/track" className="round-btn" aria-label="Track an order">
            <LuBell aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="round-btn"
            onClick={() => setOpen(true)}
            aria-label={count > 0 ? `Your order, ${count} items` : 'Your order'}
          >
            <LuShoppingBag aria-hidden="true" />
            {count > 0 && <i className="round-btn-badge">{count}</i>}
          </button>
        </div>
      </div>

      {pathname === '/' && (
        <form className="phone-search" onSubmit={submitSearch} role="search">
          <label className="visually-hidden" htmlFor="phone-search-input">
            Search the menu
          </label>
          <LuSearch aria-hidden="true" />
          <input
            id="phone-search-input"
            type="search"
            placeholder="Search rice, soup, drinks…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <Link to="/menu" className="phone-search-filters" aria-label="Browse by category">
            <LuSlidersHorizontal aria-hidden="true" />
          </Link>
        </form>
      )}

      <div className="category-strip">
        <div className="category-strip-track">
          {strip.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={activeSlug === entry.slug}
              onClick={() => onJump?.(entry.slug)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      {sheetOpen && (
        <div className="nav-sheet" onClick={() => setSheetOpen(false)}>
          <Link to="/">Home</Link>
          <Link to="/menu">The full menu</Link>
          <Link to="/menu?saved=1">
            Saved dishes {savedCount > 0 && <i>{savedCount}</i>}
          </Link>
          <Link to="/track">My orders</Link>
          <button type="button" onClick={() => setOpen(true)}>
            Your cart {count > 0 && <i>{count}</i>}
          </button>
        </div>
      )}
    </header>
  );
}
