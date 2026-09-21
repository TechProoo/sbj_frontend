import { useGSAP } from '@gsap/react';
import type { RefObject } from 'react';
import { DUR, EASE, gsap, prefersReducedMotion, splitLines } from '../lib/motion';

/// The opening shot, played once as the loader's curtain lifts.
///
/// Everything is already in its final layout position; only transforms and
/// masks animate, so nothing reflows mid-sequence and the timeline can be
/// interrupted safely.
export function useHeroEntry(
  scope: RefObject<HTMLElement | null>,
  active: boolean,
) {
  useGSAP(
    () => {
      if (!active) return;

      const headline = scope.current?.querySelector('.hero h1');

      if (prefersReducedMotion()) {
        // Clear the pre-entry state the stylesheet sets, and show everything.
        gsap.set(
          [
            '.hero-copy > *',
            '.hero-art img',
            '.hero-hours',
            '.hero-plate',
            '.category-strip button',
            '.brand-bar',
          ],
          { clearProps: 'all', opacity: 1, y: 0, x: 0, scale: 1 },
        );
        return;
      }

      let revertHeadline: (() => void) | undefined;
      const tl = gsap.timeline({ defaults: { ease: EASE.reveal } });

      // 1. The frame arrives before its contents.
      tl.from('.brand-bar', {
        yPercent: -100,
        duration: DUR.base,
      })
        .from(
          '.category-strip',
          { yPercent: -100, duration: DUR.base },
          '-=0.6',
        )
        .from(
          '.category-strip button',
          { opacity: 0, x: -14, duration: DUR.fast, stagger: 0.012 },
          '-=0.4',
        );

      // 2. The photograph pushes in, revealed behind a hard edge.
      tl.from(
        '.hero-art',
        {
          clipPath: 'inset(0% 0% 0% 100%)',
          duration: DUR.slow,
          ease: EASE.curtain,
        },
        0.15,
      ).from(
        '.hero-art img',
        { scale: 1.18, duration: 1.8, ease: EASE.camera },
        0.15,
      );

      // 3. Copy, line by line.
      tl.from('.hero-eyebrow', { opacity: 0, x: -18, duration: DUR.fast }, 0.45);

      if (headline) {
        const split = splitLines(headline);
        revertHeadline = split.revert;
        tl.from(
          split.lines,
          {
            yPercent: 110,
            duration: 0.95,
            stagger: 0.09,
            ease: EASE.reveal,
          },
          0.5,
        );
      }

      tl.from('.hero-lede', { opacity: 0, y: 18, duration: DUR.base }, 0.95)
        .from(
          '.hero-copy .btn',
          { opacity: 0, y: 20, duration: DUR.base, stagger: 0.09 },
          1.05,
        )
        // 4. The overlays land last, like plates being set down.
        .from('.hero-hours', { xPercent: 110, duration: DUR.base }, 0.9)
        .from('.hero-plate', { xPercent: -110, duration: DUR.base }, 1.0);

      return () => revertHeadline?.();
    },
    { scope, dependencies: [active] },
  );
}
