import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import { DUR, EASE, ScrollTrigger, gsap, prefersReducedMotion } from '../lib/motion';

const BRANDS = [
  { name: 'SBJ Foods & Drinks', trade: 'Kitchen' },
  { name: 'Kintemmy International Prints', trade: 'Print' },
  { name: 'GMD Travels', trade: 'Travel' },
];

const BIO = [
  'Akintayo Segun Emmanuel is the dynamic MD/CEO of SBJ Foods & Drinks, Kintemmy International Prints, and GMD Travels, as well as a passionate song minister whose life and work inspire thousands. From beginnings that were anything but glamorous, he has built multiple powerhouse brands, each rising from small, uncertain ideas to become highly recognized names known for excellence, innovation, and impact.',
  'His journey is a bold reminder that greatness often starts with what’s in your hands. Through discipline, faith, relentless execution, and an unshakeable belief in growth, he transformed obstacles into opportunities and small steps into massive results.',
  'Beyond the boardroom, his voice as a song minister carries the same message as his business journey: purpose, resilience, and divine inspiration. He embodies the truth that a person can be both deeply spiritual and fiercely entrepreneurial — building, leading, and serving at the highest level.',
  'Today, he stands as a visionary CEO, a builder of brands, a mentor to rising entrepreneurs, and a living testimony that when you think big and start small, anything is possible.',
];

export function MeetSbj() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      // The colour plate starts badly out of register and pulls toward the
      // portrait as you scroll — the section's one piece of motion, and the
      // reason the print motif is there at all.
      gsap.from('.meet-plate', {
        xPercent: 14,
        yPercent: 14,
        opacity: 0.35,
        duration: DUR.slow,
        ease: EASE.curtain,
        scrollTrigger: {
          trigger: '.meet-figure',
          start: 'top 85%',
          once: true,
        },
      });

      gsap.from('.meet-portrait', {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: DUR.slow,
        ease: EASE.curtain,
        scrollTrigger: { trigger: '.meet-figure', start: 'top 85%', once: true },
      });

      gsap.from('.meet-mark', {
        opacity: 0,
        scale: 0.4,
        duration: DUR.fast,
        stagger: 0.06,
        ease: EASE.reveal,
        scrollTrigger: { trigger: '.meet-figure', start: 'top 75%', once: true },
      });

      gsap.from('.meet-quote-line', {
        yPercent: 110,
        duration: 0.9,
        stagger: 0.08,
        ease: EASE.reveal,
        scrollTrigger: { trigger: '.meet-quote', start: 'top 85%', once: true },
      });

      gsap.from('.meet-brand', {
        opacity: 0,
        y: 26,
        duration: DUR.base,
        stagger: 0.09,
        ease: EASE.reveal,
        scrollTrigger: { trigger: '.meet-brands', start: 'top 88%', once: true },
      });

      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section className="meet" ref={root} aria-labelledby="meet-name">
      <div className="meet-lead">
        <div className="meet-figure">
          {/* Offset colour plate, as on a press sheet that has drifted. */}
          <span className="meet-plate" aria-hidden="true" />

          <figure className="meet-portrait">
            <img
              src="/brand/segun-akintayo.jpg"
              alt="Akintayo Segun Emmanuel, MD/CEO of SBJ Foods and Drinks"
            />
          </figure>

          {/* Registration marks — the corner targets a printer lines up. */}
          {['tl', 'tr', 'bl', 'br'].map((corner) => (
            <span key={corner} className={`meet-mark meet-mark-${corner}`} aria-hidden="true" />
          ))}

          <span className="meet-edge label" aria-hidden="true">
            Song minister
          </span>
        </div>

        <div className="meet-intro">
          <span className="meet-kicker label">Meet SBJ</span>

          <h2 className="meet-name" id="meet-name">
            Akintayo
            <span>Segun Emmanuel</span>
          </h2>

          <p className="meet-role">
            <strong>MD / CEO</strong>
            <span>Three houses, one standard</span>
          </p>
        </div>
      </div>

      <blockquote className="meet-quote">
        <span className="meet-quote-mask">
          <span className="meet-quote-line">Think big,</span>
        </span>
        <span className="meet-quote-mask">
          <span className="meet-quote-line meet-quote-line-alt">
            start small.
          </span>
        </span>
      </blockquote>

      <div className="meet-brands">
        {BRANDS.map((brand, index) => (
          <div className="meet-brand" key={brand.name}>
            <span className="meet-brand-index label">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="meet-brand-name">{brand.name}</p>
            <span className="meet-brand-trade label">{brand.trade}</span>
          </div>
        ))}
      </div>

      <div className="meet-body">
        <div className="meet-body-side">
          <span className="label">About</span>
        </div>

        <div className="meet-copy">
          <p className="meet-lede">{BIO[0]}</p>

          <div className="meet-columns">
            {BIO.slice(1).map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>

          <div className="btn-pair meet-actions">
            <Link to="/menu" className="btn btn-primary">
              Start an order
            </Link>
            <Link to="/track" className="btn btn-ghost">
              Track an order
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
