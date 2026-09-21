import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { LuArrowRight, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { api } from '../lib/api';
import { DUR, EASE, gsap, prefersReducedMotion, splitLines } from '../lib/motion';
import type { ShowcaseEntry } from '../lib/types';

const pad = (value: number) => String(value + 1).padStart(2, '0');

export function ShowcaseStage() {
  const [items, setItems] = useState<ShowcaseEntry[]>([]);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getShowcase()
      .then((data) => !cancelled && setItems(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const count = items.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // Arrow keys while the stage has focus. A carousel that only responds to a
  // mouse is unusable for anyone driving the page from a keyboard.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    }
  };

  useGSAP(
    () => {
      if (count === 0 || prefersReducedMotion()) return;

      const title = root.current?.querySelector('.stage-title');
      let revert: (() => void) | undefined;

      const tl = gsap.timeline({ defaults: { ease: EASE.reveal } });

      if (title) {
        const split = splitLines(title);
        revert = split.revert;
        tl.from(split.lines, { yPercent: 115, duration: 0.8, stagger: 0.07 });
      }

      tl.from('.stage-place', { opacity: 0, x: -18, duration: DUR.fast }, 0)
        .from('.stage-blurb', { opacity: 0, y: 16, duration: DUR.base }, 0.25)
        .from('.stage-cta', { opacity: 0, y: 16, duration: DUR.base }, 0.35);

      return () => revert?.();
    },
    { scope: root, dependencies: [index, count] },
  );

  if (count === 0) return null;

  const current = items[index];
  const prev = items[(index - 1 + count) % count];
  const next = items[(index + 1) % count];

  return (
    <section
      className="stage"
      ref={root}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="carousel"
      aria-label="Promotions we have run"
    >
      {/* Every frame stays mounted and crossfades, so switching slides never
          shows a gap while a new image decodes. */}
      <div className="stage-bg" aria-hidden="true">
        {items.map((item, position) => (
          <img
            key={item.id}
            src={item.imageUrl}
            alt=""
            className={position === index ? 'is-current' : undefined}
            loading={position === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className="stage-scrim" aria-hidden="true" />

      <div className="stage-inner">
        <div className="stage-copy">
          <span className="stage-ghost" aria-hidden="true">
            {prev.title}
          </span>

          <div className="stage-main">
            {current.place && (
              <span className="stage-place label">{current.place}</span>
            )}
            {/*
              Keyed per slide so React mounts a fresh node each time.
              SplitText rewrites this element's children, which leaves React
              unable to patch the text in place — and the cleanup revert()
              would then restore the *previous* title over the new one.
            */}
            <h2 className="stage-title" key={current.id}>
              {current.title}
            </h2>
            {current.blurb && <p className="stage-blurb">{current.blurb}</p>}

            <Link
              to={current.ctaHref ?? '/menu'}
              className="btn btn-primary stage-cta"
            >
              {current.ctaLabel ?? 'Explore'}
              <LuArrowRight aria-hidden="true" />
            </Link>
          </div>

          <span className="stage-ghost" aria-hidden="true">
            {next.title}
          </span>
        </div>

        <div className="stage-rail" role="tablist" aria-label="Promotions">
          {items.map((item, position) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={position === index}
              className={`stage-card${position === index ? ' is-current' : ''}`}
              onClick={() => go(position)}
            >
              <img src={item.imageUrl} alt="" loading="lazy" />
              <span className="stage-card-scrim" aria-hidden="true" />
              <span className="stage-card-body">
                <span className="stage-card-title">{item.title}</span>
                {item.place && (
                  <span className="stage-card-meta">{item.place}</span>
                )}
              </span>
              <span className="stage-card-go" aria-hidden="true">
                <LuArrowRight />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="stage-controls">
        <button
          type="button"
          className="stage-arrow"
          onClick={() => go(index - 1)}
          aria-label="Previous promotion"
        >
          <LuChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-arrow"
          onClick={() => go(index + 1)}
          aria-label="Next promotion"
        >
          <LuChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="stage-counter" aria-hidden="true">
        <b>{pad(index)}</b>
        <span>/ {pad(count - 1)}</span>
      </div>
    </section>
  );
}
