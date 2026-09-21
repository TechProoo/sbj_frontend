import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(Flip, ScrollTrigger, SplitText);

/*
 * Motion vocabulary for the storefront.
 *
 * The design is editorial and hard-edged, so the motion is too: things travel
 * in straight lines behind masks and settle without bouncing. No elastic, no
 * overshoot — a poster being assembled, not a toy.
 */
export const EASE = {
  /// Default for things arriving. Fast start, long settle.
  reveal: 'power3.out',
  /// Curtains and wipes — symmetric, deliberate.
  curtain: 'power4.inOut',
  /// Long camera-like moves (the hero image push-in).
  camera: 'expo.out',
} as const;

export const DUR = {
  fast: 0.45,
  base: 0.75,
  slow: 1.1,
  curtain: 0.9,
} as const;

/// Cheap to animate, and unlike `visibility` it survives a mid-flight reverse.
export const MASK_HIDDEN = 'inset(0% 0% 100% 0%)';
export const MASK_SHOWN = 'inset(0% 0% -1% 0%)';

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/// Splits an element into masked lines and returns the line elements plus a
/// revert function. Each line sits in its own overflow-hidden wrapper so the
/// text can slide up from behind a hard edge.
export function splitLines(element: Element): {
  lines: Element[];
  revert: () => void;
} {
  const split = new SplitText(element, {
    type: 'lines',
    linesClass: 'split-line',
    // Without this, a line break inside a word's descenders can clip.
    autoSplit: true,
    mask: 'lines',
  });

  return { lines: split.lines, revert: () => split.revert() };
}

export { Flip, gsap, ScrollTrigger, SplitText };
