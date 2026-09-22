import { useEffect, useMemo, useState } from "react";
import { LuMegaphone, LuTriangleAlert, LuUtensils, LuX } from "react-icons/lu";
import { api, ApiError } from "../lib/api";
import type { FeedPost } from "../lib/types";

const FILTERS = [
  { value: "ALL", label: "Everything" },
  { value: "PROMO", label: "Offers" },
  { value: "GIST", label: "Gist" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/// Feeds are read in the present tense: "2 hours ago" tells you whether the
/// jollof is still on, where a date does not.
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

/*
 * The kitchen's feed.
 *
 * Deliberately not an endless column of identical squares. Posts run in a
 * three-beat rhythm — tall, wide, wide — and every caption sits in a card
 * that overlaps the foot of its photograph, so the page reads like a printed
 * magazine spread rather than a social timeline.
 */
export function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [viewing, setViewing] = useState<FeedPost | null>(null);

  useEffect(() => {
    api
      .getFeed()
      .then(setPosts)
      .catch((err: unknown) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the feed just now.",
        ),
      );
  }, []);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewing(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewing]);

  const visible = useMemo(
    () =>
      (posts ?? []).filter((post) => filter === "ALL" || post.kind === filter),
    [posts, filter],
  );

  const counts = useMemo(
    () => ({
      ALL: posts?.length ?? 0,
      PROMO: (posts ?? []).filter((p) => p.kind === "PROMO").length,
      GIST: (posts ?? []).filter((p) => p.kind === "GIST").length,
    }),
    [posts],
  );

  return (
    <div className="feed-page">
      <header className="feed-masthead">
        <span className="feed-kicker label">From the kitchen</span>
        <h1 className="feed-title">What&apos;s cooking</h1>
        <p className="feed-lede">
          Offers, new plates and the day&apos;s gist — posted by the kitchen as
          it happens.
        </p>

        <div className="feed-filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? "is-on" : ""}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <i>{counts[option.value]}</i>
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="feed-state">
          <div className="banner banner-error">
            <LuTriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!posts && !error && (
        <div className="feed-list">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton feed-skeleton" />
          ))}
        </div>
      )}

      {posts && visible.length === 0 && (
        <div className="feed-state feed-empty">
          <LuMegaphone aria-hidden="true" />
          <h2>Nothing here yet</h2>
          <p>
            {filter === "ALL"
              ? "The kitchen has not posted anything yet. Check back after service."
              : "Nothing under this one yet — try Everything."}
          </p>
        </div>
      )}

      <div className="feed-list">
        {visible.map((post, index) => (
          <article
            key={post.id}
            className={`feed-post${index % 3 === 0 ? " is-tall" : ""}`}
          >
            <button
              type="button"
              className="feed-photo"
              onClick={() => setViewing(post)}
              aria-label={`View the picture: ${post.caption.slice(0, 60)}`}
            >
              <img src={post.imageUrl} alt="" loading="lazy" />
              <span
                className={`feed-chip${post.kind === "PROMO" ? " is-promo" : ""}`}
              >
                {post.kind === "PROMO" ? (
                  <>
                    <LuMegaphone aria-hidden="true" />
                    Offer
                  </>
                ) : (
                  <>
                    <LuUtensils aria-hidden="true" />
                    Gist
                  </>
                )}
              </span>
            </button>

            {/* The caption card laps over the foot of the photograph. */}
            <div className="feed-card">
              <p>{post.caption}</p>
              <span className="feed-meta">
                {post.author ?? "SBJ Kitchen"} · {timeAgo(post.createdAt)}
              </span>
            </div>
          </article>
        ))}
      </div>

      {viewing && (
        <div
          className="feed-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Picture"
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            className="feed-viewer-close"
            onClick={() => setViewing(null)}
            aria-label="Close"
          >
            <LuX aria-hidden="true" />
          </button>
          <img src={viewing.imageUrl} alt={viewing.caption} />
          <p>{viewing.caption}</p>
        </div>
      )}
    </div>
  );
}
