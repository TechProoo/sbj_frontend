import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSeo } from "../lib/seo";
import { LuTriangleAlert } from "react-icons/lu";
import { CategoryRow } from "../components/CategoryRow";
import { ItemCard } from "../components/ItemCard";
import { ItemModal } from "../components/ItemModal";
import { MeetSbj } from "../components/MeetSbj";
import { PromoCarousel } from "../components/PromoCarousel";
import { ShowcaseStage } from "../components/ShowcaseStage";
import { Testimonials } from "../components/Testimonials";
import { formatMoney, toNumber } from "../lib/format";
import type { Category, MenuItem } from "../lib/types";

const STEPS = [
  {
    label: "01 — Pick",
    copy: "Choose your plate, add your protein, tell us how you want it.",
  },
  {
    label: "02 — Pay",
    copy: "Transfer, card, cash to the rider, or settle at the counter.",
  },
  {
    label: "03 — Eat",
    copy: "Watch the kitchen move it from pot to plate to your door.",
  },
];

export function HomePage({
  categories,
  loading,
  error,
}: {
  categories: Category[];
  loading: boolean;
  error: string | null;
}) {
  useSeo({
    description:
      'Jollof, swallow and soup, shawarma and small chops, cooked to order at Indy Hall, UI. Delivery across campus and to Agbowo, Sango, Bodija and Orogun, or collect at the counter.',
    path: '/',
  });

  const [selected, setSelected] = useState<MenuItem | null>(null);
  const navigate = useNavigate();

  /// The category anchors live on the menu page, so a tap goes there first and
  /// scrolls once the route has painted.
  const jumpToCategory = (slug: string) => {
    navigate("/menu");
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document
          .getElementById(`category-${slug}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      ),
    );
  };

  const allItems = useMemo(
    () => categories.flatMap((category) => category.items),
    [categories],
  );

  /// The hero photo and the "on the plate today" line come from whatever the
  /// kitchen has flagged as featured, so the page changes with the menu.
  const featured = useMemo(
    () => allItems.filter((item) => item.isFeatured),
    [allItems],
  );

  const feature = useMemo(
    () => featured.find((item) => item.imageUrl) ?? featured[0] ?? null,
    [featured],
  );

  /// "Jollof rice, egusi soup, shawarma" — today's plate as one sentence-case
  /// line, so it reads like a handwritten board rather than a list of titles.
  const plateToday = useMemo(() => {
    if (featured.length === 0) return null;
    const line = featured
      .slice(0, 3)
      .map((item) => item.name.toLowerCase())
      .join(", ");
    return line.charAt(0).toUpperCase() + line.slice(1);
  }, [featured]);

  const board = useMemo(
    () =>
      [...allItems]
        .sort((a, b) => {
          // Photographed, featured dishes lead the board.
          const score = (item: MenuItem) =>
            (item.isFeatured ? 2 : 0) + (item.imageUrl ? 1 : 0);
          return score(b) - score(a);
        })
        .slice(0, 3),
    [allItems],
  );

  const cheapest = useMemo(() => {
    if (allItems.length === 0) return null;
    return allItems.reduce((min, item) =>
      toNumber(item.price) < toNumber(min.price) ? item : min,
    );
  }, [allItems]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow label">
            Delivery · Pickup · Dine-in
          </span>
          <h1>Real food, cooked the way home does it.</h1>
          <p className="hero-lede">
            Jollof and fried rice off the fire from morning, shawarma at night,
            swallow with soup that actually tastes like soup. Order it and we
            start cooking.
          </p>

          <div className="btn-pair">
            <Link to="/menu" className="btn btn-primary btn-lg">
              Start an order
            </Link>
            <Link to="/track" className="btn btn-ghost btn-lg">
              Track an order
            </Link>
          </div>
        </div>

        <div className="hero-art">
          {feature?.imageUrl ? (
            <img src={feature.imageUrl} alt={feature.name} />
          ) : (
            <div
              className="skeleton"
              style={{ width: "100%", height: "100%" }}
            />
          )}

          <span className="hero-hours label">8:00 — 21:30</span>

          {plateToday && (
            <div className="hero-plate">
              <span className="label">On the plate today</span>
              <strong>{plateToday}</strong>
            </div>
          )}
        </div>
      </section>

      <CategoryRow categories={categories} onJump={jumpToCategory} />

      <section className="rule-bottom">
        <div className="section-head">
          <span className="section-index label">01</span>
          <h2>Today&apos;s board</h2>
          <Link to="/menu" className="section-link label spacer">
            All dishes
          </Link>
        </div>

        {error && (
          <div style={{ padding: "0 var(--s-5) var(--s-6)" }}>
            <div className="banner banner-error">
              <LuTriangleAlert aria-hidden="true" />
              <div>
                <strong>{error}</strong>
                <p>That is on our side, not yours. Give it a moment and refresh.</p>
              </div>
            </div>
          </div>
        )}

        <div className="item-grid board-rail">
          {loading &&
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="skeleton dish-skeleton" />
            ))}

          {!loading &&
            board.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                onSelect={setSelected}
                showFlag={false}
              />
            ))}
        </div>
      </section>

      <PromoCarousel />

      <ShowcaseStage />

      <Testimonials />

      <MeetSbj />

      <section className="stat-row">
        <div className="stat-cell">
          <b>{cheapest ? formatMoney(cheapest.price) : "—"}</b>
          <span>Smallest plate on the menu</span>
        </div>
        <div className="stat-cell">
          <b>25 min</b>
          <span>Average from order to rider</span>
        </div>
        <div className="stat-cell">
          <b>4 zones</b>
          <span>UI campus · Agbowo · Sango · Bodija · Orogun</span>
        </div>
        <div className="stat-cell">
          <b>1 day</b>
          <span>Notice for ofada and chicken fried rice</span>
        </div>
      </section>

      <section className="steps">
        <div className="steps-head">
          <span className="section-index label">02</span>
          <h2>How it goes</h2>
        </div>

        {STEPS.map((step) => (
          <div key={step.label} className="step">
            <span className="label">{step.label}</span>
            <p>{step.copy}</p>
          </div>
        ))}
      </section>

      <section className="cta-band">
        <h2>Hunger is not a waiting game.</h2>
        <Link to="/menu" className="btn btn-lg">
          Open the menu
        </Link>
      </section>

      {selected && (
        <ItemModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
