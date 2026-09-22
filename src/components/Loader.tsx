import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { DUR, EASE, gsap, prefersReducedMotion } from '../lib/motion';

const SLABS = 6;

/// Shown against real progress, not a timer — each line corresponds to a
/// milestone the boot actually waits on.
const STATUS = [
  { at: 0, text: 'Lighting the grill' },
  { at: 0.4, text: 'Warming the pots' },
  { at: 0.75, text: 'Setting the board' },
  { at: 1, text: 'Service' },
];

/// Minimum time the curtain stays up. Without it a warm cache makes the whole
/// sequence flash past in 80ms, which reads as a glitch rather than an intro.
const MIN_MS = 1200;

/// Hard ceiling. Fonts come from a CDN and the hero photo from storage; if
/// either stalls, the intro must still get out of the way. Nothing here is
/// worth trapping someone behind a curtain for.
const MAX_MS = 3000;

/// Fonts get their own, shorter cap. Waiting on them avoids a flash of the
/// fallback face mid-reveal, but a slow CDN should not hold up the whole
/// sequence when the data and photo are already in.
const FONT_MS = 1500;

export function Loader({
  /// Data has arrived (or failed — a failed menu should not trap the curtain).
  ready,
  /// Preloaded before reveal so the hero does not pop in empty behind it.
  heroImage,
  onReveal,
  onDone,
}: {
  ready: boolean;
  heroImage?: string | null;
  onReveal: () => void;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  // Real milestones: fonts, data, hero image. Each completes independently.
  const [fontsReady, setFontsReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const min = setTimeout(() => setMinElapsed(true), MIN_MS);
    const max = setTimeout(() => setTimedOut(true), MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = () => !cancelled && setFontsReady(true);

    // Give up after FONT_MS. document.fonts is also absent in some older
    // browsers, so never make the sequence depend on it resolving.
    const cap = setTimeout(done, FONT_MS);
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(done).catch(done);
    } else {
      done();
    }

    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!heroImage) {
      setImageReady(true);
      return;
    }

    let cancelled = false;
    const image = new Image();
    // Resolve either way: a broken photo must not hold the site hostage.
    const finish = () => !cancelled && setImageReady(true);
    image.onload = finish;
    image.onerror = finish;
    image.src = heroImage;

    return () => {
      cancelled = true;
    };
  }, [ready, heroImage]);

  const assetsReady = fontsReady && ready && imageReady;
  const progress = timedOut
    ? 1
    : (Number(fontsReady) + Number(ready) + Number(imageReady)) / 3;

  // The minimum always applies; past the ceiling we stop waiting on stragglers.
  const canReveal = minElapsed && (assetsReady || timedOut);

  // ---------------------------------------------------------------- intro

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set('.loader-inner > *', { opacity: 1, y: 0 });
        return;
      }

      const intro = gsap.timeline({ defaults: { ease: EASE.reveal } });

      intro
        .from('.loader-mark', {
          scale: 0.82,
          opacity: 0,
          duration: DUR.base,
        })
        .from(
          '.loader-word',
          { yPercent: 115, duration: DUR.base },
          '-=0.45',
        )
        .from(
          '.loader-meta > *',
          { opacity: 0, y: 12, duration: DUR.fast, stagger: 0.08 },
          '-=0.35',
        )
        .from(
          '.loader-track',
          { scaleX: 0, duration: DUR.base, transformOrigin: 'left center' },
          '-=0.5',
        );
    },
    { scope: root },
  );

  // ---------------------------------------------------------------- progress

  useGSAP(
    () => {
      const counter = { value: 0 };
      const target = Math.round(progress * 100);

      gsap.to(counter, {
        value: target,
        duration: DUR.base,
        ease: 'power2.out',
        onUpdate: () => {
          const shown = Math.round(counter.value);
          if (countRef.current) {
            countRef.current.textContent = String(shown).padStart(2, '0');
          }
          if (statusRef.current) {
            const stage = [...STATUS]
              .reverse()
              .find((entry) => shown / 100 >= entry.at);
            if (stage && statusRef.current.textContent !== stage.text) {
              statusRef.current.textContent = stage.text;
            }
          }
        },
      });

      gsap.to('.loader-bar', {
        scaleX: progress,
        duration: DUR.base,
        ease: 'power2.out',
      });
    },
    { scope: root, dependencies: [progress] },
  );

  // ---------------------------------------------------------------- exit

  useGSAP(
    () => {
      if (!canReveal) return;

      if (prefersReducedMotion()) {
        onReveal();
        gsap.to(root.current, {
          opacity: 0,
          duration: 0.25,
          onComplete: onDone,
        });
        return;
      }

      const exit = gsap.timeline();

      exit
        // Settle on 100 before anything moves, so the number is never
        // caught mid-count as the curtain lifts.
        .to('.loader-inner', {
          yPercent: -18,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
          delay: 0.15,
        })
        .to(
          '.loader-slab',
          {
            yPercent: -101,
            duration: 0.75,
            ease: EASE.curtain,
            stagger: { each: 0.045, from: 'start' },
            // The page beneath starts moving while the curtain is still
            // lifting — the overlap is what makes it read as one shot.
            onStart: () => gsap.delayedCall(0.28, onReveal),
          },
          '-=0.1',
        )
        .add(onDone);
    },
    { scope: root, dependencies: [canReveal] },
  );

  return (
    <div className="loader" ref={root} role="status" aria-label="Loading">
      <div className="loader-slabs" aria-hidden="true">
        {Array.from({ length: SLABS }, (_, index) => (
          <span className="loader-slab" key={index} />
        ))}
      </div>

      <div className="loader-inner">
        <img
          className="loader-mark"
          src="/brand/sbj-logo.png"
          alt=""
          width={92}
          height={92}
        />

        <div className="loader-word-mask">
          <h1 className="loader-word">SBJ Foods and Drinks</h1>
        </div>

        <div className="loader-meta label">
          <span ref={statusRef}>{STATUS[0].text}</span>
          <span className="loader-count">
            <span ref={countRef}>00</span>
            <i>%</i>
          </span>
        </div>

        <div className="loader-track">
          <span className="loader-bar" />
        </div>
      </div>
    </div>
  );
}
