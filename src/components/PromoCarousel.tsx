import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useGSAP } from '@gsap/react';
import { api } from '../lib/api';
import { DUR, EASE, gsap, prefersReducedMotion } from '../lib/motion';
import type { Promotion } from '../lib/types';

/// Long enough to read the terms line, short enough that a three-slide rotation
/// is not a commitment.
const AUTOPLAY_MS = 7000;

export function PromoCarousel() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPromotions()
      .then((data) => !cancelled && setPromos(data))
      // A carousel is decoration: if it fails, the section simply is not there.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const count = promos.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return;
    const timer = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, count, paused, go]);

  // Animate whichever slide is current. Keyed on `index` so each change
  // re-runs the timeline; the previous one is reverted by useGSAP.
  useGSAP(
    () => {
      if (count === 0 || prefersReducedMotion()) return;

      gsap
        .timeline({ defaults: { ease: EASE.reveal } })
        .from('.promo-panel > *', {
          opacity: 0,
          x: -28,
          duration: DUR.base,
          stagger: 0.07,
        })
        .from(
          '.promo-photo img',
          { scale: 1.12, duration: 1.4, ease: EASE.camera },
          0,
        );
    },
    { scope: root, dependencies: [index, count] },
  );

  // Horizontal swipe. Anything under the threshold is treated as a tap so a
  // slightly unsteady finger on the CTA does not change slide.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_PX = 45;

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    touchStart.current = null;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    // Ignore mostly-vertical movement so page scrolling still works.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    go(index + (dx < 0 ? 1 : -1));
  };

  if (count === 0) return null;

  const promo = promos[index];

  return (
    <section
      className="promo"
      ref={root}
      aria-roledescription="carousel"
      aria-label="Current offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Pausing on focus keeps the slide still while someone tabs the CTA.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="promo-panel">
        <span className="promo-kicker label">{promo.kicker}</span>
        <p className="promo-headline">{promo.headline}</p>
        {promo.terms && <span className="promo-terms">{promo.terms}</span>}

        {promo.ctaLabel && (
          <Link to={promo.ctaHref ?? '/menu'} className="btn btn-ghost">
            {promo.ctaLabel}
          </Link>
        )}
      </div>

      <div className="promo-photo">
        {promo.imageUrl && (
          // Keyed so React swaps the element and the push-in replays.
          <img key={promo.id} src={promo.imageUrl} alt="" />
        )}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="promo-arrow promo-prev"
            onClick={() => go(index - 1)}
            aria-label="Previous offer"
          >
            <LuChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="promo-arrow promo-next"
            onClick={() => go(index + 1)}
            aria-label="Next offer"
          >
            <LuChevronRight size={22} aria-hidden="true" />
          </button>

          <div className="promo-dots" role="tablist" aria-label="Choose offer">
            {promos.map((entry, dot) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={dot === index}
                aria-label={`Offer ${dot + 1} of ${count}: ${entry.kicker}`}
                className={dot === index ? 'is-current' : undefined}
                onClick={() => go(dot)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
