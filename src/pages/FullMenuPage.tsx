import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { LuBookmark, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu';
import { ItemCard } from '../components/ItemCard';
import { ItemModal } from '../components/ItemModal';
import {
  DUR,
  EASE,
  Flip,
  ScrollTrigger,
  gsap,
  prefersReducedMotion,
  splitLines,
} from '../lib/motion';
import { clearSaved, useSavedIds } from '../lib/saved';
import type { Category, MenuItem } from '../lib/types';

/// Typing filters on every keystroke, but re-laying out the grid that often
/// looks frantic. The input stays instant; the grid settles behind it.
const FILTER_DEBOUNCE_MS = 180;

/// The complete listing, on its own route. It used to be a third section on
/// the home page, which made the landing page enormous and buried the board.
export function FullMenuPage({
  categories,
  loading,
  error,
}: {
  categories: Category[];
  loading: boolean;
  error: string | null;
}) {
  // `?q=` lets the phone header hand its search term over to this page.
  const initialQuery = new URLSearchParams(window.location.search).get('q') ?? '';
  const [search, setSearch] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // The saved view is a URL state, so the header's "Saved" link can open it
  // and the browser's back button closes it again.
  const [params, setParams] = useSearchParams();
  const onlySaved = params.get('saved') === '1';
  const savedIds = useSavedIds();

  const showSaved = (next: boolean) => {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next) updated.set('saved', '1');
        else updated.delete('saved');
        return updated;
      },
      { replace: true },
    );
  };

  const root = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<ReturnType<typeof Flip.getState> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term && !onlySaved) return categories;

    // The two filters stack: searching inside the saved view searches only
    // what is saved.
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (onlySaved && !savedIds.includes(item.id)) return false;
          if (!term) return true;
          return (
            item.name.toLowerCase().includes(term) ||
            item.description?.toLowerCase().includes(term) ||
            item.tags.some((tag) => tag.includes(term))
          );
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, onlySaved, query, savedIds]);

  /// Stable identity for the slug list, so effects do not re-run on every
  /// render just because a new array was built.
  const visibleSlugs = useMemo(
    () => visible.map((category) => category.slug),
    [visible],
  );

  const total = useMemo(
    () => visible.reduce((sum, category) => sum + category.items.length, 0),
    [visible],
  );

  const allTotal = useMemo(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  );

  // Marks the rail before the first scroll, and re-anchors to the top of the
  // results whenever the filter changes — carrying the old selection over
  // leaves the rail pointing at a category you are no longer looking at.
  useEffect(() => {
    setActiveSlug(visibleSlugs[0] ?? null);
  }, [visibleSlugs]);

  /* ------------------------------------------------------------ masthead */

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const title = root.current?.querySelector('.menu-title');
      let revert: (() => void) | undefined;

      const tl = gsap.timeline({ defaults: { ease: EASE.reveal } });

      if (title) {
        const split = splitLines(title);
        revert = split.revert;
        tl.from(split.lines, { yPercent: 115, duration: 0.9, stagger: 0.08 });
      }

      tl.from('.menu-kicker', { opacity: 0, x: -16, duration: DUR.fast }, 0)
        .from(
          '.menu-facts > *',
          { opacity: 0, y: 14, duration: DUR.fast, stagger: 0.07 },
          0.3,
        )
        .from('.menu-search', { opacity: 0, y: 18, duration: DUR.base }, 0.35);

      return () => revert?.();
    },
    { scope: root },
  );

  /* --------------------------------------------------------- flip filter */

  // Geometry has to be captured before React commits the new list, so this
  // runs in the render pass rather than an effect.
  if (!prefersReducedMotion() && root.current) {
    const cards = root.current.querySelectorAll('.dish-card');
    if (cards.length > 0) flipState.current = Flip.getState(cards);
  }

  useGSAP(
    () => {
      const state = flipState.current;
      flipState.current = null;
      if (!state || prefersReducedMotion()) return;

      Flip.from(state, {
        duration: 0.55,
        ease: 'power2.inOut',
        scale: true,
        // Survivors slide to their new slot; arrivals and departures fade
        // through it rather than popping.
        onEnter: (elements) =>
          gsap.fromTo(
            elements,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1, duration: 0.45, ease: EASE.reveal },
          ),
        onLeave: (elements) =>
          gsap.to(elements, {
            opacity: 0,
            scale: 0.92,
            duration: 0.3,
            ease: 'power2.in',
          }),
        onComplete: () => {
          // The global scroll reveal also writes opacity onto these cards.
          // Clearing both stops a filtered-in card inheriting a stale hidden
          // state and never appearing.
          gsap.set('.dish-card', { clearProps: 'opacity,transform' });
          ScrollTrigger.refresh();
        },
      });
    },
    { scope: root, dependencies: [query, onlySaved, savedIds] },
  );

  /* --------------------------------------------------------- scroll spy */

  useGSAP(
    () => {
      if (visible.length === 0) return;

      const triggers = visible.map((category) =>
        ScrollTrigger.create({
          trigger: `#category-${category.slug}`,
          // A band just under the sticky chrome, so the rail marks whichever
          // section is actually being read.
          start: 'top 42%',
          end: 'bottom 42%',
          onToggle: (self) => {
            if (self.isActive) setActiveSlug(category.slug);
          },
        }),
      );

      return () => triggers.forEach((trigger) => trigger.kill());
    },
    {
      scope: root,
      dependencies: [visibleSlugs.join(',')],
    },
  );

  // Slide the rail indicator under whichever chip is active.
  useGSAP(
    () => {
      const rail = railRef.current;
      if (!rail) return;

      const chip = rail.querySelector<HTMLElement>('[aria-current="true"]');
      const bar = rail.querySelector<HTMLElement>('.menu-rail-bar');
      if (!chip || !bar) return;

      gsap.to(bar, {
        x: chip.offsetLeft,
        width: chip.offsetWidth,
        duration: prefersReducedMotion() ? 0 : 0.4,
        ease: 'power3.out',
      });

      // Keep the active chip in view on narrow screens.
      chip.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    },
    { dependencies: [activeSlug, visible.length] },
  );

  const dishes = (n: number) => `${n} ${n === 1 ? 'dish' : 'dishes'}`;

  const countLine = onlySaved
    ? query
      ? `${dishes(total)} matching “${query}” in your saved dishes`
      : `${dishes(total)} saved`
    : query
      ? `${dishes(total)} matching “${query}”`
      : `Showing all ${dishes(allTotal)}`;

  const jumpTo = (slug: string) => {
    setActiveSlug(slug);
    document
      .getElementById(`category-${slug}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="menu-page" ref={root}>
      <header className="menu-masthead">
        <span className="menu-kicker label">The full menu</span>
        <h1 className="menu-title">Everything we cook</h1>

        <div className="menu-facts">
          <span>
            <b>{allTotal}</b> dishes
          </span>
          <span>
            <b>{categories.length}</b> categories
          </span>
          <span>
            Kitchen open <b>8:00 — 21:30</b>
          </span>
        </div>

        <div className="menu-search">
          <LuSearch aria-hidden="true" />
          <label className="visually-hidden" htmlFor="menu-search-input">
            Search the menu
          </label>
          <input
            id="menu-search-input"
            type="search"
            placeholder="Search a dish, a soup, an ingredient…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              className="menu-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <LuX aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="menu-filters">
          <button
            type="button"
            className={`menu-saved-toggle${onlySaved ? ' is-on' : ''}`}
            aria-pressed={onlySaved}
            onClick={() => showSaved(!onlySaved)}
          >
            <LuBookmark aria-hidden="true" />
            Saved
            <i>{savedIds.length}</i>
          </button>

          {onlySaved && savedIds.length > 0 && (
            <button type="button" className="btn-quiet" onClick={clearSaved}>
              Clear all saved
            </button>
          )}
        </div>

        <p className="menu-count" aria-live="polite">
          {countLine}
        </p>
      </header>

      {visible.length > 0 && (
        <nav className="menu-rail" aria-label="Menu categories">
          <div className="menu-rail-track" ref={railRef}>
            <span className="menu-rail-bar" aria-hidden="true" />
            {visible.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-current={activeSlug === category.slug}
                onClick={() => jumpTo(category.slug)}
              >
                {category.name}
                <i>{category.items.length}</i>
              </button>
            ))}
          </div>
        </nav>
      )}

      {error && (
        <div style={{ padding: 'var(--s-5)' }}>
          <div className="banner banner-error">
            <LuTriangleAlert aria-hidden="true" />
            <div>
              <strong>{error}</strong>
              <p>That is on our side, not yours. Give it a moment and refresh.</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="item-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton dish-skeleton" />
          ))}
        </div>
      )}

      {!loading && total === 0 && onlySaved && savedIds.length === 0 && (
        <div className="menu-empty">
          <LuBookmark aria-hidden="true" />
          <h2>Nothing saved yet</h2>
          <p>
            Tap the bookmark on any dish and it waits for you here, on this
            device.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => showSaved(false)}
          >
            Back to the full menu
          </button>
        </div>
      )}

      {!loading && total === 0 && !(onlySaved && savedIds.length === 0) && (
        <div className="menu-empty">
          <LuSearch aria-hidden="true" />
          <h2>
            {query
              ? `Nothing matches “${query}”`
              : 'Nothing to show here'}
          </h2>
          <p>
            {onlySaved
              ? 'None of your saved dishes match that search.'
              : 'Try a dish name, a soup, or an ingredient.'}
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearch('');
              showSaved(false);
            }}
          >
            {onlySaved ? 'Show the full menu' : 'Clear the search'}
          </button>
        </div>
      )}

      {visible.map((category, index) => (
        <section
          key={category.id}
          id={`category-${category.slug}`}
          className="menu-section"
        >
          <div className="menu-section-head">
            <span className="menu-section-index label">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2>{category.name}</h2>
            {category.description && <p>{category.description}</p>}
            <span className="menu-section-count label">
              {category.items.length}
            </span>
          </div>

          <div className="item-grid">
            {category.items.map((item, position) => (
              <ItemCard
                key={item.id}
                item={item}
                index={position}
                onSelect={setSelected}
              />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <ItemModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
