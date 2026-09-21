import { useGSAP } from '@gsap/react';
import type { RefObject } from 'react';
import {
  DUR,
  EASE,
  ScrollTrigger,
  gsap,
  prefersReducedMotion,
} from '../lib/motion';

/*
 * Section reveals below the fold. Deliberately quieter than the hero — one
 * move per element, nothing competing with reading.
 *
 * The hidden state is applied from JS, never CSS. If this hook fails to run
 * the page is simply un-animated rather than blank, which is the right way
 * round for a menu someone is trying to order from.
 */
export function useScrollReveal(
  scope: RefObject<HTMLElement | null>,
  /// A single boolean that flips once, so the context is not repeatedly
  /// reverted and rebuilt while the page is booting.
  enabled: boolean,
  /// Re-runs the setup when this changes, e.g. the current route.
  key = '',
) {
  useGSAP(
    (_context, contextSafe) => {
      if (!enabled || prefersReducedMotion() || !contextSafe) return;

      // Wrapping the reveal in contextSafe registers each tween with this
      // hook's gsap context. Without it, a tween created later inside an
      // onEnter callback is invisible to cleanup — and a revert that lands
      // mid-tween strands the element at opacity 0 forever, because
      // `once: true` means the trigger will not fire again.
      const reveal = contextSafe((elements: Element[], each: number) =>
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          duration: DUR.base,
          ease: EASE.reveal,
          // `amount` spreads the whole batch over a fixed window rather than
          // per-element, so a 30-card category finishes in the same time as a
          // 3-card row. Per-element staggering would take ~3s and the cards
          // would visibly trickle in behind a fast scroll.
          stagger: { amount: Math.min(elements.length * each, 0.4) },
          overwrite: 'auto',
          // Leave no inline styles behind once the reveal is done.
          clearProps: 'opacity,transform',
        }),
      );

      const batch = (selector: string, y: number, stagger = 0.08) => {
        const targets = gsap.utils.toArray<HTMLElement>(selector);
        if (targets.length === 0) return;

        gsap.set(targets, { opacity: 0, y });

        // batch groups whatever enters together, so a row of cards staggers
        // as a row rather than firing one trigger per card. Anything already
        // past the start line when this runs fires immediately.
        ScrollTrigger.batch(targets, {
          start: 'top 92%',
          once: true,
          onEnter: (elements) => reveal(elements as Element[], stagger),
        });
      };

      batch('.section-head', 28);
      batch('.dish-card', 44, 0.07);
      batch('.stat-cell', 26);
      batch('.step', 26);

      // The CTA band gets the one flourish down here: it wipes in as a solid.
      const band = scope.current?.querySelector('.cta-band');
      if (band) {
        gsap.from(band, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: DUR.slow,
          ease: EASE.curtain,
          scrollTrigger: { trigger: band, start: 'top 88%', once: true },
        });
      }

      // Images decode after this runs and push everything down; stale trigger
      // positions would otherwise fire at the wrong scroll offsets.
      const refresh = () => ScrollTrigger.refresh();
      const timer = setTimeout(refresh, 400);
      window.addEventListener('load', refresh);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('load', refresh);
      };
    },
    { scope, dependencies: [enabled, key] },
  );
}
