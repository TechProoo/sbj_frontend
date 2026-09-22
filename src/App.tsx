import { useEffect, useMemo, useRef, useState } from 'react';
import { LuUtensilsCrossed } from 'react-icons/lu';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { InstallPrompt } from './components/InstallPrompt';
import { Loader } from './components/Loader';
import { MobileTabBar } from './components/MobileTabBar';
import { CartProvider } from './context/CartContext';
import { useHeroEntry } from './hooks/useHeroEntry';
import { useMenu } from './hooks/useMenu';
import { useScrollReveal } from './hooks/useScrollReveal';
import { CheckoutPage } from './pages/CheckoutPage';
import { FeedPage } from './pages/FeedPage';
import { FullMenuPage } from './pages/FullMenuPage';
import { HomePage } from './pages/HomePage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { PaymentCallbackPage } from './pages/PaymentCallbackPage';
import { TrackPage } from './pages/TrackPage';

/*
 * A browser restores the previous scroll position across a client-side
 * navigation, so following a footer link from the bottom of a long page lands
 * you at the bottom of the next one. Reset it on every route change.
 *
 * Only the pathname is watched: the menu page keeps its filters in the query
 * string, and jumping to the top every time someone types would be worse than
 * the bug this fixes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { categories, loading, error } = useMenu();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // `booted` starts the page's own entry; `curtainGone` unmounts the loader.
  const [booted, setBooted] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);
  const shell = useRef<HTMLDivElement>(null);

  /// The loader waits on this image so the hero is never revealed empty.
  const heroImage = useMemo(() => {
    const items = categories.flatMap((category) => category.items);
    return (
      items.find((item) => item.isFeatured && item.imageUrl)?.imageUrl ?? null
    );
  }, [categories]);

  useHeroEntry(shell, booted);
  // Re-armed per route so each page gets its reveals; safe to rebuild because
  // the reveal tweens are context-tracked and a revert restores them.
  useScrollReveal(shell, booted && categories.length > 0, pathname);

  /// The category anchors live on the full menu page, so the dish strip has to
  /// go there first when it is clicked from anywhere else.
  const jump = (slug: string) => {
    setActiveSlug(slug);

    const scrollToCategory = () =>
      document
        .getElementById(`category-${slug}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (pathname === '/menu') {
      scrollToCategory();
      return;
    }

    navigate('/menu');
    // Wait for the route to paint before looking for the anchor.
    requestAnimationFrame(() => requestAnimationFrame(scrollToCategory));
  };

  const menuProps = { categories, loading, error };

  return (
    <div className={`app-shell${booted ? ' is-booted' : ''}`} ref={shell}>
      {!curtainGone && (
        <Loader
          // A failed menu must still lift the curtain, or the error banner
          // would be stuck behind it.
          ready={!loading}
          heroImage={heroImage}
          onReveal={() => setBooted(true)}
          onDone={() => setCurtainGone(true)}
        />
      )}

      <ScrollToTop />

      <Header categories={categories} activeSlug={activeSlug} onJump={jump} />

      <main>
        <Routes>
          <Route path="/" element={<HomePage {...menuProps} />} />
          <Route path="/menu" element={<FullMenuPage {...menuProps} />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:id" element={<OrderConfirmationPage />} />
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route
            path="*"
            element={
              <div className="page">
                <div className="empty">
                  <LuUtensilsCrossed aria-hidden="true" />
                  <h1 className="page-title">Page not found</h1>
                  <p>That page is not on the menu.</p>
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      <InstallPrompt />

      <Footer />
      <CartDrawer />
      <MobileTabBar />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Shell />
      </CartProvider>
    </BrowserRouter>
  );
}
