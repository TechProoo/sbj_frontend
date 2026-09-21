import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { LuChevronLeft, LuChevronRight, LuQuote, LuStar } from 'react-icons/lu';
import { api } from '../lib/api';
import { DUR, EASE, ScrollTrigger, gsap, prefersReducedMotion } from '../lib/motion';
import type { Testimonial, TestimonialFeed } from '../lib/types';

/// Initials, so a review without a photo still gets a mark rather than a
/// stock face standing in for a real person.
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <LuStar
          key={index}
          aria-hidden="true"
          className={index < rating ? 'is-filled' : undefined}
        />
      ))}
    </span>
  );
}

function Card({ item, active }: { item: Testimonial; active: boolean }) {
  return (
    <article
      className={`voice-card${active ? ' is-active' : ''}`}
      aria-hidden={!active ? undefined : undefined}
    >
      <header className="voice-card-head">
        <span className="voice-avatar" aria-hidden="true">
          {item.avatarUrl ? (
            <img src={item.avatarUrl} alt="" />
          ) : (
            initials(item.authorName)
          )}
        </span>

        <Stars rating={item.rating} />

        <LuQuote className="voice-quote-mark" aria-hidden="true" />
      </header>

      <blockquote className="voice-quote">{item.quote}</blockquote>

      <footer className="voice-card-foot">
        <p className="voice-author">{item.authorName}</p>
        {item.authorRole && <p className="voice-role">{item.authorRole}</p>}
      </footer>
    </article>
  );
}

export function Testimonials() {
  const [feed, setFeed] = useState<TestimonialFeed | null>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getTestimonials()
      .then((data) => !cancelled && setFeed(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // How many cards fit drives the paging maths, so it has to track the
  // breakpoints rather than being assumed.
  useEffect(() => {
    const read = () => {
      const width = window.innerWidth;
      setPerView(width < 720 ? 1 : width < 1100 ? 2 : 3);
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  const items = feed?.items ?? [];
  const pages = Math.max(1, items.length - perView + 1);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % pages) + pages) % pages);
    },
    [pages],
  );

  // Clamp when the viewport shrinks and fewer pages exist than the current
  // index, otherwise the track scrolls past the end.
  useEffect(() => {
    setIndex((current) => Math.min(current, pages - 1));
  }, [pages]);

  useGSAP(
    () => {
      if (items.length === 0 || prefersReducedMotion()) return;

      // immediateRender:false is the whole safety story here — nothing is
      // hidden until the trigger actually fires, so a trigger that never
      // fires leaves the section visible instead of blank.
      gsap.fromTo(
        '.voice-head > *',
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: DUR.base,
          stagger: 0.08,
          ease: EASE.reveal,
          immediateRender: false,
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
        },
      );

      // Transform only. Opacity belongs to CSS here, which uses it to dim the
      // cards outside the window — an inline opacity from GSAP would win and
      // freeze that dimming at whatever it was when the tween ended.
      gsap.fromTo(
        '.voice-card',
        { y: 40 },
        {
          y: 0,
          duration: DUR.base,
          stagger: 0.09,
          ease: EASE.reveal,
          immediateRender: false,
          clearProps: 'transform',
          scrollTrigger: {
            trigger: '.voice-rail',
            start: 'top 90%',
            once: true,
          },
        },
      );

      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [items.length] },
  );

  if (items.length === 0) return null;

  const summary = feed?.average !== null && feed?.average !== undefined;

  return (
    <section className="voices" ref={root} aria-labelledby="voices-title">
      <div className="voice-head">
        <div>
          <span className="voice-kicker label">What our guests say</span>
          <h2 id="voices-title" className="voice-title">
            Unforgettable <em>experiences</em>
          </h2>
        </div>

        {summary && (
          <div className="voice-summary">
            <span className="voice-faces" aria-hidden="true">
              {items.slice(0, 4).map((item) => (
                <span className="voice-face" key={item.id}>
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt="" />
                  ) : (
                    initials(item.authorName)
                  )}
                </span>
              ))}
            </span>

            <div className="voice-score">
              <span className="voice-score-row">
                <Stars rating={Math.round(feed!.average!)} />
                <b>{feed!.average!.toFixed(1)}</b>
              </span>
              <small>
                From {feed!.count} published review
                {feed!.count === 1 ? '' : 's'}
              </small>
            </div>
          </div>
        )}
      </div>

      <div className="voice-rail">
        <button
          type="button"
          className="voice-arrow"
          onClick={() => go(index - 1)}
          disabled={pages < 2}
          aria-label="Previous reviews"
        >
          <LuChevronLeft aria-hidden="true" />
        </button>

        <div className="voice-viewport">
          <div
            className="voice-track"
            style={{
              // One card's width per step, gap included.
              transform: `translate3d(calc(${-index} * (var(--voice-card) + var(--s-4))), 0, 0)`,
            }}
          >
            {items.map((item, position) => (
              <Card
                key={item.id}
                item={item}
                active={
                  position >= index && position < index + perView
                }
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="voice-arrow"
          onClick={() => go(index + 1)}
          disabled={pages < 2}
          aria-label="Next reviews"
        >
          <LuChevronRight aria-hidden="true" />
        </button>
      </div>

      {pages > 1 && (
        <div className="voice-dots" role="tablist" aria-label="Review pages">
          {Array.from({ length: pages }, (_, dot) => (
            <button
              key={dot}
              type="button"
              role="tab"
              aria-selected={dot === index}
              aria-label={`Reviews ${dot + 1} of ${pages}`}
              className={dot === index ? 'is-current' : undefined}
              onClick={() => go(dot)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
